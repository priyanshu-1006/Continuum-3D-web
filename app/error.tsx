'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="not-found"><p className="eyebrow">Let’s find the path again</p><h1>A brief interruption.<br />The ideas can wait.</h1><p>Try loading this page again, or head back to the festival.</p><div className="button-row"><button className="button button-primary" onClick={reset}>Try again ↗</button><Link className="button button-outline" href="/?view=lite">Open Lite view</Link></div></main>;
}
