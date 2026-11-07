"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { ArrowIcon } from "@/components/EventDetails";
import EventTabs from "@/components/EventTabs";
import { getAdjacentEvents, type Event } from "@/lib/events";
import { getEventWorld } from "@/lib/event-worlds";

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const exitDuration = 200;

function isVisible(element: HTMLElement) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility === "visible";
}

function EventMeta({ event }: { event: Event }) {
  const facts = [
    { label: "When", value: event.dateLabel },
    { label: "Duration", value: event.durationLabel },
    { label: "Team", value: event.teamLabel },
    { label: "Venue", value: event.venue },
  ];

  return (
    <dl className="event-world-meta" aria-label="Event at a glance">
      {facts.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

// Dynamic event segments can remount the modal during a replace navigation.
// Keep the opening control for the whole modal visit, rather than just one event.
let returnFocusTarget: HTMLElement | null = null;
let pendingFocusRestore: number | null = null;

export default function EventModal({ event }: { event: Event }) {
  const router = useRouter();
  const world = getEventWorld(event.slug);
  const { next } = getAdjacentEvents(event.slug);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const closeTimer = useRef<number | null>(null);
  const startedOnBackdrop = useRef(false);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const backdrop = backdropRef.current;
    if (!backdrop || backdrop.dataset.lite === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.back();
      return;
    }
    backdrop.dataset.closing = "true";
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      router.back();
    }, exitDuration);
  }, [router]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const backdrop = backdropRef.current;
    if (dialog) dialog.scrollTop = 0;
    closing.current = false;
    if (pendingFocusRestore !== null) {
      cancelAnimationFrame(pendingFocusRestore);
      pendingFocusRestore = null;
    }
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    const siteRoot = document.getElementById("site-root");
    if (backdrop) {
      backdrop.dataset.lite = String(Boolean(siteRoot?.querySelector(".journey.mode-lite")));
      delete backdrop.dataset.closing;
    }
    if (activeElement && siteRoot?.contains(activeElement)) returnFocusTarget = activeElement;
    if (!returnFocusTarget?.isConnected) {
      const eventLinks = siteRoot?.querySelectorAll<HTMLAnchorElement>(`a[href="/events/${event.slug}"]`) ?? [];
      returnFocusTarget = Array.from(eventLinks).find(isVisible) ?? null;
    }
    const background = siteRoot && !siteRoot.contains(dialog) ? siteRoot : null;
    const previousInert = background?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (background) background.inert = true;
    closeRef.current?.focus({ preventScroll: true });

    const getFocusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
      .filter((element) => element.tabIndex >= 0 && isVisible(element) && !element.closest("[inert]"));
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.defaultPrevented || document.querySelector(".route-portal[open]")) return;
      if (keyEvent.key === "Escape" && !keyEvent.repeat) {
        keyEvent.preventDefault();
        close();
      }
      if (keyEvent.key !== "Tab") return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) { keyEvent.preventDefault(); dialog?.focus(); return; }
      if (keyEvent.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        keyEvent.preventDefault(); last.focus();
      } else if (!keyEvent.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        keyEvent.preventDefault(); first.focus();
      }
    };
    const containFocus = (focusEvent: FocusEvent) => {
      if (document.querySelector(".route-portal[open]")) return;
      if (dialog && focusEvent.target instanceof Node && !dialog.contains(focusEvent.target)) closeRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", containFocus);
    return () => {
      if (closeTimer.current !== null) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", containFocus);
      document.body.style.overflow = originalOverflow;
      if (background) background.inert = previousInert;
      pendingFocusRestore = requestAnimationFrame(() => {
        pendingFocusRestore = null;
        if (document.querySelector('[data-event-dialog="true"]')) return;
        if (returnFocusTarget?.isConnected && isVisible(returnFocusTarget)) {
          returnFocusTarget.focus({ preventScroll: true });
        }
        returnFocusTarget = null;
      });
    };
  }, [close, event.slug]);

  return (
    <div
      className="event-modal-backdrop"
      ref={backdropRef}
      onPointerDown={(pointerEvent) => { startedOnBackdrop.current = pointerEvent.target === pointerEvent.currentTarget; }}
      onClick={(clickEvent) => {
        if (startedOnBackdrop.current && clickEvent.target === clickEvent.currentTarget) close();
        startedOnBackdrop.current = false;
      }}
    >
      <div
        className="event-modal event-world"
        ref={dialogRef}
        data-event-dialog="true"
        data-world={event.slug}
        style={world.style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`event-title-${event.slug}`}
        aria-describedby={`event-tagline-${event.slug}`}
        tabIndex={-1}
      >
        <img className="event-world-trim" src={world.trim} alt="" aria-hidden="true" width="2143" height="482" decoding="async" />
        <header className="event-world-toolbar">
          <p className="event-world-brand">
            <span>CONTINUUM <b>2027</b></span>
            <span className="event-world-brand-chapter">Quest {event.chapter} / 05</span>
          </p>
          <button type="button" className="event-modal-close" ref={closeRef} onClick={close} aria-label="Close event details">
            <span>Close</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </header>

        <div className="event-world-grid">
          <figure className="event-world-art">
            <div className="event-world-artwork">
              <Image
                src={world.artwork}
                alt={world.artworkAlt}
                fill
                sizes="(max-width: 767px) calc(100vw - 36px), (max-width: 1140px) 42vw, 450px"
                loading="eager"
              />
            </div>
            <img className="event-world-banner" src={world.banner} alt="" aria-hidden="true" width="88" height="132" decoding="async" />
            <img className="event-world-lantern" src="/continuum/events/shared/frame/lantern.png" alt="" aria-hidden="true" width="62" height="96" decoding="async" />
            <figcaption className="event-world-caption"><span>World {event.chapter}</span><strong>{world.name}</strong></figcaption>
          </figure>

          <div className="event-world-main">
            <header className="event-world-heading">
              <img className="event-world-emblem" src={world.emblem} alt="" aria-hidden="true" width="94" height="102" decoding="async" />
              <div className="event-world-title">
                <p className="event-world-kicker">{event.category}</p>
                <h1 id={`event-title-${event.slug}`}>{event.title}</h1>
                <p className="event-world-tagline" id={`event-tagline-${event.slug}`}>{event.tagline}</p>
              </div>
            </header>
            <EventMeta event={event} />
            <img className="event-world-divider" src={world.divider} alt="" aria-hidden="true" width="1024" height="42" />
            <EventTabs key={event.slug} event={event} />
          </div>
        </div>

        <footer className="event-world-footer">
          <div className="event-world-actions">
            {event.registrationUrl ? (
              <a className="event-world-cta" href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
                <span>Start quest <small>on Unstop</small></span><ArrowIcon diagonal />
              </a>
            ) : (
              <button className="event-world-cta" type="button" disabled aria-label={`Registration: ${event.registrationLabel}`}>
                Registration pending
              </button>
            )}
            <a className="event-world-details-link" href={`/events/${event.slug}`}>
              Explore details <ArrowIcon diagonal />
            </a>
          </div>
          <Link className="event-world-next" href={`/events/${next.slug}`} scroll={false} prefetch={false} replace>
            <span><small>Next quest</small>{next.title}</span><ArrowIcon />
          </Link>
        </footer>
      </div>
    </div>
  );
}
