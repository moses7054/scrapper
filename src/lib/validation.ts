import { z } from "zod";

// Install zod first: npm install zod

// Basic schema to ensure required fields exist
const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  banner_image_link: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  address: z.string(),
  city: z.string(),
  country: z.string(),
  type_of_event: z.string(),
  tags: z.array(z.string()),
  twitter: z.string().nullable().optional(),
  discord: z.string().nullable().optional(),
  telegram: z.string().nullable().optional(),
});

export type ValidatedEvent = z.infer<typeof eventSchema>;

// Simple validation to ensure all required fields are present
export function validateEvent(event: unknown): ValidatedEvent {
  return eventSchema.parse(event);
}

export function validateEvents(events: unknown[]): ValidatedEvent[] {
  return events.filter((event) => {
    try {
      return eventSchema.parse(event) && true;
    } catch (error) {
      console.error("Invalid event data:", event, error);
      return false;
    }
  }) as ValidatedEvent[];
}
