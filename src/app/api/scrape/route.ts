import { NextResponse } from "next/server";
import { scrapeEvents } from "@/lib/scraper";
import { processEventData } from "@/lib/openai";
import { writeEvents } from "@/lib/storage";
import { validateEvents } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const rawEvents = await scrapeEvents(url);
    const processedEvents = await Promise.all(
      rawEvents.map(async (event) => {
        if (!event._raw) return event;
        try {
          const processedData = await processEventData(event._raw);
          return { ...event, ...processedData, _raw: undefined };
        } catch (error) {
          console.error(`Failed to process event: ${event.id}`, error);
          return event;
        }
      })
    );

    const validEvents = validateEvents(processedEvents);
    await writeEvents(validEvents);

    return NextResponse.json({
      message: "Successfully scraped and processed events",
      events: validEvents,
    });
  } catch (error) {
    console.error("Error in scrape API:", error);
    return NextResponse.json(
      { error: "Failed to process scraping request" },
      { status: 500 }
    );
  }
}
