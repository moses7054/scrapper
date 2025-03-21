import { Event } from "@/types/event";
import axios from "axios";

// Rate limiting settings
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
const MAX_RETRIES = 3;
const TIMEOUT = 30000; // Increased to 30 seconds
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

async function fetchWithRetry(url: string, retries = 0): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: TIMEOUT,
    });
    return response.data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`Retry attempt ${retries + 1} for ${url}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * (retries + 1))); // Exponential backoff
      return fetchWithRetry(url, retries + 1);
    }
    throw error;
  }
}

export async function scrapeEvents(url: string): Promise<Event[]> {
  try {
    await rateLimit();

    // Use retry logic for fetching
    const html = await fetchWithRetry(url);
    console.log("Scraped HTML length:", html.length);

    return [
      {
        id: Math.random().toString(36).substr(2, 9),
        name: "",
        description: "",
        banner_image_link: null,
        startsAt: "",
        endsAt: "",
        address: "",
        city: "",
        country: "",
        type_of_event: "",
        tags: [],
        _raw: {
          fullText: html,
          dateStrings: [],
          locationStrings: [],
          headings: [],
          paragraphs: [],
          links: {},
          images: [],
        },
      },
    ];
  } catch (error) {
    console.error("Error scraping events:", error);
    throw new Error(
      `Failed to scrape events: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
