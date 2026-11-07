import Link from 'next/link';
import type { ReactNode } from 'react';
import SiteNav from '@/components/SiteNav';
import styles from './DestinationShell.module.css';

type Destination = 'sponsors' | 'about' | 'contact' | 'team';

const destinations = {
  sponsors: {
    waypoint: 'The Guild Hall',
    title: 'Sponsors',
    description: 'Help give the next generation of builders a place to try something new.',
    jump: 'Explore ways to partner',
  },
  about: {
    waypoint: 'The Founders’ Archive',
    title: 'About us',
    description: 'Meet Nexsus and the faculty behind CONTINUUM 2027.',
    jump: 'Read our story',
  },
  contact: {
    waypoint: 'The Dispatch Tower',
    title: 'Contact us',
    description: 'Find the right channel for event questions, partnerships or visiting MMMUT.',
    jump: 'Find your contact',
  },
  team: {
    waypoint: 'The Builders’ Gallery',
    title: 'Our team',
    description: 'Meet the Nexsus students building CONTINUUM 2027 at MMMUT.',
    jump: 'Meet the team',
  },
} satisfies Record<Destination, { waypoint: string; title: string; description: string; jump: string }>;

export default function DestinationShell({ destination, children }: { destination: Destination; children: ReactNode }) {
  const page = destinations[destination];
  const artwork = destination === 'team' ? 'about' : destination;

  return (
    <div className={styles.site} data-destination={destination}>
      <a className="skip-link" href="#destination-content">Skip to content</a>
      <SiteNav />
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="destination-title">
          <picture className={styles.scene}>
            <source media="(max-width: 680px)" srcSet={`/continuum/destinations/${artwork}-mobile.webp`} />
            <img src={`/continuum/destinations/${artwork}.webp`} alt="" width="1600" height="900" fetchPriority="high" />
          </picture>
          <div className={styles.heroInner}>
            <p className={styles.waypoint}><span aria-hidden="true" />{page.waypoint}</p>
            <h1 id="destination-title">{page.title}</h1>
            <p className={styles.heroDescription}>{page.description}</p>
            <a className={styles.jump} href="#destination-content">{page.jump}<span aria-hidden="true">↓</span></a>
          </div>
        </section>
        <div className={styles.content} id="destination-content" tabIndex={-1}>
          {children}
        </div>
      </main>
      <footer className={styles.footer}>
        <div>
          <p>CONTINUUM <span>2027</span></p>
          <p>January 2027 · MMMUT, Gorakhpur</p>
        </div>
        <Link href="/#arrival">Return to the castle <span aria-hidden="true">↗</span></Link>
      </footer>
    </div>
  );
}

