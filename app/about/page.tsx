import type { Metadata } from 'next';
import DestinationShell from '@/components/DestinationShell';
import { FestivalPaths } from '@/components/DestinationExplorers';
import { officialLinks } from '@/lib/events';
import styles from '@/components/DestinationShell.module.css';

export const metadata: Metadata = {
  title: 'About us',
  description: 'Meet the student team behind CONTINUUM 2027 and find the event that fits how you like to learn, build or compete.',
};

export default function AboutPage() {
  return (
    <DestinationShell destination="about">
      <section className={styles.section} aria-labelledby="archive-heading">
        <div className={styles.archiveIntro}>
          <div>
            <p className={styles.sectionLabel}>The festival</p>
            <h2 id="archive-heading">Built by students at MMMUT</h2>
            <p className={styles.intro}>NEXSUS started as a student-built campus platform at Madan Mohan Malaviya University of Technology. With CONTINUUM, the team is making room for students to learn new tools, put their ideas to the test, and meet others who want to build.</p>
          </div>
          <aside className={styles.archiveNote} aria-label="Festival information">
            <img src="/continuum/layers/official-emblem-mobile.webp" width="360" height="168" alt="" />
            <p>January 2027<br /><strong>MMMUT, Gorakhpur</strong></p>
            <a href={officialLinks.festival} target="_blank" rel="noreferrer">Festival on Unstop <span aria-hidden="true">↗</span></a>
          </aside>
        </div>
        <div className={styles.pathsHeading}>
          <p className={styles.sectionLabel}>Five events</p>
          <h2 id="paths-heading">Find your starting point</h2>
        </div>
        <FestivalPaths />
      </section>
    </DestinationShell>
  );
}

