import type { Metadata } from 'next';
import Link from 'next/link';
import DestinationShell from '@/components/DestinationShell';
import { FestivalPaths } from '@/components/DestinationExplorers';
import { FacultyDirectory } from '@/components/NexsusDirectory';
import { officialLinks } from '@/lib/events';
import { peopleSources } from '@/lib/nexsus-people';
import styles from '@/components/DestinationShell.module.css';
import directoryStyles from '@/components/NexsusDirectory.module.css';

export const metadata: Metadata = {
  title: 'About us',
  description: 'Meet Nexsus, the faculty guiding the student team, and the events that make up CONTINUUM 2027 at MMMUT.',
};

export default function AboutPage() {
  return (
    <DestinationShell destination="about">
      <section className={styles.section} aria-labelledby="archive-heading">
        <div className={styles.archiveIntro}>
          <div>
            <p className={styles.sectionLabel}>Nexsus at MMMUT</p>
            <h2 id="archive-heading">Built by students at MMMUT</h2>
            <p className={styles.intro}>Nexsus brings events, student societies, learning resources, and opportunities into one campus platform at Madan Mohan Malaviya University of Technology. CONTINUUM extends that work into a festival where students learn new tools, test ideas, and find people to build with.</p>
            <nav className={directoryStyles.jumps} aria-label="About Nexsus">
              <Link href="/team">Meet the student team</Link>
              <a href={peopleSources.about} target="_blank" rel="noreferrer">About Nexsus ↗</a>
            </nav>
          </div>
          <aside className={styles.archiveNote} aria-label="Festival information">
            <img src="/continuum/layers/official-emblem-mobile.webp" width="360" height="168" alt="" />
            <p>January 2027<br /><strong>MMMUT, Gorakhpur</strong></p>
            <a href={officialLinks.festival} target="_blank" rel="noreferrer">Festival on Unstop <span aria-hidden="true">↗</span></a>
          </aside>
        </div>
        <FacultyDirectory />
        <div className={styles.pathsHeading}>
          <p className={styles.sectionLabel}>Five events</p>
          <h2 id="paths-heading">Find your starting point</h2>
        </div>
        <FestivalPaths />
      </section>
    </DestinationShell>
  );
}

