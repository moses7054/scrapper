"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types/event";

export default function EventsDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState("");
  const [processing, setProcessing] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeUrl = (url: string): string => {
    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Split URLs by newline and filter empty lines
    const urlList = urls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url);

    if (urlList.length === 0) {
      setError("Please enter at least one URL");
      return;
    }

    // Process URLs one by one
    for (const url of urlList) {
      try {
        setProcessing((prev) => [...prev, url]);
        const normalizedUrl = normalizeUrl(url);

        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: normalizedUrl }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to scrape URL");
        }

        // Add URL to recent list
        setRecentUrls((prev) => [normalizedUrl, ...prev.slice(0, 4)]);

        // Refresh events list after each successful scrape
        await fetchEvents();
      } catch (err) {
        console.error(`Error processing ${url}:`, err);
        setError(
          `Failed to process ${url}: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      } finally {
        setProcessing((prev) => prev.filter((u) => u !== url));
      }
    }

    // Clear input after processing all URLs
    setUrls("");
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  // Add this helper component for detailed info
  function DetailedEventInfo({ event }: { event: Event }) {
    if (!event.detailed_description) return null;

    return (
      <div className="mt-4 space-y-4">
        <div>
          <h3 className="font-semibold">About</h3>
          <p className="text-sm">{event.detailed_description.about}</p>
        </div>

        {event.detailed_description.key_highlights.length > 0 && (
          <div>
            <h3 className="font-semibold">Key Highlights</h3>
            <ul className="list-disc list-inside text-sm">
              {event.detailed_description.key_highlights.map((highlight, i) => (
                <li key={i}>{highlight}</li>
              ))}
            </ul>
          </div>
        )}

        {event.detailed_description.agenda.length > 0 && (
          <div>
            <h3 className="font-semibold">Agenda</h3>
            <div className="space-y-2">
              {event.detailed_description.agenda.map((item, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-gray-500">
                    {new Date(item.time).toLocaleString()}
                  </p>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {event.detailed_description.speakers.length > 0 && (
          <div>
            <h3 className="font-semibold">Speakers</h3>
            <div className="grid grid-cols-2 gap-4">
              {event.detailed_description.speakers.map((speaker, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium">{speaker.name}</p>
                  <p className="text-gray-500">{speaker.role}</p>
                  <p>{speaker.background}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {event.social_links && (
          <div className="flex gap-4">
            {Object.entries(event.social_links).map(([platform, url]) => {
              if (!url) return null;
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600"
                >
                  {platform}
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function EventCard({ event }: { event: Event }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
        {/* Main Event Content */}
        <h2 className="text-xl font-bold mb-2">{event.name}</h2>
        <p className="text-gray-600 mb-4">{event.description}</p>

        {/* Basic Event Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">When</p>
            <p>{new Date(event.startsAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Where</p>
            <p>{`${event.city}, ${event.country}`}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {event.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-blue-500 hover:text-blue-600"
        >
          {isExpanded ? "Show Less" : "Show More Details"}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-6">
            {/* Detailed Description */}
            {event.detailed_description && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">About</h3>
                  <p className="text-gray-600">
                    {event.detailed_description.about}
                  </p>
                </div>

                {/* Key Highlights */}
                <div>
                  <h3 className="font-semibold">Key Highlights</h3>
                  <ul className="list-disc list-inside">
                    {event.detailed_description.key_highlights.map(
                      (highlight, i) => (
                        <li key={i} className="text-gray-600">
                          {highlight}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                {/* Speakers */}
                {event.detailed_description.speakers.length > 0 && (
                  <div>
                    <h3 className="font-semibold">Speakers</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {event.detailed_description.speakers.map((speaker, i) => (
                        <div key={i} className="p-2">
                          <p className="font-medium">{speaker.name}</p>
                          <p className="text-sm text-gray-600">
                            {speaker.role}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Side Events Section */}
            {event.side_events && event.side_events.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Side Events</h3>
                {event.side_events.map((sideEvent, index) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-4">
                    <h4 className="font-medium">{sideEvent.name}</h4>
                    <p className="text-sm text-gray-600">
                      {sideEvent.description}
                    </p>
                    <div className="text-sm text-gray-500 mt-1">
                      <p>Type: {sideEvent.type}</p>
                      <p>
                        When: {new Date(sideEvent.datetime).toLocaleString()}
                      </p>
                      <p>For: {sideEvent.target_audience}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Audience Analysis Section */}
            {event.audience_analysis && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Who Should Attend</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Ideal Attendees</h4>
                    <ul className="list-disc list-inside text-sm">
                      {event.audience_analysis.ideal_attendees.map(
                        (profile, i) => (
                          <li key={i}>{profile}</li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Industry Focus</h4>
                    <ul className="list-disc list-inside text-sm">
                      {event.audience_analysis.industry_focus.map(
                        (industry, i) => (
                          <li key={i}>{industry}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
                <p className="text-sm">
                  <span className="font-medium">Experience Level: </span>
                  {event.audience_analysis.experience_level}
                </p>
              </div>
            )}

            {/* Value Proposition Section */}
            {event.value_proposition && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Why Attend</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Learning Outcomes</h4>
                    <ul className="list-disc list-inside text-sm">
                      {event.value_proposition.learning_outcomes.map(
                        (outcome, i) => (
                          <li key={i}>{outcome}</li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Business Benefits</h4>
                    <ul className="list-disc list-inside text-sm">
                      {event.value_proposition.business_benefits.map(
                        (benefit, i) => (
                          <li key={i}>{benefit}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* URL Input Form */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="urls" className="block text-sm font-medium mb-2">
              Enter Website URLs to Scrape (one per line)
            </label>
            <div className="flex flex-col gap-2">
              <textarea
                id="urls"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://example1.com/events&#10;example2.com/events"
                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 min-h-[100px]"
                disabled={processing.length > 0}
              />
              <button
                type="submit"
                disabled={processing.length > 0 || !urls.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {processing.length > 0
                  ? `Processing ${processing.length} URLs...`
                  : "Scrape URLs"}
              </button>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          {/* Recent URLs */}
          {recentUrls.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">
                Recently Scraped URLs:
              </h3>
              <ul className="text-sm space-y-1">
                {recentUrls.map((recentUrl, index) => (
                  <li key={index} className="text-gray-600 dark:text-gray-400">
                    {recentUrl}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading events...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
