import fs from "fs/promises";
import path from "path";
import { Event } from "@/types/event";

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

// Read events from JSON file
export async function readEvents(): Promise<Event[]> {
  try {
    const data = await fs.readFile(EVENTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    // If file doesn't exist or is empty, return empty array
    return [];
  }
}

// Write events to JSON file
export async function writeEvents(events: Event[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const existingEvents = await readEvents();

  // Simple deduplication based on event name and start date
  const newEvents = events.filter(
    (newEvent) =>
      !existingEvents.some(
        (existing) =>
          existing.name === newEvent.name &&
          existing.startsAt === newEvent.startsAt
      )
  );

  const updatedEvents = [...existingEvents, ...newEvents];
  await fs.writeFile(EVENTS_FILE, JSON.stringify(updatedEvents, null, 2));
}
