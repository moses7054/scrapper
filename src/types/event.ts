export interface Event {
  id: string;
  name: string;
  description: string;
  detailed_description?: {
    about: string;
    key_highlights: string[];
    agenda: {
      time: string;
      title: string;
      description: string;
    }[];
    speakers: {
      name: string;
      role: string;
      background: string;
    }[];
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
  side_events?: {
    name: string;
    description: string;
    type: "workshop" | "session" | "satellite";
    datetime: string;
    target_audience: string;
  }[];
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
  _raw?: {
    fullText: string;
    dateStrings: string[];
    locationStrings: string[];
    headings: string[];
    paragraphs: string[];
    links: { [key: string]: string };
    images: { src: string; alt?: string }[];
  };
}
