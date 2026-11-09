'use client';

import { Component, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CastleMap, { mapCoordinates } from './CastleMap';
import HeroEnvironment from './HeroEnvironment';
import PoweredByUnstop from './PoweredByUnstop';
import SiteNav from './SiteNav';
import { events, officialLinks } from '@/lib/events';
import { getRouteSample, HERO_SCENERY_END, resolveRouteProgress, type JourneyProgress } from '@/lib/journey';

const CastleWorld = dynamic(() => import('./CastleWorld'), { ssr: false });
const WALK_FRACTION = 0.82;
const READ_TIME = 1250;
const GALLERY = events.length + 1;
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

class WorldBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    console.error('Cinematic world initialization failed', error);
    this.props.onError();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function JourneyHome() {
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [worldStarted, setWorldStarted] = useState(false);
  const [worldReady, setWorldReady] = useState(false);
  const [worldFailed, setWorldFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const startedRef = useRef(false);
  const [progressSignal] = useState(() => new EventTarget());
  const progressRef = useRef<JourneyProgress>({ index: 0, previous: 0, blend: 1, jump: true, introProgress: 0 });
  const paused = pathname.startsWith('/events/');
  const preparingTour = playing && !worldReady && !worldFailed;

  const startWorld = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setWorldStarted(true);
  }, []);
  const stopTour = useCallback(() => setPlaying(false), []);

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 800px)');
    setQuality(narrow.matches ? 'low' : 'high');
    setHydrated(true);
    const onWidth = () => setQuality(narrow.matches ? 'low' : 'high');
    narrow.addEventListener('change', onWidth);
    return () => narrow.removeEventListener('change', onWidth);
  }, []);

  useEffect(() => {
    if (!hydrated || !rootRef.current) return;
    const root = rootRef.current;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-journey-stage]'));
    let offsets: { top: number; height: number }[] = [];
    let frame = 0;
    let lastY = Number.NaN;
    let lastHeight = 0;
    const measure = () => {
      offsets = nodes.map(node => ({ top: node.getBoundingClientRect().top + window.scrollY, height: node.offsetHeight }));
      lastY = Number.NaN;
    };
    const update = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const height = window.innerHeight;
      if (scrollY === lastY && height === lastHeight) return;
      lastY = scrollY;
      lastHeight = height;
      const y = scrollY + height * 0.16;
      let index = 0;
      for (let i = 1; i < offsets.length; i++) {
        if (y >= offsets[i].top) index = i;
      }
      const local = Math.max(0, (y - offsets[index].top) / offsets[index].height);
      const walk = Math.min(1, local / WALK_FRACTION);
      const introStart = height * 0.04;
      const introLength = Math.max(1, offsets[1].top - height * 0.16 - introStart);
      const intro = index > 0 ? 1 : Math.max(0, Math.min(1, (scrollY - introStart) / introLength));
      if (index < GALLERY && scrollY > height * .02) startWorld();
      const progress = progressRef.current;
      const travel = index === 0 || index === GALLERY ? 1 : walk * walk * (3 - 2 * walk);
      const changed = progress.index !== index || progress.blend !== travel || progress.introProgress !== intro;
      progress.index = index;
      progress.previous = Math.max(0, index - 1);
      progress.blend = travel;
      progress.introProgress = intro;
      if (changed) progressSignal.dispatchEvent(new Event('change'));
      root.dataset.traveling = String(index > 0 && index < GALLERY && walk < 0.97);
      root.dataset.arrivalLoading = String(intro >= .14 && index < GALLERY);
      root.style.setProperty('--hero-fade', String(worldFailed ? 1 : Math.max(0, 1 - intro * 3)));
      const sceneryIntro = worldReady && !worldFailed ? intro : 0;
      const blend = Math.max(0, Math.min(1, (sceneryIntro - .10) / .36));
      const foregroundFade = Math.max(0, Math.min(1, (sceneryIntro - 0.42) / 0.36));
      root.style.setProperty('--hero-intro', String(sceneryIntro));
      root.style.setProperty('--hero-world-opacity', String(blend * blend * (3 - 2 * blend)));
      root.style.setProperty('--hero-world-brightness', String(1 + Math.max(0, 1 - sceneryIntro / HERO_SCENERY_END) * .8));
      root.style.setProperty('--hero-foreground-opacity', String(1 - foregroundFade ** 2 * (3 - 2 * foregroundFade)));
      root.dataset.heroWorld = sceneryIntro >= HERO_SCENERY_END ? 'entered' : 'opening';
      const sample = getRouteSample(resolveRouteProgress(progress));
      const [x, z] = mapCoordinates(sample.position);
      root.style.setProperty('--map-x', x + '%');
      root.style.setProperty('--map-y', z + '%');
      root.style.setProperty('--map-turn', Math.atan2(-sample.tangent[0], sample.tangent[2]) + 'rad');
      if (index !== activeRef.current) {
        activeRef.current = index;
        setActive(index);
      }
    };
    const queueUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
    const refresh = () => { measure(); queueUpdate(); };
    measure();
    update();
    const resize = new ResizeObserver(refresh);
    nodes.forEach(node => resize.observe(node));
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', refresh);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', refresh);
    };
  }, [hydrated, progressSignal, startWorld, worldReady, worldFailed]);

  const getStop = useCallback((index: number, usePosterFallback = worldFailed) => {
    const node = rootRef.current?.querySelectorAll<HTMLElement>('[data-journey-stage]')[index];
    if (!node) return null;
    const destination = node.getBoundingClientRect().top + scrollY;
    const atBanner = index > 0 && index < GALLERY;
    let offset = 0;
    if (atBanner) offset = usePosterFallback ? -78 : node.offsetHeight * WALK_FRACTION - innerHeight * .16 + 1;
    return { top: Math.max(0, destination + offset), id: node.id };
  }, [worldFailed]);

  const goTo = useCallback((index: number, usePosterFallback = worldFailed) => {
    stopTour();
    const stop = getStop(index, usePosterFallback);
    if (!stop) return;
    progressRef.current = { index, previous: index, blend: 1, jump: true, introProgress: index === 0 ? 0 : 1 };
    if (index > 0 && index < GALLERY && !usePosterFallback) startWorld();
    window.scrollTo({ top: stop.top, behavior: 'instant' });
    history.replaceState(history.state, '', '#' + stop.id);
    activeRef.current = index;
    setActive(index);
    progressSignal.dispatchEvent(new Event('change'));
  }, [getStop, progressSignal, startWorld, stopTour, worldFailed]);

  useEffect(() => {
    if (!playing) return;
    const pauseOnKey = (event: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(event.key)) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, select, textarea, [contenteditable]')) return;
      if (event.key === ' ' && target?.closest('button, a')) return;
      stopTour();
    };
    const pauseIfHidden = () => { if (document.hidden) stopTour(); };
    window.addEventListener('wheel', stopTour, { passive: true });
    window.addEventListener('touchmove', stopTour, { passive: true });
    window.addEventListener('keydown', pauseOnKey);
    document.addEventListener('visibilitychange', pauseIfHidden);
    return () => {
      window.removeEventListener('wheel', stopTour);
      window.removeEventListener('touchmove', stopTour);
      window.removeEventListener('keydown', pauseOnKey);
      document.removeEventListener('visibilitychange', pauseIfHidden);
    };
  }, [playing, stopTour]);

  useEffect(() => {
    if (paused) stopTour();
    if (!playing || paused || (!worldReady && !worldFailed)) return;
    let frame = 0;
    let timer = 0;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    function move(index: number) {
      const stop = getStop(index);
      if (!stop || index > GALLERY) { stopTour(); return; }
      const from = scrollY;
      const distance = stop.top - from;
      const duration = reducedMotion.matches || distance < 4 ? 0 : Math.min(2750, Math.max(750, distance / innerHeight * 1475));
      const started = performance.now();
      const step = (now: number) => {
        const t = duration ? Math.min(1, (now - started) / duration) : 1;
        const eased = t * t * (3 - 2 * t);
        if (!duration && distance >= 4) progressRef.current.jump = true;
        window.scrollTo({ top: from + distance * eased, behavior: 'instant' });
        if (t < 1) { frame = requestAnimationFrame(step); return; }
        if (index === GALLERY) { stopTour(); return; }
        timer = window.setTimeout(() => move(index + 1), READ_TIME);
      };
      frame = requestAnimationFrame(step);
    }

    const current = Math.max(1, activeRef.current);
    const stop = getStop(current);
    if (stop && scrollY > stop.top + 4) move(current + 1);
    else move(current);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [getStop, paused, playing, stopTour, worldFailed, worldReady]);

  const handleWorldError = useCallback(() => {
    const chapter = activeRef.current;
    setWorldFailed(true);
    setWorldReady(false);
    if (chapter > 0) requestAnimationFrame(() => requestAnimationFrame(() => goTo(chapter, true)));
  }, [goTo]);

  const onReady = useCallback(() => setWorldReady(true), []);
  const openEvent = useCallback((slug: string) => {
    stopTour();
    router.push('/events/' + slug, { scroll: false });
  }, [router, stopTour]);

  useEffect(() => {
    const openNearbyBanner = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key.toLowerCase() !== 'e' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || paused || !worldReady) return;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (active < 1 || active >= GALLERY || rootRef.current?.dataset.traveling !== 'false') return;
      event.preventDefault();
      openEvent(events[active - 1].slug);
    };
    window.addEventListener('keydown', openNearbyBanner);
    return () => window.removeEventListener('keydown', openNearbyBanner);
  }, [active, worldReady, openEvent, paused]);

  return (
    <div ref={rootRef} className={'journey' + (worldFailed ? ' world-unavailable' : worldReady ? ' world-ready' : worldStarted ? ' world-loading' : '')} data-active-stage={active}>
      <a className="skip-link" href="#events" onClick={event => { event.preventDefault(); goTo(6); rootRef.current?.querySelector<HTMLElement>('#events')?.focus({ preventScroll: true }); }}>Skip to all events</a>
      <SiteNav journey={{ active, navigate: goTo }} />

      <div className="world-surface" aria-hidden="true">
        <HeroEnvironment motion={hydrated && active === 0 && !paused}>
          <picture className="castle-opening">
            <source media="(max-width: 767px)" srcSet="/continuum/layers/castle-opening-mobile.webp" />
            <img src="/continuum/layers/castle-opening.webp" alt="" width="1500" height="844" fetchPriority="high" />
          </picture>
          {worldStarted && !worldFailed && (
            <WorldBoundary onError={handleWorldError}>
              <CastleWorld progressRef={progressRef} progressSignal={progressSignal} quality={quality} paused={paused || active === GALLERY} onReady={onReady} onError={handleWorldError} onSelectEvent={openEvent} />
            </WorldBoundary>
          )}
        </HeroEnvironment>
        <div className="scene-vignette" />
      </div>

      {hydrated && !worldFailed && active < GALLERY && <CastleMap active={active} onNavigate={goTo} />}
      {active < GALLERY && (
        <div className="tour-controls" role="group" aria-label="Castle tour controls">
          <p className="tour-location">
            <span>{preparingTour ? 'Loading castle' : active ? `${active} / ${events.length}` : 'Guided tour'}</span>
            {active ? events[active - 1].title : 'Castle entrance'}
          </p>
          <div className="tour-actions">
            <button type="button" className="tour-step" disabled={active === 0} aria-label="Previous stop" onClick={() => goTo(active - 1)}>←</button>
            <button type="button" className="tour-play" onClick={() => {
              if (playing) { stopTour(); return; }
              startWorld();
              setPlaying(true);
            }}>{playing ? 'Pause tour' : 'Play tour'}</button>
            <button type="button" className="tour-step" aria-label="Next stop" onClick={() => goTo(active + 1)}>→</button>
            <Link className="tour-explore" href="/campus" prefetch={false} onClick={stopTour}>Explore campus <span aria-hidden="true">↗</span></Link>
          </div>
          <span className="visually-hidden" role="status">{preparingTour ? 'Preparing the castle tour' : playing ? 'Tour playing' : ''}</span>
        </div>
      )}

      <main>
        <div className="storyline">
          <section className="castle-hero" id="arrival" data-journey-stage="0" aria-labelledby="hero-title">
            <div className="hero-frame">
              <h1 id="hero-title" className="hero-title"><img src="/assets/continuum-title.webp" alt="CONTINUUM 2027" fetchPriority="high" width="1700" height="567" /></h1>
              <p className="explore-cue">Scroll to explore <span aria-hidden="true">↓</span></p>
              <div className="hero-partner"><PoweredByUnstop /></div>
            </div>
          </section>

          {events.map((event, index) => (
            <section className={'poster-stop' + (active === index + 1 ? ' is-current' : '')} key={event.slug} id={'chapter-' + event.slug} data-journey-stage={index + 1} aria-label={event.title}>
              <Link className="static-poster" href={'/events/' + event.slug} scroll={false} onClick={stopTour} aria-label={'Explore ' + event.title}>
                <img src={event.poster} alt={event.title + ' event poster'} width="1600" height="900" loading="lazy" />
              </Link>
              <Link className="poster-interact" href={'/events/' + event.slug} scroll={false} onClick={stopTour} aria-label={'Explore ' + event.title}>
                <kbd>E</kbd><span>Open poster</span><span aria-hidden="true">↗</span>
              </Link>
            </section>
          ))}
        </div>

        <section className="poster-gallery" id="events" data-journey-stage={GALLERY} aria-labelledby="events-title" tabIndex={-1}>
          <img className="gallery-scene" src="/continuum/chrome/quest-hall.webp" srcSet="/continuum/chrome/quest-hall-mobile.webp 900w, /continuum/chrome/quest-hall.webp 1600w" sizes="100vw" alt="" aria-hidden="true" width="1600" height="900" loading="lazy" decoding="async" />
          <div className="gallery-inner">
            <p className="gallery-kicker">Quest hall</p>
            <h2 id="events-title">All events</h2>
            <div className="gallery-grid">
              {events.map(event => (
                <Link href={'/events/' + event.slug} scroll={false} key={event.slug} aria-label={'Explore ' + event.title}>
                  <img src={event.poster} alt={event.title + ' event poster'} width="1600" height="900" loading="lazy" />
                  <span className="gallery-open" aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
            <Link className="gallery-explore" href="/explore" prefetch={false}>Explore the castle freely <span aria-hidden="true">↗</span></Link>
          </div>
        </section>

        <footer className="festival-footer" id="festival" aria-labelledby="festival-title">
          <img className="footer-scene" src="/continuum/chrome/dusk-terrace.webp" srcSet="/continuum/chrome/dusk-terrace-mobile.webp 900w, /continuum/chrome/dusk-terrace.webp 1600w" sizes="100vw" alt="" aria-hidden="true" width="1600" height="900" loading="lazy" decoding="async" />
          <div className="festival-footer-inner">
            <div className="footer-brand">
              <h2 id="festival-title" className="visually-hidden">CONTINUUM 2027 festival information</h2>
              <img className="footer-emblem" src="/continuum/layers/official-emblem-mobile.webp" alt="" width="360" height="168" loading="lazy" decoding="async" />
              <p>January 2027 · MMMUT, Gorakhpur</p>
            </div>
            <div className="footer-official-links">
              <a href={officialLinks.festival} target="_blank" rel="noreferrer">Festival on Unstop <span aria-hidden="true">↗</span></a>
              <a href={officialLinks.instagram} target="_blank" rel="noreferrer">Nexsus on Instagram <span aria-hidden="true">↗</span></a>
            </div>
            <details>
              <summary>World & artwork credits</summary>
              <p>Castle by <a href="https://sketchfab.com/3d-models/minecraft-castle-4b63724d7eab47079f905369cf8a0f98">patrix</a> under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Optimized model, map and opening illustration adapted from the source geometry. Nature assets by <a href="https://kytric.itch.io/voxel-path-and-terrain">Kytric</a>, CC0. Event artwork adapted from the supplied Nexsus posters. <a href="/assets/CREDITS.md" target="_blank" rel="noreferrer">Full credits ↗</a></p>
            </details>
          </div>
        </footer>
      </main>
      <span className={worldFailed ? 'world-notice' : 'world-loading-notice'} role="status">
        {worldFailed ? 'The 3D castle could not load. You can still open every event poster.' : worldStarted && !worldReady && active < GALLERY ? 'Entering the castle…' : ''}
      </span>
    </div>
  );
}
