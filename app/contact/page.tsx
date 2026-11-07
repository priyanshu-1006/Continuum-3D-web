import type { Metadata } from 'next';
import DestinationShell from '@/components/DestinationShell';
import { ContactDesk } from '@/components/DestinationExplorers';
import styles from '@/components/DestinationShell.module.css';

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Find Nexsus on Instagram or LinkedIn, get help with CONTINUUM 2027 events and partnerships, and find directions to MMMUT.',
};

export default function ContactPage() {
  return (
    <DestinationShell destination="contact">
      <section className={styles.section} aria-labelledby="dispatch-heading">
        <p className={styles.sectionLabel}>Nexsus contact desk</p>
        <h2 id="dispatch-heading">What can we help with?</h2>
        <p className={styles.intro}>Choose a topic to find the right place to ask your question or plan your visit.</p>
        <ContactDesk />
      </section>
    </DestinationShell>
  );
}

