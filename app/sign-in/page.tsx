import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import SignInMethods from '@/components/SignInMethods';
import SiteNav from '@/components/SiteNav';
import { getAuthClient, getAuthSettings, hasAuthSessionCookie, safeAuthDestination } from '@/lib/auth';
import { signOut } from './actions';
import styles from './sign-in.module.css';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Enter the CONTINUUM 2027 gatehouse using Google or a one-time email code.',
  robots: { index: false, follow: false },
};

const errors: Record<string, string> = {
  google: 'Google sign-in didn’t finish. Try again or use a code by email.',
  origin: 'Open the festival’s official address before starting Google sign-in.',
  'sign-out': 'Sign-out didn’t finish. Please try again.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const query = await searchParams;
  const next = safeAuthDestination(query.next);
  const settings = getAuthSettings();
  const hasSession = settings && hasAuthSessionCookie((await cookies()).getAll());
  const client = hasSession ? await getAuthClient(settings, false) : null;
  const result = client ? await client.auth.getUser() : null;
  const user = result?.data.user;
  const message = typeof query.error === 'string' && Object.hasOwn(errors, query.error) ? errors[query.error] : null;

  return (
    <>
      <SiteNav />
      <main className={styles.page}>
        <div className={styles.scene} aria-hidden="true" />
        <div className={styles.layout}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>CONTINUUM 2027</p>
            <p className={styles.sceneTitle}>The Gatehouse</p>
            <p className={styles.sceneCopy}>The castle is yours to explore.</p>
          </div>
          <section className={styles.card} aria-labelledby="sign-in-title">
            <p className={styles.cardKicker}>Festival account</p>
            <h1 id="sign-in-title">{user ? 'Welcome back' : 'Sign in'}</h1>
            {message && <p className={styles.alert} role="alert">{message}</p>}
            {user ? (
              <>
                <p className={styles.signedIn}>Signed in as <strong>{user.email ?? 'a festival guest'}</strong>.</p>
                <Link className={styles.primary} href={next === '/sign-in' ? '/#arrival' : next}>Continue exploring</Link>
                <form action={signOut}>
                  <button className={styles.exit} type="submit">Sign out</button>
                </form>
              </>
            ) : (
              <>
                <p className={styles.cardCopy}>Use your Google account or get a one-time code by email.</p>
                {!settings && (
                  <p className={styles.alert} role="status">Sign-in is currently unavailable. You can still explore the castle and events.</p>
                )}
                <SignInMethods enabled={Boolean(settings)} next={next} />
                <Link className={styles.exit} href="/#arrival">Back to the castle</Link>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
