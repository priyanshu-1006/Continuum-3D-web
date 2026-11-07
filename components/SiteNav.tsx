'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';

const destinations = [
  { label: 'Castle', href: '/#arrival', stop: 0, room: 'The entrance' },
  { label: 'Events', href: '/#events', stop: 6, room: 'Quest Hall' },
  { label: 'Sponsors', href: '/sponsors', room: 'Guild Hall' },
  { label: 'About', href: '/about', room: 'Founders’ Archive' },
  { label: 'Contact', href: '/contact', room: 'Dispatch Tower' },
] as const;

type JourneyNav = {
  active: number;
  mode: 'cinematic' | 'lite';
  navigate: (stop: number) => void;
  toggleMode: () => void;
};

export default function SiteNav({ journey }: { journey?: JourneyNav }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const desktop = window.matchMedia('(min-width: 722px)');
    const dismissOnDesktop = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissWithEscape);
    desktop.addEventListener('change', dismissOnDesktop);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissWithEscape);
      desktop.removeEventListener('change', dismissOnDesktop);
    };
  }, [open]);

  function follow(event: MouseEvent<HTMLAnchorElement>, stop?: number) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (journey && stop !== undefined) {
      event.preventDefault();
      journey.navigate(stop);
      if (open) toggleRef.current?.focus({ preventScroll: true });
    }
    setOpen(false);
  }

  return (
    <header ref={navRef} className={'glass-nav site-nav' + (open ? ' site-nav--open' : '') + (journey ? ' site-nav--journey' : '')}>
      <Link className="nav-brand" href={journey ? '#arrival' : '/#arrival'} aria-label="CONTINUUM 2027 home" onClick={event => follow(event, 0)}>
        <img className="nav-emblem" src="/continuum/layers/official-icon.png" alt="" width="128" height="128" />
        <span>CONTINUUM <small>2027</small></span>
      </Link>
      <nav className="site-nav-links" id={menuId} aria-label="Main navigation">
        {destinations.map(item => {
          const stop = 'stop' in item ? item.stop : undefined;
          const current = journey && stop !== undefined
            ? ((stop === 6 ? journey.active === 6 : journey.active < 6) ? 'location' : undefined)
            : path === item.href ? 'page' : stop === 6 && path.startsWith('/events/') ? 'location' : undefined;
          return (
            <Link key={item.href} href={journey && stop !== undefined ? item.href.slice(1) : item.href} aria-current={current} onClick={event => follow(event, stop)}>
              <span>{item.label}</span><small aria-hidden="true">{item.room}</small>
            </Link>
          );
        })}
      </nav>
      <div className="site-nav-controls">
        {journey && (
          <button className="nav-mode" type="button" onClick={journey.toggleMode} title={journey.mode === 'cinematic' ? 'Switch to Lite view' : 'Enable the 3D castle'}>
            <i aria-hidden="true" />{journey.mode === 'cinematic' ? 'Lite mode' : 'Enable 3D'}
          </button>
        )}
        <button ref={toggleRef} className="site-nav-menu" type="button" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}>
          <span className="site-nav-menu-icon" aria-hidden="true"><i /><i /><i /></span>
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
    </header>
  );
}
