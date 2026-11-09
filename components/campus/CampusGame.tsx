'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { CAMPUS_CHECKPOINTS, CAMPUS_DISCOVERIES, CAMPUS_LANDMARKS, type CampusDiscoveryId } from '@/lib/campus-world';
import { CAMPUS_SAVE_KEY, campusStamps, newCampusProgress, readCampusProgress, type CampusProgress } from '@/lib/campus-progress';
import { events, getEvent, type Event, type EventId } from '@/lib/events';
import { chiefPatron, cseHead, developerCredits, facultyAdvisors, facultyCoordinators, peopleSources } from '@/lib/nexsus-people';
import { clearExploreInput, GAME_KEYS, newExploreInput } from '../explore/controls';
import styles from './CampusGame.module.css';

const CampusScene = dynamic(() => import('./CampusScene'), { ssr: false });
const DEFAULT_CHECKPOINT = CAMPUS_CHECKPOINTS[0].id;
const UNIVERSITY = 'Madan Mohan Malaviya University of Technology, Gorakhpur';
const SIGILS = ['✦', '◆', '⬟', '✹', '⚑'];
const STAMP_TASKS: Record<EventId, { label: string; clue: string; choices: string[]; correct: number }> = {
  'neural-nexsus': {
    label: 'Wake the AI lab terminal',
    clue: 'The terminal must learn to tell campus palms from stone towers. What should you give it?',
    choices: ['Labeled photos of palms and towers', 'A blank folder', 'Only the name of the campus'],
    correct: 0,
  },
  promptx: {
    label: 'Complete the library prompt',
    clue: 'The missing brief asks for three lines welcoming first-year students to CONTINUUM. Choose the clearest instruction.',
    choices: ['Write something good', 'Welcome first-year students to CONTINUUM in three lines', 'Describe every room on campus'],
    correct: 1,
  },
  'redstone-rush': {
    label: 'Power the circuit cabinet',
    clue: 'The battery and lamp are wired, but the switch is open. What completes the circuit?',
    choices: ['Paint the lamp red', 'Remove the battery', 'Close the switch'],
    correct: 2,
  },
  nexathon: {
    label: 'Test the workbench prototype',
    clue: 'The drawer holds a sketch for a campus wayfinding tool. Choose a first step that can test the idea.',
    choices: ['Ask a visitor to follow a rough route', 'Build every feature first', 'Put the sketch back in the drawer'],
    correct: 0,
  },
  battleforge: {
    label: 'Read the practice bracket',
    clue: 'Two teams advance from this practice heat. Your squad finishes second. Where do you go?',
    choices: ['The next round', 'The opening heat again', 'Back to the entrance'],
    correct: 0,
  },
};
const PAGES = [['stamps', 'Stamps'], ['map', 'Campus map'], ['events', 'Event directory']] as const;
const LANDMARK_STOPS: Record<string, CampusDiscoveryId> = {
  gate: 'gate', cse: 'neural-nexsus', library: 'promptx', makers: 'redstone-rush',
  admin: 'chief-patron', dev: 'dev-house', arena: 'battleforge', keep: 'keep', forest: 'forest',
};

type Phase = 'loading' | 'ready' | 'playing' | 'error';
type BookPage = typeof PAGES[number][0];
type Panel =
  | { kind: 'book'; page: BookPage }
  | { kind: 'stop'; id: CampusDiscoveryId; back?: BookPage; preview?: boolean }
  | { kind: 'event'; id: EventId; back: BookPage }
  | { kind: 'pause' };
type Discovery = (typeof CAMPUS_DISCOVERIES)[number];

function campusEvent(stop: Discovery) {
  return 'eventId' in stop && typeof stop.eventId === 'string' ? getEvent(stop.eventId) : undefined;
}

export default function CampusGame() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState(newCampusProgress);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [notice, setNotice] = useState('');
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [touchCrouch, setTouchCrouch] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const progressRef = useRef(progress);
  const inputRef = useRef(newExploreInput());
  const viewRef = useRef<HTMLDivElement>(null);
  const stickKnob = useRef<HTMLSpanElement>(null);
  const stickPointer = useRef<number | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const playing = phase === 'playing' && panel === null;
  const visited = useMemo(() => new Set(progress.discoveries), [progress.discoveries]);
  const stamps = useMemo(() => campusStamps(progress.discoveries), [progress.discoveries]);
  const saved = progress.gateOpen || visited.size > 0;

  const clearInput = useCallback(() => {
    clearExploreInput(inputRef.current);
    drag.current = null;
    stickPointer.current = null;
    if (stickKnob.current) stickKnob.current.style.transform = '';
    inputRef.current.wake?.();
  }, []);

  const save = useCallback((next: CampusProgress) => {
    progressRef.current = next;
    setProgress(next);
    try { window.localStorage.setItem(CAMPUS_SAVE_KEY, JSON.stringify(next)); } catch { /* Play remains available. */ }
  }, []);

  useEffect(() => {
    try {
      const restored = readCampusProgress(window.localStorage.getItem(CAMPUS_SAVE_KEY));
      progressRef.current = restored;
      setProgress(restored);
      const speed = Number(window.localStorage.getItem('continuum-campus-camera'));
      if (speed >= .55 && speed <= 1.65) setSensitivity(speed);
    } catch { /* Some private browsing modes block storage. */ }
  }, []);

  const ready = useCallback(() => setPhase(current => current === 'loading' ? 'ready' : current), []);
  const fail = useCallback(() => { clearInput(); setPhase('error'); }, [clearInput]);
  const openPanel = useCallback((next: Panel) => { clearInput(); setPanel(next); }, [clearInput]);

  const checkpoint = useCallback((id: string) => {
    const previous = progressRef.current;
    if (id === previous.checkpoint || !CAMPUS_CHECKPOINTS.some(spot => spot.id === id)) return;
    save({ ...previous, checkpoint: id });
  }, [save]);

  const interact = useCallback((id: CampusDiscoveryId | 'campus-gate') => {
    const previous = progressRef.current;
    if (!previous.gateOpen && (id === 'campus-gate' || id === 'gate')) {
      save({
        ...previous,
        gateOpen: true,
        discoveries: previous.discoveries.includes('gate') ? previous.discoveries : [...previous.discoveries, 'gate'],
      });
      setNotice('Welcome to MMMUT. Follow the road to the campus courtyard.');
      return;
    }
    if (id === 'campus-gate') return;
    const discovery = CAMPUS_DISCOVERIES.find(stop => stop.id === id);
    if (!discovery) return;
    if (id === 'secret' && !previous.beaconLit) {
      setNotice('The archive opens after you light the Festival Keep.');
      return;
    }
    if (campusEvent(discovery)) {
      openPanel({ kind: 'stop', id });
      return;
    }
    const discoveries = previous.discoveries.includes(id) ? previous.discoveries : [...previous.discoveries, id];
    const beaconLit = previous.beaconLit || (id === 'keep' && campusStamps(discoveries).size === events.length);
    if (discoveries !== previous.discoveries || beaconLit !== previous.beaconLit) {
      save({ ...previous, discoveries, beaconLit });
    }
    if (beaconLit && !previous.beaconLit) {
      setNotice('The Festival Keep is lit. Look for a hidden archive on the grounds.');
      return;
    }
    openPanel({ kind: 'stop', id });
  }, [openPanel, save]);

  const collectStamp = (id: CampusDiscoveryId) => {
    const previous = progressRef.current;
    if (previous.discoveries.includes(id)) return;
    save({ ...previous, discoveries: [...previous.discoveries, id] });
  };

  const reposition = (id: string) => {
    clearInput();
    save({ ...progressRef.current, checkpoint: id });
    inputRef.current.touchCrouch = false;
    inputRef.current.reset++;
    setTouchCrouch(false);
    setActionLabel(null);
    inputRef.current.wake?.();
  };

  useEffect(() => {
    if (playing) viewRef.current?.focus({ preventScroll: true });
  }, [playing]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 5200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const input = inputRef.current;
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && playing) {
        event.preventDefault();
        openPanel({ kind: 'pause' });
        return;
      }
      if (!playing || !GAME_KEYS.has(event.code) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      input.keys.add(event.code);
      if (!event.repeat) {
        if (event.code === 'Space') input.jump = true;
        if (event.code === 'KeyE') input.vault = true;
        if (event.code === 'KeyF') input.recenter = true;
      }
      input.wake?.();
    };
    const up = (event: KeyboardEvent) => { if (input.keys.delete(event.code)) input.wake?.(); };
    const hidden = () => { if (document.hidden) clearInput(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearInput);
      document.removeEventListener('visibilitychange', hidden);
      clearInput();
    };
  }, [clearInput, openPanel, playing]);

  const action = (kind: 'jump' | 'vault' | 'recenter') => {
    if (!playing) return;
    inputRef.current[kind] = true;
    inputRef.current.wake?.();
    viewRef.current?.focus({ preventScroll: true });
  };

  const toggleCrouch = () => {
    const input = inputRef.current;
    input.touchCrouch = !input.touchCrouch;
    setTouchCrouch(input.touchCrouch);
    input.wake?.();
    viewRef.current?.focus({ preventScroll: true });
  };
  const tap = (run: () => void) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      run();
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => { if (!event.detail) run(); },
  });

  const moveStick = (event: PointerEvent<HTMLDivElement>) => {
    if (!playing || stickPointer.current !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    const radius = box.width * .34;
    const dx = (event.clientX - box.left - box.width / 2) / radius;
    const dy = (event.clientY - box.top - box.height / 2) / radius;
    const length = Math.hypot(dx, dy);
    const scale = length > .12 ? 1 / Math.max(1, length) : 0;
    inputRef.current.moveX = dx * scale;
    inputRef.current.moveY = -dy * scale;
    if (stickKnob.current) stickKnob.current.style.transform = 'translate(' + dx * scale * radius + 'px,' + dy * scale * radius + 'px)';
    inputRef.current.wake?.();
  };

  const stopStick = (event: PointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== event.pointerId) return;
    stickPointer.current = null;
    inputRef.current.moveX = 0;
    inputRef.current.moveY = 0;
    if (stickKnob.current) stickKnob.current.style.transform = '';
    inputRef.current.wake?.();
  };

  const startLook = (event: PointerEvent<HTMLDivElement>) => {
    if (!playing || drag.current || event.button !== 0) return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const moveLook = (event: PointerEvent<HTMLDivElement>) => {
    const pointer = drag.current;
    if (!playing || !pointer || pointer.id !== event.pointerId) return;
    inputRef.current.lookX += event.clientX - pointer.x;
    inputRef.current.lookY += event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    inputRef.current.wake?.();
  };

  const endLook = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };

  const currentStop = panel?.kind === 'stop' ? CAMPUS_DISCOVERIES.find(stop => stop.id === panel.id) : undefined;
  const currentEvent = panel?.kind === 'event' ? getEvent(panel.id) : currentStop && !((panel?.kind === 'stop') && panel.preview) ? campusEvent(currentStop) : undefined;

  return <main className={styles.game} data-campus-state={phase}>
    <div ref={viewRef} className={styles.view} tabIndex={0} aria-label="Playable campus. Use WASD to walk and drag to look."
      onPointerDown={startLook} onPointerMove={moveLook} onPointerUp={endLook}
      onPointerCancel={endLook} onLostPointerCapture={endLook}>
      {phase !== 'error' && <CampusScene key={attempt} retry={attempt > 0}
        inputRef={inputRef} playing={playing} intro={phase === 'loading' || phase === 'ready'}
        progress={progress} sensitivity={sensitivity} onReady={ready} onError={fail}
        onInteract={interact} onCheckpoint={checkpoint} onActionLabel={setActionLabel} onFeedback={setNotice}
      />}
    </div>

    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><span aria-hidden="true">←</span> Festival site</Link>
      <h1>CONTINUUM <span>Campus</span></h1>
      <div className={styles.topActions}>
        <button type="button" className={styles.passportButton} onClick={() => openPanel({ kind: 'book', page: 'stamps' })} aria-label={'Campus passport. ' + stamps.size + ' of ' + events.length + ' stamps'}>
          <span aria-hidden="true">▤</span> Passport <b>{stamps.size}/{events.length}</b>
        </button>
        {phase === 'playing' && <button type="button" className={styles.pauseButton} aria-label="Pause exploration" onClick={() => openPanel({ kind: 'pause' })}><span aria-hidden="true">Ⅱ</span></button>}
      </div>
    </header>

    {phase !== 'playing' && <section className={styles.welcome} aria-label="Campus entrance">
      <div className={styles.welcomeCard}>
        <span className={styles.kicker}><span aria-hidden="true">◆</span> CONTINUUM 2027</span>
        <h2>{phase === 'error' ? 'Campus view unavailable' : 'The campus awaits'}</h2>
        <p className={styles.university}>{UNIVERSITY}</p>
        <p>{phase === 'error' ? 'You can still open your passport and browse festival information.' : 'Walk through the university gate. Find five event stamps and light the Festival Keep.'}</p>
        {phase === 'loading' && <div className={styles.loading} role="status">Preparing the streets and campus grounds…</div>}
        {phase === 'ready' && <button type="button" className={styles.primary} onClick={() => { reposition(progressRef.current.checkpoint); setPhase('playing'); }}>
          {saved ? 'Continue exploring' : 'Enter campus'} <span aria-hidden="true">→</span>
        </button>}
        {phase === 'error' && <button type="button" className={styles.primary} onClick={() => { setAttempt(current => current + 1); setPhase('loading'); }}>Try the 3D view again</button>}
      </div>
    </section>}

    {playing && <>
      <div className={styles.controls} aria-label="Keyboard controls">
        <span><kbd>WASD</kbd> Move</span>
        <span><kbd>Shift</kbd> Sprint</span>
        <span><kbd>Space</kbd> Jump</span>
        <span><kbd>C</kbd> Crouch</span>
        <span><kbd>E</kbd> Interact</span>
        <span>Drag to look</span>
      </div>
      <div className={styles.objective} aria-label="Current objective">
        <span aria-hidden="true">◆</span>
        <div><strong>{!progress.gateOpen ? 'Campus arrival' : progress.beaconLit ? 'Keep illuminated' : 'Festival passport'}</strong>
          <small>{!progress.gateOpen ? 'Follow the street to the university gate.' : progress.beaconLit ? 'Look for the hidden archive.' : stamps.size === events.length ? 'Find the beacon in the Festival Keep.' : 'Collect event stamps around campus.'}</small>
        </div>
      </div>
      {actionLabel && <button type="button" className={styles.context} onClick={() => action('vault')}><kbd>E</kbd>{actionLabel}</button>}
      <div className={styles.touchControls} aria-label="Touch controls">
        <div className={styles.stick} role="group" aria-label="Movement thumbstick" onPointerDown={event => {
          if (stickPointer.current !== null) return;
          event.preventDefault();
          stickPointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          moveStick(event);
        }} onPointerMove={moveStick} onPointerUp={stopStick} onPointerCancel={stopStick} onLostPointerCapture={stopStick}>
          <span aria-hidden="true" className={styles.stickKnob} ref={stickKnob}>✥</span>
        </div>
        <div className={styles.actions}>
          <button type="button" {...tap(() => action('recenter'))} aria-label="Recenter camera">↻</button>
          <button type="button" {...tap(() => action('jump'))}>Jump</button>
          <button type="button" {...tap(toggleCrouch)} aria-pressed={touchCrouch}>Crouch</button>
          <button type="button" {...tap(() => action('vault'))} disabled={!actionLabel}>Use</button>
        </div>
      </div>
    </>}

    <div className={styles.notice} role="status" aria-live="polite">{notice && <span>{notice}</span>}</div>

    {panel && <CampusDialog title={panel.kind === 'pause' ? 'Take a breather' : currentEvent?.title ?? currentStop?.name ?? 'Campus Passport'}
      kicker={panel.kind === 'pause' ? 'Exploration paused' : currentStop?.location ?? 'CONTINUUM 2027'}
      close={() => setPanel(null)}
      back={(panel.kind === 'stop' || panel.kind === 'event') && panel.back
        ? () => setPanel({ kind: 'book', page: panel.back ?? 'stamps' })
        : undefined}
    >
      {panel.kind === 'book' && <>
        <nav className={styles.tabs} aria-label="Passport pages">
          {PAGES.map(([page, label]) => <button type="button" key={page} aria-current={panel.page === page ? 'page' : undefined} onClick={() => setPanel({ kind: 'book', page })}>{label}</button>)}
        </nav>
        {panel.page === 'stamps' && <Passport stamps={stamps} visited={visited} beaconLit={progress.beaconLit}
          openEvent={id => setPanel({ kind: 'event', id, back: 'stamps' })}
          openStop={id => setPanel({ kind: 'stop', id, back: 'stamps' })}
        />}
        {panel.page === 'map' && <CampusMap visited={visited} open={id => setPanel({ kind: 'stop', id, back: 'map', preview: !visited.has(id) })} />}
        {panel.page === 'events' && <EventDirectory stamps={stamps} open={id => setPanel({ kind: 'event', id, back: 'events' })} />}
      </>}
      {currentEvent && <EventDetails key={currentEvent.slug} event={currentEvent} stamped={stamps.has(currentEvent.slug)}
        collect={panel.kind === 'stop' && !panel.preview ? () => collectStamp(panel.id) : undefined} />}
      {currentStop && !currentEvent && <StopDetails stop={currentStop} preview={panel.kind === 'stop' && panel.preview === true} progress={progress} stampCount={stamps.size} />}
      {panel.kind === 'pause' && <>
        <p className={styles.lede}>Your passport is saved on this device. Continue from here or return to the university gate.</p>
        <label className={styles.range}>Look sensitivity <input type="range" min=".55" max="1.65" step=".05" value={sensitivity} onChange={event => {
          setSensitivity(Number(event.target.value));
          try { window.localStorage.setItem('continuum-campus-camera', event.target.value); } catch { /* The current setting still applies. */ }
        }} /></label>
        <div className={styles.links}>
          <button className={styles.primary} type="button" onClick={() => setPanel(null)}>Resume exploring</button>
          <button className={styles.secondary} type="button" onClick={() => { reposition(DEFAULT_CHECKPOINT); setPanel(null); setNotice('Back at the university gate. Your stamps are safe.'); }}>Return to gate</button>
        </div>
      </>}
    </CampusDialog>}
  </main>;
}

function CampusDialog({ title, kicker, close, back, children }: {
  title: string;
  kicker: string;
  close: () => void;
  back?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const header = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
    header.current?.focus({ preventScroll: true });
  }, [title]);

  return <dialog ref={ref} className={styles.dialog} aria-labelledby="campus-dialog-title"
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className={styles.dialogInner}>
      <header className={styles.dialogHeader}>
        <div>
          {back && <button type="button" onClick={back} className={styles.previous}>← Back to passport</button>}
          <p className={styles.kicker}>{kicker}</p>
          <h2 id="campus-dialog-title" ref={header} tabIndex={-1}>{title}</h2>
        </div>
        <button type="button" className={styles.close} onClick={close} aria-label="Close campus panel">×</button>
      </header>
      {children}
    </div>
  </dialog>;
}

function Passport({ stamps, visited, beaconLit, openEvent, openStop }: {
  stamps: ReadonlySet<EventId>;
  visited: ReadonlySet<CampusDiscoveryId>;
  beaconLit: boolean;
  openEvent: (id: EventId) => void;
  openStop: (id: CampusDiscoveryId) => void;
}) {
  const notes = CAMPUS_DISCOVERIES.filter(stop => visited.has(stop.id) && !campusEvent(stop));
  return <>
    <p className={styles.lede}>{beaconLit ? 'The Festival Keep is lit. Explore the grounds for the hidden archive.' : 'Discover all five events on campus, then visit the Festival Keep to light its beacon.'}</p>
    <div className={styles.stamps}>
      {events.map((event, index) => {
        const collected = stamps.has(event.slug);
        return <button key={event.slug} type="button" data-collected={collected} onClick={() => openEvent(event.slug)}
          style={{ '--stamp': event.accent } as CSSProperties}
          aria-label={event.title + (collected ? ' stamp collected' : ' stamp to discover')}>
          <span aria-hidden="true">{collected ? SIGILS[index] : '0' + (index + 1)}</span>
          <strong>{event.title}</strong><small>{collected ? 'Stamped' : 'To discover'}</small>
        </button>;
      })}
    </div>
    <h3 className={styles.sectionTitle}>Field notes</h3>
    {notes.length ? <div className={styles.noteList}>{notes.map(stop => (
      <button key={stop.id} type="button" onClick={() => openStop(stop.id)}><span>{stop.name}</span><span aria-hidden="true">→</span></button>
    ))}</div> : <p className={styles.lede}>Read the entrance sign and explore the buildings to start your field notes.</p>}
  </>;
}

function CampusMap({ visited, open }: { visited: ReadonlySet<CampusDiscoveryId>; open: (id: CampusDiscoveryId) => void }) {
  const hasStop = (id: string) => Object.hasOwn(LANDMARK_STOPS, id);
  return <>
    <p className={styles.lede}>Follow the main avenue from the gate to the keep. Select a landmark for its clue.</p>
    <div className={styles.map} aria-label="Campus landmark map">
      <span className={styles.compass} aria-hidden="true">N ↑</span>
      <div className={styles.mapAvenue} aria-hidden="true" />
      {[39.75, 55.5, 73.5].map(y => <div className={styles.mapLane} style={{ top: y + '%' }} key={y} aria-hidden="true" />)}
      {CAMPUS_LANDMARKS.map((landmark, index) => {
        const id = hasStop(landmark.id) ? LANDMARK_STOPS[landmark.id] : undefined;
        const x = 50 - landmark.position[0] * 2;
        const y = 90 - landmark.position[2] * 1.5;
        const pointStyle = { left: x + '%', top: y + '%' };
        return id ? <button type="button" className={styles.mapPin} key={landmark.id} data-visited={visited.has(id)}
          style={pointStyle} onClick={() => open(id)} title={landmark.name} aria-label={landmark.name}>{index + 1}</button>
          : <span key={landmark.id} className={styles.mapPlaza} style={pointStyle} aria-label={landmark.name}>●</span>;
      })}
    </div>
    <div className={styles.mapIndex}>{CAMPUS_LANDMARKS.map((landmark, index) => (
      hasStop(landmark.id) ? <button type="button" key={landmark.id} onClick={() => open(LANDMARK_STOPS[landmark.id])}><b>{index + 1}</b>{landmark.name}</button>
        : <span key={landmark.id}><b>●</b>{landmark.name}</span>
    ))}</div>
  </>;
}

function EventDirectory({ stamps, open }: { stamps: ReadonlySet<EventId>; open: (id: EventId) => void }) {
  return <>
    <p className={styles.lede}>Browse the festival line-up. The virtual campus is an exploration game. Use the event pages for confirmed dates and venues.</p>
    <div className={styles.noteList}>{events.map(event => <button type="button" key={event.slug} onClick={() => open(event.slug)}>
      <span><strong>{event.title}</strong><small>{event.category} · {event.dateLabel}</small></span>
      <span className={styles.noteBadge}>{stamps.has(event.slug) ? 'Stamped' : 'Details →'}</span>
    </button>)}</div>
  </>;
}

function EventDetails({ event, stamped, collect }: { event: Event; stamped: boolean; collect?: () => void }) {
  const [tried, setTried] = useState<number | null>(null);
  const task = STAMP_TASKS[event.slug];
  return <div className={styles.event}>
    <Image className={styles.poster} src={event.originalPoster} alt={event.title + ' event poster'} width={330} height={413} sizes="(max-width: 590px) 94px, 160px" />
    <div>
      {stamped && <p className={styles.stampMark}>✓ Campus stamp collected</p>}
      <p className={styles.lede}>{event.description}</p>
      <dl className={styles.eventFacts}>
        <div><dt>Event</dt><dd>{event.format}</dd></div>
        <div><dt>Date</dt><dd>{event.dateLabel}</dd></div>
        <div><dt>Venue</dt><dd>{event.venue}</dd></div>
      </dl>
      <div className={styles.links}>
        <Link href={'/events/' + event.slug} prefetch={false} className={styles.primary}>Event page ↗</Link>
        {event.registrationUrl && <a href={event.registrationUrl} target="_blank" rel="noreferrer" className={styles.secondary}>{event.registrationLabel} ↗</a>}
        {event.rulebookUrl && <a href={event.rulebookUrl} target="_blank" rel="noreferrer" className={styles.secondary}>Rulebook ↗</a>}
      </div>
      {!stamped && collect && <section className={styles.challenge} aria-label={task.label}>
        <h3>{task.label}</h3>
        <p>{task.clue}</p>
        <div className={styles.choices}>{task.choices.map((choice, index) => (
          <button key={choice} type="button" data-tried={tried === index} onClick={() => {
            if (index === task.correct) collect();
            else setTried(index);
          }}>{choice}</button>
        ))}</div>
        {tried !== null && <p className={styles.retry} role="status">Read the clue and try another choice.</p>}
      </section>}
    </div>
  </div>;
}

function StopDetails({ stop, preview, progress, stampCount }: {
  stop: Discovery;
  preview: boolean;
  progress: CampusProgress;
  stampCount: number;
}) {
  if (preview) return <p className={styles.lede}>{stop.hint}</p>;
  return <>
    {stop.id !== 'chief-patron' && <p className={styles.lede}>{stop.description}</p>}
    {stop.id === 'keep' && <p className={styles.callout}>{progress.beaconLit ? 'The beacon is lit. Search for the hidden archive.' : `You have ${stampCount} of ${events.length} event stamps. The beacon lights when you return with the full passport.`}</p>}
    {stop.id === 'chief-patron' && <div className={styles.patron}>
      {chiefPatron.portrait && <Image src={'/continuum/people/' + chiefPatron.portrait + '.webp'} alt="" width={84} height={84} />}
      <div><p className={styles.kicker}>{chiefPatron.role}</p><strong>{chiefPatron.name}</strong>
      <p>{chiefPatron.appointment}</p>
      <Link href="/about#patron-heading" className={styles.textLink}>Festival leadership ↗</Link>
      </div>
    </div>}
    {stop.id === 'faculty' && <FacultyNotes />}
    {stop.id === 'dev-house' && <>
      <div className={styles.callout}><strong>From the workbench</strong><p>The project grew from a scroll-through castle tour to a playable relic hunt and this walkable campus.</p></div>
      <h3 className={styles.sectionTitle}>Developer credits</h3>
      <ul className={styles.roster}>{developerCredits.map(member => <li key={member.name}>
        <span className={styles.initials} aria-hidden="true">{member.name.split(' ').map(word => word[0]).join('')}</span>
        <span><strong>{member.name}</strong><small>{member.role} · {member.cohort}</small></span>
      </li>)}</ul>
      <Link href="/team" className={styles.textLink}>Meet the Nexsus team ↗</Link>
    </>}
    {stop.id === 'forest' && <div className={styles.links}><Link href={stop.link ?? '/explore'} prefetch={false} className={styles.primary}>Enter the original castle →</Link></div>}
    {stop.link?.startsWith('/') && (stop.id === 'gate' || stop.id === 'faculty') && <div className={styles.links}><Link href={stop.link} prefetch={false} className={styles.secondary}>Read more ↗</Link></div>}
  </>;
}

function FacultyNotes() {
  return <>
    <div className={styles.callout}><strong>{cseHead.name}</strong><p>{cseHead.appointment}</p></div>
    {([[facultyCoordinators, 'Faculty coordinators'], [facultyAdvisors, 'Faculty advisors']] as const).map(([people, title]) => <section key={title}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <ul className={styles.roster}>{people.map(member => <li key={member.name}>
        <Image src={'/continuum/people/' + member.portrait + '.webp'} alt="" width={44} height={44} />
        <span><strong>{member.name}</strong><small>{member.appointment} · {member.interests}</small></span>
      </li>)}</ul>
    </section>)}
    <a href={peopleSources.faculty} target="_blank" rel="noreferrer" className={styles.textLink}>Nexsus faculty directory ↗</a>
  </>;
}

