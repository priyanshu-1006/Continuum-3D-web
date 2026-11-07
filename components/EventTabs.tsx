"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { officialLinks, type Event } from "@/lib/events";

const tabs = ["Overview", "Format", "Rules", "Timeline", "Prizes"] as const;
type Tab = (typeof tabs)[number];

function TabContent({ tab, event }: { tab: Tab; event: Event }) {
  switch (tab) {
    case "Overview":
      return (
        <>
          <h2>Quest briefing</h2>
          <p>{event.description}</p>
          <ul className="event-world-highlights" aria-label="What to expect">
            {event.highlightLabels.map((label) => <li key={label}>{label}</li>)}
          </ul>
        </>
      );
    case "Format":
      return (
        <>
          <h2>{event.format}</h2>
          <p>{event.participationNote}</p>
        </>
      );
    case "Rules":
      return (
        <>
          <h2>Eligibility and rules</h2>
          <p>{event.eligibility}</p>
          <div className="event-rule-links">
            {event.rulebookUrl && (
              <a href={event.rulebookUrl} target="_blank" rel="noopener noreferrer">
                Open rulebook (PDF) <span aria-hidden="true">↗</span>
              </a>
            )}
            <a href={event.registrationUrl ?? officialLinks.instagram} target="_blank" rel="noopener noreferrer">
              {event.registrationUrl ? "Read the official listing" : "Follow organiser updates"} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </>
      );
    case "Timeline":
      return (
        <>
          <h2>{event.dateLabel}</h2>
          <p>{event.durationLabel} · {event.venue}</p>
          <p>{event.timelineNote ?? (event.registrationUrl ? "Check the official listing for current timings and deadlines." : "Follow organiser updates for the full schedule.")}</p>
        </>
      );
    case "Prizes":
      return (
        <>
          <h2>Prize details to be announced</h2>
          <p>Check the organiser’s updates for prize and recognition announcements.</p>
        </>
      );
  }
}

export default function EventTabs({ event }: { event: Event }) {
  const id = useId();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function navigateTabs(keyEvent: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (keyEvent.key) {
      case "ArrowLeft": nextIndex = (index - 1 + tabs.length) % tabs.length; break;
      case "ArrowRight": nextIndex = (index + 1) % tabs.length; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = tabs.length - 1; break;
      default: return;
    }
    keyEvent.preventDefault();
    setSelectedIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="event-world-tabs">
      <div className="event-world-tablist" role="tablist" aria-label="Event information">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            role="tab"
            ref={(button) => { tabRefs.current[index] = button; }}
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={index === selectedIndex}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => setSelectedIndex(index)}
            onKeyDown={(keyEvent) => navigateTabs(keyEvent, index)}
          >
            {tab}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <section
          key={tab}
          className="event-world-tabpanel"
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          tabIndex={0}
          hidden={index !== selectedIndex}
        >
          <TabContent tab={tab} event={event} />
        </section>
      ))}
    </div>
  );
}
