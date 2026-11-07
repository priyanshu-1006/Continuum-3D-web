import Link from 'next/link';

export default function NotFound() {
  return <main className="not-found"><a className="wordmark" href="/">CONTINUUM<span>2027</span></a><p className="eyebrow">A little off the path</p><h1>This part of the world<br />is still undiscovered.</h1><p>The page you’re looking for isn’t here. There are five event worlds waiting for you.</p><Link className="button button-primary" href="/">Back to the world <span aria-hidden="true">↗</span></Link></main>;
}
