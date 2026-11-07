import type { Metadata } from 'next';
import Link from 'next/link';
import DestinationShell from '@/components/DestinationShell';
import { TeamGrid } from '@/components/NexsusDirectory';
import shellStyles from '@/components/DestinationShell.module.css';
import styles from '@/components/NexsusDirectory.module.css';
import { leadership, peopleSources, thirdYearTeam } from '@/lib/nexsus-people';

export const metadata: Metadata = {
  title: 'Team',
  description: 'Meet the Nexsus student leaders, project leads, and executive members behind CONTINUUM 2027 at MMMUT.',
};

export default function TeamPage() {
  return (
    <DestinationShell destination="team">
      <div className={shellStyles.section}>
        <p className={shellStyles.sectionLabel}>Nexsus at MMMUT</p>
        <h2>The people behind the festival</h2>
        <p className={shellStyles.intro}>Meet the student leaders, project leads, and executive members of Nexsus.</p>
        <nav className={styles.jumps} aria-label="Team sections">
          <a href="#leadership">Leadership</a>
          <a href="#student-team">Third-year team</a>
          <Link href="/about#coordinators-heading">Faculty coordinators</Link>
        </nav>
        <section className={styles.group} aria-labelledby="leadership">
          <h2 id="leadership">Student leadership</h2>
          <TeamGrid members={leadership.slice(0, 2)} featured />
          <TeamGrid members={leadership.slice(2)} />
        </section>
        <section className={styles.group} aria-labelledby="student-team">
          <h2 id="student-team">Third-year team</h2>
          <TeamGrid members={thirdYearTeam} />
        </section>
        <p className={styles.source}>The official Nexsus directory has yet to publish the second-year roster.</p>
        <p className={styles.source}><a href={peopleSources.team} target="_blank" rel="noreferrer">Nexsus team directory ↗</a></p>
      </div>
    </DestinationShell>
  );
}
