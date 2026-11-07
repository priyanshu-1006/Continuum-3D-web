'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const portalDuration = 2100;
const portalTimeout = 20000;
const pageNames: Readonly<Record<string, string>> = {
  '/': 'the Castle',
  '/sponsors': 'the Guild Hall',
  '/about': 'the Founders’ Archive',
  '/contact': 'the Dispatch Tower',
};
const eventPath = /^\/events\/[^/]+\/?$/;

type PortalView = { destination: string; lite: boolean };
type Crossing = {
  view: PortalView;
  targetPath: string;
  documentHref?: string;
  focusDestination: boolean;
  committed: boolean;
  minimumPassed: boolean;
};

function liteMode() {
  if (document.querySelector('.journey.mode-lite') || new URLSearchParams(location.search).get('view') === 'lite') return true;
  try { return localStorage.getItem('continuum-view') === 'lite'; } catch { return false; }
}

function isEventModal() {
  return Boolean(document.querySelector('[data-event-dialog="true"]'));
}

function Portal({ view, onShow }: { view: PortalView; onShow: (view: PortalView) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [lit, setLit] = useState(false);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    onShow(view);
    return () => { element.close(); };
  }, [onShow, view]);

  return (
    <dialog
      ref={dialog}
      className="route-portal"
      data-lite={view.lite}
      data-lit={lit}
      aria-label="Castle portal"
      onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <picture className="route-portal__scene" aria-hidden="true">
        <source media="(max-width: 680px)" srcSet="/continuum/destinations/portal-mobile.webp" />
        <img src="/continuum/destinations/portal.webp" alt="" width="1600" height="900" />
      </picture>
      <div className="route-portal__glimmer" aria-hidden="true" />
      <div className="route-portal__plaque">
        <button
          type="button"
          className="route-portal__rune"
          aria-label="Light the portal rune"
          aria-pressed={lit}
          onClick={() => setLit((value) => !value)}
          title="Light the portal rune"
        ><span aria-hidden="true" /><small aria-hidden="true">{lit ? 'Rune lit' : 'Light rune'}</small></button>
        <div className="route-portal__message">
          <p className="route-portal__kicker">CONTINUUM 2027 · Castle Portal</p>
          <p className="route-portal__destination" role="status">Entering {view.destination}</p>
          <div className="route-portal__blocks" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <span key={index} style={{ animationDelay: `${index * (portalDuration / 8)}ms` }} />)}
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default function RouteTransition() {
  const pathname = usePathname();
  const [view, setView] = useState<PortalView | null>(null);
  const currentRoute = useRef({ pathname, modal: false });
  const fullPage = useRef(pathname);
  const pending = useRef<Crossing | null>(null);
  const minimumTimer = useRef(0);
  const safetyTimer = useRef(0);

  const clearTimers = useCallback(() => {
    window.clearTimeout(minimumTimer.current);
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

  const begin = useCallback((destination: string, focusDestination: boolean, documentHref?: string) => {
    clearTimers();
    const next: Crossing = {
      view: {
        destination: pageNames[destination] ?? (eventPath.test(destination) ? 'the event chamber' : 'the next chamber'),
        lite: liteMode(),
      },
      targetPath: destination,
      documentHref,
      focusDestination,
      committed: false,
      minimumPassed: false,
    };
    pending.current = next;
    setView(next.view);
    return next;
  }, [clearTimers]);

  const onShow = useCallback((visibleView: PortalView) => {
    const crossing = pending.current;
    if (!crossing || crossing.view !== visibleView) return;
    clearTimers();
    minimumTimer.current = window.setTimeout(() => {
      crossing.minimumPassed = true;
      if (crossing.documentHref) window.location.assign(crossing.documentHref);
      else if (crossing.committed) finish(crossing.focusDestination);
    }, portalDuration);
    safetyTimer.current = window.setTimeout(() => finish(), portalTimeout);
  }, [clearTimers, finish]);

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
    if (crossing.minimumPassed) finish(crossing.focusDestination);
  }, [begin, finish, pathname]);

  useEffect(() => {
    // A small background request makes the first crossing start with its artwork.
    const art = new window.Image();
    art.fetchPriority = 'low';
    art.src = window.matchMedia('(max-width: 680px)').matches
      ? '/continuum/destinations/portal-mobile.webp'
      : '/continuum/destinations/portal.webp';

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

  return view ? <Portal view={view} onShow={onShow} /> : null;
}
