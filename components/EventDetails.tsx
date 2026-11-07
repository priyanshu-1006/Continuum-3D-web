import Link from "next/link";
import type { CSSProperties } from "react";
import { getAdjacentEvents, officialLinks, type Event } from "@/lib/events";

export function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {diagonal ? (
        <path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.6" />
      ) : (
        <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" />
      )}
    </svg>
  );
}

export default function EventDetails({ event }: { event: Event }) {
  const { next } = getAdjacentEvents(event.slug);
  const eventStyle = { "--event-accent": event.accent } as CSSProperties;

  return (
    <article className="event-detail event-detail--page" style={eventStyle}>
      <header className="event-page-header">
        <Link className="event-wordmark" href="/" aria-label="CONTINUUM 2027 home">
          CONTINUUM<span>2027</span>
        </Link>
        <Link className="event-back" href="/#events">
          <span aria-hidden="true">←</span> All experiences
        </Link>
      </header>

      <section className="event-hero" aria-labelledby={`event-title-${event.slug}`}>
        <div className="event-hero-copy">
          <div className="event-kicker">
            <span className="event-chapter">CHAPTER {event.chapter}</span>
            <span className="event-kicker-rule" />
            <span>{event.category}</span>
          </div>
          <p className="event-eyebrow">{event.eyebrow}</p>
          <h1 id={`event-title-${event.slug}`}>{event.title}</h1>
          <p className="event-tagline">{event.tagline}</p>
          <div className="event-hero-date">
            <span className="event-status-light" aria-hidden="true" />
            {event.dateLabel}
            <span className="event-date-divider" aria-hidden="true" />
            MMMUT, Gorakhpur
          </div>
          {event.registrationUrl ? (
            <a className="event-button event-button--primary" href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
              {event.registrationLabel}<ArrowIcon diagonal />
            </a>
          ) : (
            <div className="event-registration-pending">
              <span className="event-pending-label">{event.registrationLabel}</span>
              <a href={officialLinks.instagram} target="_blank" rel="noopener noreferrer">
                Follow official updates <ArrowIcon diagonal />
              </a>
            </div>
          )}
        </div>
        <div className="event-hero-art">
          <div className="event-art-frame">
            {/* Real poster artwork is kept intact; the original is available below. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="event-banner-image" src={event.poster} alt={`${event.title} Minecraft-inspired event artwork`} width="1600" height="900" fetchPriority="high" />
            <div className="event-art-shade" />
            <div className="event-art-label"><span>NEXSUS PRESENTS</span><span>CONTINUUM / 2027</span></div>
          </div>
          <div className="event-art-caption"><span>ENTER THE NEXT CHAPTER</span><span aria-hidden="true">↗</span></div>
        </div>
      </section>

      <dl className="event-facts" aria-label="Event at a glance">
        <div><dt>When</dt><dd>{event.dateLabel}</dd></div>
        <div><dt>The format</dt><dd>{event.format}</dd></div>
        <div><dt>Your team</dt><dd>{event.teamLabel}</dd></div>
        <div><dt>The place</dt><dd>{event.venue}</dd></div>
      </dl>

      <div className="event-content-grid">
        <section className="event-intro" aria-labelledby={`event-brief-${event.slug}`}>
          <p className="event-section-label">THE BRIEF</p>
          <h2 id={`event-brief-${event.slug}`}>A new world.<br /><em>Your next move.</em></h2>
          <p className="event-description">{event.description}</p>
        </section>
        <section className="event-expect" aria-labelledby={`event-expect-${event.slug}`}>
          <p className="event-section-label" id={`event-expect-${event.slug}`}>WHAT TO EXPECT</p>
          <ol className="event-highlights">
            {event.highlights.map((highlight, index) => (
              <li key={highlight}>
                <span className="event-highlight-number">0{index + 1}</span>
                <div><h3>{event.highlightLabels[index]}</h3><p>{highlight}</p></div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="event-participation" aria-labelledby={`event-join-${event.slug}`}>
        <div>
          <p className="event-section-label">TAKE YOUR PLACE</p>
          <h2 id={`event-join-${event.slug}`}>The next step<br />starts with you.</h2>
        </div>
        <div className="event-participation-copy">
          <p>{event.participationNote}</p>
          <div className="event-eligibility"><span>Eligibility &amp; format</span><p>{event.eligibility}</p></div>
          <div className="event-rule-links">
            {event.registrationUrl ? (
              <a className="event-button event-button--primary" href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
                {event.registrationLabel}<ArrowIcon diagonal />
              </a>
            ) : (
              <a className="event-button event-button--outline" href={officialLinks.instagram} target="_blank" rel="noopener noreferrer">
                Get updates on Instagram<ArrowIcon diagonal />
              </a>
            )}
            {event.rulebookUrl && (
              <a className="event-button event-button--outline" href={event.rulebookUrl} target="_blank" rel="noopener noreferrer">
                Open rulebook (PDF)<ArrowIcon diagonal />
              </a>
            )}
          </div>
          <p className="event-details-note">Follow the official listing and organiser updates for the latest timings and participation details.</p>
        </div>
      </section>

      <details className="event-original">
        <summary>
          <span><span className="event-section-label">FROM THE ORGANISERS</span><strong>View the original event poster</strong></span>
          <span className="event-expand-icon" aria-hidden="true">+</span>
        </summary>
        <div className="event-original-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.originalPoster} alt={`Original ${event.title} event poster from Nexsus, MMMUT`} width="1200" height="1500" loading="lazy" />
          <div className="event-original-actions">
            <a href={event.originalPoster} target="_blank" rel="noopener noreferrer">Open full-size poster <ArrowIcon diagonal /></a>
            <a href={event.originalPoster} download={`${event.slug}-original-poster.webp`}>Download poster <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </details>

      <footer className="event-detail-footer">
        <div><p className="event-section-label">THE WORLD KEEPS EXPANDING</p><span>Discover another side of CONTINUUM.</span></div>
        <a className="event-next" href={`/events/${next.slug}`}>
          <span><small>NEXT CHAPTER / {next.chapter}</small>{next.title}</span><ArrowIcon />
        </a>
      </footer>
      <div className="event-official-links">
        <span>A Nexsus experience at MMMUT, Gorakhpur.</span>
        <a href={officialLinks.festival} target="_blank" rel="noopener noreferrer">Festival on Unstop ↗</a>
        <a href={officialLinks.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a>
        <a href={officialLinks.university} target="_blank" rel="noopener noreferrer">Nexsus platform ↗</a>
      </div>
    </article>
  );
}
