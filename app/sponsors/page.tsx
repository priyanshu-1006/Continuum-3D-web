import type { Metadata } from 'next';
import DestinationShell from '@/components/DestinationShell';
import { GuildExhibits } from '@/components/DestinationExplorers';
import PoweredByUnstop from '@/components/PoweredByUnstop';
import styles from '@/components/DestinationShell.module.css';

export const metadata: Metadata = {
  title: 'Sponsors',
  description: 'Explore ways to partner with Nexsus and support CONTINUUM 2027 at MMMUT, Gorakhpur.',
};

export default function SponsorsPage() {
  return (
    <DestinationShell destination="sponsors">
      <section className={styles.section} aria-labelledby="guild-heading">
        <p className={styles.sectionLabel}>Partnerships</p>
        <h2 id="guild-heading">Choose what you’d help build</h2>
        <p className={styles.intro}>Explore three ways to support the festival, from equipping student teams to helping their work reach a wider audience.</p>
        <GuildExhibits />
        <p className={styles.hallNote}>The CONTINUUM 2027 sponsor lineup will be shared once confirmed.</p>
        <div className="sponsors-partner"><PoweredByUnstop /></div>
      </section>
    </DestinationShell>
  );
}

