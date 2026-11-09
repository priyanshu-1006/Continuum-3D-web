'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const portalDuration = 2100;
const revealDuration = 180;
const portalTimeout = 20000;
const pageNames: Readonly<Record<string, string>> = {
  '/': 'the Castle',
  '/sponsors': 'the Guild Hall',
  '/about': 'the Founders’ Archive',
  '/team': 'the Team Hall',
  '/contact': 'the Dispatch Tower',
  '/sign-in': 'the Gatehouse',
  '/explore': 'the Castle Hunt',
};
const eventPath = /^\/events\/[^/]+\/?$/;
const desktopScene = '/continuum/destinations/portal.webp';
const mobileScene = '/continuum/destinations/portal-mobile-v2.webp';
const leftDoor = '/continuum/destinations/portal-door-left.webp';
const rightDoor = '/continuum/destinations/portal-door-right.webp';

type PortalView = { id: number; destination: string };
type PortalPhase = 'opening' | 'waiting' | 'revealing';
type Crossing = {
  view: PortalView;
  targetPath: string;
  documentHref?: string;
  focusDestination: boolean;
  committed: boolean;
  minimumPassed: boolean;
};

function isEventModal() {
  return Boolean(document.querySelector('[data-event-dialog="true"]'));
}

function Portal({ view, phase, onShow }: { view: PortalView; phase: PortalPhase; onShow: (view: PortalView) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    onShow(view);
    return () => element.close();
  }, [onShow, view]);

  return (
    <dialog
      ref={dialog}
      className="route-portal"
      data-phase={phase}
      aria-label="Castle gate"
      onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div className="route-portal__world" aria-hidden="true">
        <picture className="route-portal__scene">
          <source media="(max-width: 680px) and (orientation: portrait)" srcSet={mobileScene} />
          <img src={desktopScene} alt="" width="1600" height="900" />
        </picture>
        <div className="route-portal__gate">
          <div className="route-portal__leaf route-portal__leaf--left">
            <img src={leftDoor} alt="" />
          </div>
          <div className="route-portal__leaf route-portal__leaf--right">
            <img src={rightDoor} alt="" />
          </div>
          <span className="route-portal__seam" />
          <span className="route-portal__latch"><i /></span>
        </div>
      </div>
      <div className="route-portal__vignette" aria-hidden="true" />
      <p className="route-portal__edition" aria-hidden="true">CONTINUUM <span>2027</span></p>
      <div className="route-portal__message">
        <div className="route-portal__chapters" aria-hidden="true">
          <span>Unseal</span>
          <span>Open</span>
          <span>Cross</span>
        </div>
        <p className="route-portal__destination" role="status">
          {phase === 'waiting' ? 'Waiting to enter' : 'Entering'} {view.destination}
        </p>
      </div>
    </dialog>
  );
}

export default function RouteTransition() {
  const pathname = usePathname();
  const [view, setView] = useState<PortalView | null>(null);
  const [phase, setPhase] = useState<PortalPhase>('opening');
  const currentRoute = useRef({ pathname, modal: false });
  const fullPage = useRef(pathname);
  const pending = useRef<Crossing | null>(null);
  const sequence = useRef(0);
  const minimumTimer = useRef(0);
  const revealTimer = useRef(0);
  const safetyTimer = useRef(0);

  const clearTimers = useCallback(() => {
    window.clearTimeout(minimumTimer.current);
    window.clearTimeout(revealTimer.current);
    window.clearTimeout(safetyTimer.current);
  }, []);

  const finish = useCallback((moveFocus = false) => {
    clearTimers();
    pending.current = null;
    setView(null);
    if (!moveFocus) return;
    window.requestAnimationFrame(() => {
      if (pending.current || isEventModal()) return;
      const heading = document.querySelector<HTMLElement>('#site-root main h1');
      if (!heading) return;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    });
  }, [clearTimers]);

  const reveal = useCallback((crossing: Crossing) => {
    clearTimers();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish(crossing.focusDestination);
      return;
    }
    setPhase('revealing');
    revealTimer.current = window.setTimeout(() => finish(crossing.focusDestination), revealDuration);
  }, [clearTimers, finish]);

  const begin = useCallback((destination: string, focusDestination: boolean, documentHref?: string) => {
    clearTimers();
    const next: Crossing = {
      view: {
        id: ++sequence.current,
        destination: pageNames[destination] ?? (eventPath.test(destination) ? 'the event chamber' : 'the next chamber'),
      },
      targetPath: destination,
      documentHref,
      focusDestination,
      committed: false,
      minimumPassed: false,
    };
    pending.current = next;
    setPhase('opening');
    setView(next.view);
    return next;
  }, [clearTimers]);

  const onShow = useCallback((visibleView: PortalView) => {
    const crossing = pending.current;
    if (!crossing || crossing.view !== visibleView) return;
    clearTimers();
    minimumTimer.current = window.setTimeout(() => {
      crossing.minimumPassed = true;
      if (crossing.committed) {
        reveal(crossing);
        return;
      }
      setPhase('waiting');
      if (crossing.documentHref) window.location.assign(crossing.documentHref);
    }, portalDuration);
    safetyTimer.current = window.setTimeout(() => finish(), portalTimeout);
  }, [clearTimers, finish, reveal]);

  useLayoutEffect(() => {
    const previous = currentRoute.current;
    const modal = isEventModal() || (eventPath.test(pathname) && Boolean(document.querySelector('#site-root .journey')));
    currentRoute.current = { pathname, modal };
    if (previous.pathname === pathname) return;

    // The intercepted event slot keeps the full page below it in place.
    if (modal || (previous.modal && pathname === fullPage.current)) {
      if (pending.current) finish();
      return;
    }

    fullPage.current = pathname;
    const crossing = pending.current ?? begin(pathname, false);
    if (crossing.targetPath !== pathname) return;
    crossing.committed = true;
    if (crossing.minimumPassed) reveal(crossing);
  }, [begin, finish, pathname, reveal]);

  useEffect(() => {
    // A small background request makes the first crossing start with its artwork.
    const scene = window.matchMedia('(max-width: 680px) and (orientation: portrait)').matches ? mobileScene : desktopScene;
    for (const src of [scene, leftDoor, rightDoor]) {
      const art = new window.Image();
      art.fetchPriority = 'low';
      art.src = src;
    }

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const url = new URL(anchor.href);
      if (url.origin !== location.origin) return;
      if (!Object.hasOwn(pageNames, url.pathname) && !eventPath.test(url.pathname)) return;

      // At the window bubble phase, Next Link has already claimed client-side
      // navigations. Native event links intentionally open the full event page.
      const native = !event.defaultPrevented;
      const modalDetail = native && anchor.classList.contains('event-world-details-link');
      if (url.pathname === currentRoute.current.pathname && !modalDetail) return;
      if (!native && eventPath.test(url.pathname)) return;

      if (native) event.preventDefault();
      begin(url.pathname, !native, native ? url.href : undefined);
    }

    function onPopState() {
      const target = location.pathname;
      const current = currentRoute.current;
      if (target === current.pathname || eventPath.test(target) || (current.modal && target === fullPage.current)) {
        if (pending.current) finish();
        return;
      }
      begin(target, false);
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted && pending.current) finish();
    }

    window.addEventListener('click', onClick);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pageshow', onPageShow);
      clearTimers();
    };
  }, [begin, clearTimers, finish]);

  return view ? <Portal key={view.id} view={view} phase={phase} onShow={onShow} /> : null;
}
