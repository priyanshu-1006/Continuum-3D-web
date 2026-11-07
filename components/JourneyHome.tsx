'use client';

import { Component, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CastleMap, { mapCoordinates } from './CastleMap';
import HeroEnvironment from './HeroEnvironment';
import SiteNav from './SiteNav';
import { events, officialLinks } from '@/lib/events';
import { getRouteSample, HERO_SCENERY_END, resolveRouteProgress, type JourneyProgress } from '@/lib/journey';

const CastleWorld = dynamic(() => import('./CastleWorld'), { ssr: false });
const WALK_FRACTION = 0.42;
type ViewMode = 'cinematic' | 'lite';

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
  const [mode, setMode] = useState<ViewMode>('cinematic');
  const [hydrated, setHydrated] = useState(false);
  const [worldReady, setWorldReady] = useState(false);
  const [worldAttempt, setWorldAttempt] = useState(0);
  const [active, setActive] = useState(0);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [notice, setNotice] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const progressRef = useRef<JourneyProgress>({ index: 0, previous: 0, blend: 1, jump: true, introProgress: 0 });
  const paused = pathname.startsWith('/events/');

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = window.matchMedia('(max-width: 800px)');
    let saved: string | null = null;
    try { saved = localStorage.getItem('continuum-view'); } catch { /* Preferences are optional. */ }
    const queryLite = new URLSearchParams(window.location.search).get('view') === 'lite';
    setMode(queryLite || saved === 'lite' || (saved !== 'cinematic' && reduced.matches) ? 'lite' : 'cinematic');
    setQuality(narrow.matches ? 'low' : 'high');
    setHydrated(true);
    const onWidth = () => setQuality(narrow.matches ? 'low' : 'high');
    narrow.addEventListener('change', onWidth);
    return () => narrow.removeEventListener('change', onWidth);
  }, []);

  useEffect(() => {
    if (!hydrated || !rootRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-journey-stage]'));
    let offsets: { top: number; height: number }[] = [];
    const measure = () => {
      offsets = nodes.map(node => ({ top: node.getBoundingClientRect().top + window.scrollY, height: node.offsetHeight }));
    };
    const update = () => {
      const y = window.scrollY + window.innerHeight * 0.16;
      let index = 0;
      for (let i = 1; i < offsets.length; i++) {
        if (y >= offsets[i].top) index = i;
      }
      const local = Math.max(0, (y - offsets[index].top) / offsets[index].height);
      const walk = Math.min(1, local / WALK_FRACTION);
      const introEnd = Math.max(1, offsets[1].top - window.innerHeight * 0.16);
      const introStart = window.innerHeight * 0.04;
      const intro = index > 0 ? 1 : Math.max(0, Math.min(1, (window.scrollY - introStart) / (introEnd - introStart)));
      const progress = progressRef.current;
      progress.index = index;
      progress.previous = Math.max(0, index - 1);
      progress.blend = index === 0 || index === 6 ? 1 : walk * walk * (3 - 2 * walk);
      progress.introProgress = intro;
      root.dataset.traveling = String(mode === 'cinematic' && index > 0 && index < 6 && walk < 0.97);
      root.style.setProperty('--hero-fade', String(Math.max(0, 1 - intro * 3)));
      const sceneryIntro = mode === 'cinematic' ? intro : 0;
      const foregroundFade = Math.max(0, Math.min(1, (sceneryIntro - 0.42) / 0.36));
      root.style.setProperty('--hero-intro', String(sceneryIntro));
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
    measure();
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: update,
      onRefresh: () => { measure(); update(); },
    });
    update();
    const resize = new ResizeObserver(() => ScrollTrigger.refresh());
    nodes.forEach(node => resize.observe(node));
    return () => { resize.disconnect(); trigger.kill(); };
  }, [hydrated, mode]);

  const goTo = useCallback((index: number, targetMode: ViewMode = mode) => {
    const node = rootRef.current?.querySelectorAll<HTMLElement>('[data-journey-stage]')[index];
    if (!node) return;
    const destination = node.getBoundingClientRect().top + scrollY;
    const atBanner = index > 0 && index < 6;
    let offset = 0;
    if (atBanner) offset = targetMode === 'cinematic' ? node.offsetHeight * WALK_FRACTION - innerHeight * 0.16 : -78;
    progressRef.current = { index, previous: index, blend: 1, jump: true, introProgress: index === 0 ? 0 : 1 };
    window.scrollTo({ top: destination + offset, behavior: 'instant' });
    history.replaceState(history.state, '', '#' + node.id);
    activeRef.current = index;
    setActive(index);
    ScrollTrigger.refresh();
  }, [mode]);

  const retainChapter = useCallback((index: number, targetMode: ViewMode) => {
    requestAnimationFrame(() => requestAnimationFrame(() => goTo(index, targetMode)));
  }, [goTo]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      if (!reduced.matches || mode === 'lite') return;
      setMode('lite');
      retainChapter(activeRef.current, 'lite');
    };
    reduced.addEventListener('change', onChange);
    return () => reduced.removeEventListener('change', onChange);
  }, [mode, retainChapter]);

  const changeMode = useCallback(() => {
    const next = mode === 'cinematic' ? 'lite' : 'cinematic';
    const chapter = activeRef.current;
    try { localStorage.setItem('continuum-view', next); } catch { /* Continue without persistence. */ }
    if (next === 'cinematic') {
      setWorldReady(false);
      setWorldAttempt(attempt => attempt + 1);
    }
    setNotice('');
    setMode(next);
    retainChapter(chapter, next);
  }, [mode, retainChapter]);

  const handleWorldError = useCallback(() => {
    const chapter = activeRef.current;
    setMode('lite');
    setNotice('3D is unavailable. The complete poster gallery is ready.');
    retainChapter(chapter, 'lite');
  }, [retainChapter]);

  const onReady = useCallback(() => { setWorldReady(true); setNotice(''); }, []);
  const openEvent = useCallback((slug: string) => router.push('/events/' + slug, { scroll: false }), [router]);

  useEffect(() => {
    const openNearbyBanner = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key.toLowerCase() !== 'e' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || paused || mode !== 'cinematic') return;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (active < 1 || active > 5 || rootRef.current?.dataset.traveling !== 'false') return;
      event.preventDefault();
      openEvent(events[active - 1].slug);
    };
    window.addEventListener('keydown', openNearbyBanner);
    return () => window.removeEventListener('keydown', openNearbyBanner);
  }, [active, mode, openEvent, paused]);

  return (
    <div ref={rootRef} className={'journey mode-' + mode + (worldReady ? ' world-ready' : '')} data-active-stage={active}>
      <a className="skip-link" href="#events" onClick={event => { event.preventDefault(); goTo(6); rootRef.current?.querySelector<HTMLElement>('#events')?.focus({ preventScroll: true }); }}>Skip to all events</a>
      <SiteNav journey={{ active, mode, navigate: goTo, toggleMode: changeMode }} />

      <div className="world-surface" aria-hidden="true">
        <HeroEnvironment motion={hydrated && mode === 'cinematic' && active === 0 && !paused}>
          <img className="castle-fallback" src="/assets/castle-daylight.webp" alt="" width="1512" height="880" fetchPriority="high" />
          {hydrated && mode === 'cinematic' && (
            <WorldBoundary key={worldAttempt} onError={handleWorldError}>
              <CastleWorld progressRef={progressRef} quality={quality} paused={paused} onReady={onReady} onError={handleWorldError} onSelectEvent={openEvent} />
            </WorldBoundary>
          )}
        </HeroEnvironment>
        <div className="scene-vignette" />
      </div>

      {hydrated && mode === 'cinematic' && active < 6 && <CastleMap active={active} onNavigate={goTo} />}

      <main>
        <div className="storyline">
          <section className="castle-hero" id="arrival" data-journey-stage="0" aria-labelledby="hero-title">
            <div className="hero-frame">
              <h1 id="hero-title" className="hero-title"><img src="/assets/continuum-title.webp" alt="CONTINUUM 2027" fetchPriority="high" width="1700" height="567" /></h1>
              <p className="explore-cue">Scroll to explore <span aria-hidden="true">↓</span></p>
            </div>
          </section>

          {events.map((event, index) => (
            <section className={'poster-stop' + (active === index + 1 ? ' is-current' : '')} key={event.slug} id={'chapter-' + event.slug} data-journey-stage={index + 1} aria-label={event.title}>
              <Link className="static-poster" href={'/events/' + event.slug} scroll={false} aria-label={'Explore ' + event.title}>
                <img src={event.poster} alt={event.title + ' event poster'} width="1600" height="900" loading="lazy" />
              </Link>
              <Link className="poster-interact" href={'/events/' + event.slug} scroll={false} aria-label={'Explore ' + event.title}>
                <kbd>E</kbd><span>Open poster</span><span aria-hidden="true">↗</span>
              </Link>
            </section>
          ))}
        </div>

        <section className="poster-gallery" id="events" data-journey-stage="6" aria-labelledby="events-title" tabIndex={-1}>
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
              <a href={officialLinks.instagram} target="_blank" rel="noreferrer">NEXSUS on Instagram <span aria-hidden="true">↗</span></a>
            </div>
            <details>
              <summary>World & artwork credits</summary>
              <p>Castle by <a href="https://sketchfab.com/3d-models/minecraft-castle-4b63724d7eab47079f905369cf8a0f98">patrix</a> under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Optimized model and map adapted from the source geometry. Nature assets by <a href="https://kytric.itch.io/voxel-path-and-terrain">Kytric</a>, CC0. Event artwork adapted from the supplied NEXSUS posters. <a href="/assets/CREDITS.md" target="_blank" rel="noreferrer">Full credits ↗</a></p>
            </details>
          </div>
        </footer>
      </main>
      <span className={notice ? 'world-notice' : 'visually-hidden'} role="status">{notice}</span>
    </div>
  );
}
