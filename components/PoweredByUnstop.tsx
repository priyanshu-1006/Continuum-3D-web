import { officialLinks } from '@/lib/events';

export default function PoweredByUnstop() {
  return (
    <a className="powered-by-unstop" href={officialLinks.festival} target="_blank" rel="noreferrer">
      <span>Powered by</span>
      <img src="/continuum/chrome/unstop-logo.svg" width="74" height="24" alt="Unstop" />
    </a>
  );
}
