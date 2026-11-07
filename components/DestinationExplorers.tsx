'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { events, officialLinks, type EventId } from '@/lib/events';
import styles from './DestinationShell.module.css';

const guildExhibits = [
  {
    key: 'equipment',
    title: 'Equip the builders',
    type: 'Tools & resources',
    description: 'Help teams get from an idea to a working build. Tell us about software access, hardware, or other resources your team could share.',
  },
  {
    key: 'mentorship',
    title: 'Share your craft',
    type: 'Mentors & expertise',
    description: 'Give teams someone to learn from. If your team can run a session, review a pitch, or offer hands-on guidance, tell us what you’d bring.',
  },
  {
    key: 'showcase',
    title: 'Back the showcase',
    type: 'Event support',
    description: 'Help students get their work in front of more people. Start a conversation about supporting a competition, the showcase, or festival logistics.',
  },
] as const;

export function GuildExhibits() {
  const [selected, setSelected] = useState(0);
  const exhibit = guildExhibits[selected];

  return (
    <div className={styles.guild}>
      <div className={styles.guildChoices} role="group" aria-label="Ways to partner">
        {guildExhibits.map((option, index) => (
          <button type="button" key={option.key} aria-pressed={selected === index} aria-controls="guild-exhibit" onClick={() => setSelected(index)}>
            <span className={styles.choiceNumber} aria-hidden="true">0{index + 1}</span>
            <span>{option.title}<small>{option.type}</small></span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      <div id="guild-exhibit" className={styles.guildPanel} data-exhibit={exhibit.key}>
        <div className={styles.guildGem} aria-hidden="true"><i /><i /><i /></div>
        <div aria-live="polite" aria-atomic="true">
          <p className={styles.sectionLabel}>{exhibit.type}</p>
          <h3>{exhibit.title}</h3>
          <p>{exhibit.description}</p>
        </div>
        <Link className={styles.primaryAction} href="/contact#partnerships">Discuss a partnership <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  );
}

const paths = [
  { label: 'Learn', slug: 'neural-nexsus' },
  { label: 'Prompt', slug: 'promptx' },
  { label: 'Pitch', slug: 'nexathon' },
  { label: 'Build', slug: 'redstone-rush' },
  { label: 'Compete', slug: 'battleforge' },
] satisfies { label: string; slug: EventId }[];

const pathEvents = paths.map(path => ({
  ...path,
  event: events.find(event => event.slug === path.slug)!,
}));

export function FestivalPaths() {
  const [selected, setSelected] = useState(0);
  const { label, event } = pathEvents[selected];

  return (
    <div className={styles.festivalPaths} aria-labelledby="paths-heading">
      <div className={styles.pathChoices} role="group" aria-label="Festival paths">
        {pathEvents.map((path, index) => (
          <button type="button" key={path.slug} aria-pressed={selected === index} aria-controls="festival-path" onClick={() => setSelected(index)}>
            <span aria-hidden="true">0{index + 1}</span>
            {path.label}
          </button>
        ))}
      </div>
      <div className={styles.pathPanel} id="festival-path">
        <div className={styles.pathPicture}>
          <img key={event.slug} src={event.poster} alt="" width="1600" height="900" loading="lazy" />
        </div>
        <div className={styles.pathText}>
          <div aria-live="polite" aria-atomic="true">
            <p className={styles.sectionLabel}>{label} · {event.category}</p>
            <h3>{event.title}</h3>
            <p>{event.shortDescription}</p>
          </div>
          <a href={'/events/' + event.slug} className={styles.primaryAction}>
            Explore {event.title} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}

type Topic = 'events' | 'partnerships' | 'visit';

const topics: { value: Topic; label: string }[] = [
  { value: 'events', label: 'Event questions' },
  { value: 'partnerships', label: 'Partnerships' },
  { value: 'visit', label: 'Visit MMMUT' },
];

const nexsusLinkedIn = 'https://www.linkedin.com/company/mmmut-nexsus/';
const directions = 'https://www.google.com/maps/search/?api=1&query=Madan+Mohan+Malaviya+University+of+Technology%2C+Gorakhpur';
const campusListing = 'https://gorakhpur.nic.in/public-utility/mmm-university-of-technology/';

const publishedResources = events.filter(event => event.rulebookUrl && event.registrationUrl);

export function ContactDesk() {
  const [topic, setTopic] = useState<Topic>('events');

  useEffect(() => {
    const syncTopic = () => {
      const fromHash = window.location.hash.slice(1);
      if (fromHash === 'partnerships' || fromHash === 'visit' || fromHash === 'events') setTopic(fromHash);
    };
    syncTopic();
    window.addEventListener('hashchange', syncTopic);
    return () => window.removeEventListener('hashchange', syncTopic);
  }, []);

  return (
    <div className={styles.contactDesk} id="partnerships">
      <div className={styles.contactTopics} role="group" aria-label="Contact topic">
        {topics.map(({ value, label }, index) => (
          <button type="button" key={value} aria-pressed={topic === value} aria-controls="dispatch-panel" onClick={() => setTopic(value)}>
            <span aria-hidden="true">0{index + 1}</span>{label}
          </button>
        ))}
      </div>
      <div className={styles.dispatchPanel} id="dispatch-panel">
        {topic === 'events' && (
          <>
            <div aria-live="polite" aria-atomic="true">
              <p className={styles.sectionLabel}>For participants</p>
              <h3>Questions about an event?</h3>
              <p>Check Unstop for registration and updates. For anything you’re still unsure about, message NEXSUS with the event name and your question.</p>
            </div>
            <div className={styles.actions}>
              <a className={styles.primaryAction} href={officialLinks.festival} target="_blank" rel="noreferrer">Festival on Unstop <span aria-hidden="true">↗</span></a>
              <a className={styles.secondaryAction} href={officialLinks.instagram} target="_blank" rel="noreferrer">NEXSUS on Instagram <span aria-hidden="true">↗</span></a>
            </div>
          </>
        )}
        {topic === 'partnerships' && (
          <>
            <div aria-live="polite" aria-atomic="true">
              <p className={styles.sectionLabel}>For prospective partners</p>
              <h3>Start a conversation with NEXSUS</h3>
              <p>Include your organisation’s name and what you’d like to contribute. You can also tell us which event you’re interested in supporting.</p>
            </div>
            <div className={styles.actions}>
              <a className={styles.primaryAction} href={nexsusLinkedIn} target="_blank" rel="noreferrer">NEXSUS on LinkedIn <span aria-hidden="true">↗</span></a>
              <a className={styles.secondaryAction} href={officialLinks.instagram} target="_blank" rel="noreferrer">NEXSUS on Instagram <span aria-hidden="true">↗</span></a>
            </div>
          </>
        )}
        {topic === 'visit' && (
          <>
            <div aria-live="polite" aria-atomic="true">
              <p className={styles.sectionLabel}>Campus directions</p>
              <h3>Madan Mohan Malaviya University of Technology</h3>
              <address>Deoria Road, Gorakhpur<br />Uttar Pradesh 273010</address>
            </div>
            <div className={styles.actions}>
              <a className={styles.primaryAction} href={directions} target="_blank" rel="noreferrer">Open in Maps <span aria-hidden="true">↗</span></a>
              <a className={styles.secondaryAction} href={campusListing} target="_blank" rel="noreferrer">Campus directory <span aria-hidden="true">↗</span></a>
            </div>
          </>
        )}
      </div>
      {topic === 'events' && (
        <section className={styles.resources} aria-labelledby="resources-heading">
          <h3 id="resources-heading">Official event resources</h3>
          <ul>
            {publishedResources.map(event => (
              <li key={event.slug}>
                <strong>{event.title}</strong>
                <div>
                  <a href={event.registrationUrl!} target="_blank" rel="noreferrer" aria-label={event.title + ' on Unstop'}>Unstop <span aria-hidden="true">↗</span></a>
                  <a href={event.rulebookUrl!} target="_blank" rel="noreferrer" aria-label={event.title + ' rulebook (PDF)'}>Rulebook (PDF) <span aria-hidden="true">↗</span></a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

