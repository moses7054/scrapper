import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting settings - 5000 RPM means we can make a request every 12ms
const RATE_LIMIT_DELAY = 12;
const BATCH_SIZE = 15000;
const MAX_SINGLE_REQUEST = 50000;
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
}

function splitIntoChunks(text: string, size: number): string[] {
  if (text.length <= MAX_SINGLE_REQUEST) {
    return [text];
  }
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

interface SideEvent {
  name: string;
  description: string;
  type: "workshop" | "session" | "satellite" | "competition";
  datetime: string;
  target_audience: string;
}

interface EventData {
  name: string;
  description: string;
  detailed_description?: {
    about: string;
    key_highlights: string[];
    agenda: Array<{
      time: string;
      title: string;
      description: string;
    }>;
    speakers: Array<{
      name: string;
      role: string;
      background: string;
    }>;
    target_audience: string[];
    benefits: string[];
    networking: string[];
    exhibitors_sponsors: string[];
  };
  banner_image_link: string | null;
  startsAt: string;
  endsAt: string;
  address: string;
  city: string;
  country: string;
  type_of_event: string;
  tags: string[];
  social_links?: {
    twitter: string | null;
    instagram: string | null;
    telegram: string | null;
    discord: string | null;
    linkedin: string | null;
  };
  side_events?: SideEvent[];
  audience_analysis?: {
    ideal_attendees: string[];
    experience_level: string;
    industry_focus: string[];
  };
  value_proposition?: {
    learning_outcomes: string[];
    networking_benefits: string[];
    business_benefits: string[];
    unique_features: string[];
  };
}

export async function processEventData(rawData: {
  fullText: string;
}): Promise<EventData> {
  if (!rawData?.fullText) throw new Error("No content provided");

  try {
    const chunks = splitIntoChunks(rawData.fullText, BATCH_SIZE);
    console.log(`Processing content in ${chunks.length} batches`);

    let conversation: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an expert at extracting event information from web content. 
        You will receive content in multiple parts. For each part:
        1. Read and store the information internally
        2. Respond only with: "Processed batch X/Y, continuing analysis..."
        3. On the final batch, generate a complete JSON response
        
        Keep responses concise:
        - Include only essential information
        - Limit lists to top 10 items
        - For exhibitors, include only company names
        - Omit any null or empty values`,
      },
    ];

    // Process each batch sequentially
    for (let i = 0; i < chunks.length; i++) {
      const isLastBatch = i === chunks.length - 1;

      // Add the current batch to conversation
      conversation.push({
        role: "user",
        content: isLastBatch
          ? `FINAL BATCH ${i + 1}/${
              chunks.length
            }. After analyzing this content, generate a complete JSON response with all event information:

            ${chunks[i]}

            Return a clean, minimal JSON with this structure:
            {
              "name": "Event name",
              "description": "Brief description (max 150 chars)",
              "banner_image_link": "Main image URL or null",
              "startsAt": "ISO datetime",
              "endsAt": "ISO datetime",
              "address": "String",
              "city": "String",
              "country": "String",
              "type_of_event": "String",
              "tags": ["Max 5 tags"],
              "detailed_description": {
                "about": "Main description (max 500 chars)",
                "key_highlights": ["Top 5 unique aspects"],
                "agenda": [{"time": "ISO datetime", "title": "String", "description": "String"}],
                "speakers": [{"name": "String", "role": "String", "background": "String"}],
                "target_audience": ["Top 5 audience types"],
                "benefits": ["Top 5 benefits"],
                "networking": ["Top 3 opportunities"],
                "exhibitors_sponsors": ["Company names only, max 20"]
              },
              "social_links": {
                "twitter": "URL or null",
                "instagram": "URL or null",
                "telegram": "URL or null",
                "discord": "URL or null",
                "linkedin": "URL or null"
              }
            }`
          : `Analyzing batch ${i + 1}/${chunks.length}:
            ${chunks[i]}`,
      });

      await rateLimit();
      console.log(`🔄 Processing batch ${i + 1}/${chunks.length}`);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: conversation,
        response_format: isLastBatch ? { type: "json_object" } : undefined,
        temperature: 0.3,
        max_tokens: isLastBatch ? 4000 : 100,
      });

      const result = response.choices[0].message;
      if (!result?.content) throw new Error("No content in OpenAI response");

      // Add assistant's response to conversation history
      conversation.push(result);
      console.log(`✅ Batch ${i + 1}/${chunks.length} processed`);

      if (isLastBatch) {
        try {
          const finalResult = JSON.parse(result.content);

          // Add second stage enrichment
          conversation.push({
            role: "user",
            content: `Based on all the content you've analyzed, provide additional details about this event:
              1. Side Events: Extract all workshops, parallel sessions, satellite events with their details
              2. Audience Analysis: Who should attend and why (be specific)
              3. Value Proposition: Key benefits and unique features

              Return as JSON in this format:
              {
                "side_events": [{
                  "name": "String",
                  "description": "String",
                  "type": "workshop|session|satellite",
                  "datetime": "ISO datetime",
                  "target_audience": "String"
                }],
                "audience_analysis": {
                  "ideal_attendees": ["Detailed profile descriptions"],
                  "experience_level": "String",
                  "industry_focus": ["Array of industries"]
                },
                "value_proposition": {
                  "learning_outcomes": ["Array of outcomes"],
                  "networking_benefits": ["Array of benefits"],
                  "business_benefits": ["Array of benefits"],
                  "unique_features": ["Array of features"]
                }
              }`,
          });

          const enrichmentResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: conversation,
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 4000,
          });

          const enrichmentData = JSON.parse(
            enrichmentResponse.choices[0].message.content
          );

          return {
            ...finalResult,
            side_events: enrichmentData.side_events,
            audience_analysis: enrichmentData.audience_analysis,
            value_proposition: enrichmentData.value_proposition,
          };
        } catch (error) {
          console.error("Invalid JSON in final response:", result.content);
          throw new Error("Failed to parse final response");
        }
      }
    }

    throw new Error("No final response generated");
  } catch (error) {
    console.error("Error processing event with OpenAI:", error);
    throw new Error("Failed to process event data");
  }
}

// On the last batch, GPT should return JSON in this format:
const finalPrompt = `
Now generate the complete event information as a JSON object with:
{
  "name": "Event name",
  "description": "Brief description (max 200 chars)",
  "detailed_description": {
    "about": "Comprehensive description",
    "key_highlights": ["Array of unique aspects"],
    "agenda": [{
      "time": "ISO datetime",
      "title": "String",
      "description": "String"
    }],
    "speakers": [{
      "name": "String",
      "role": "String",
      "background": "String"
    }],
    "target_audience": ["Array of profiles"],
    "benefits": ["Array of benefits"],
    "networking": ["Array of opportunities"],
    "exhibitors_sponsors": ["Company names only"]
  },
  "banner_image_link": "URL or null",
  "startsAt": "ISO datetime",
  "endsAt": "ISO datetime",
  "address": "String",
  "city": "String",
  "country": "String",
  "type_of_event": "String",
  "tags": ["Array of tags"],
  "social_links": {
    "twitter": "URL or null",
    "instagram": "URL or null",
    "telegram": "URL or null",
    "discord": "URL or null",
    "linkedin": "URL or null"
  },
  "side_events": [{
    "name": "Side event name",
    "description": "Brief description",
    "detailed_description": {
      "about": "Main description (max 500 chars)",
      "key_highlights": ["Top 5 unique aspects"],
      "agenda": [{"time": "ISO datetime", "title": "String"}],
      "speakers": [{"name": "String", "role": "String"}],
      "target_audience": ["Top 5 audience types"],
      "benefits": ["Top 5 benefits"],
      "networking": ["Top 3 opportunities"],
      "exhibitors_sponsors": ["Company names only, max 20"]
    },
    "banner_image_link": "Main image URL or null",
    "startsAt": "ISO datetime",
    "endsAt": "ISO datetime",
    "address": "String",
    "city": "String",
    "country": "String",
    "type_of_event": "String",
    "tags": ["Max 5 tags"],
    "social_links": {
      "twitter": "URL or null",
      "linkedin": "URL or null"
    }
  }]
}`;
