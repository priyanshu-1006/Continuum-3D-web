'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { RELICS, type Relic, type RelicId } from '@/lib/explore-world';
import type { ExploreFeedback } from '@/lib/explore-physics';
import { clearExploreInput, GAME_KEYS, newExploreInput, type MoveControl } from './controls';
import styles from './ExploreGame.module.css';

const ExploreScene = dynamic(() => import('./ExploreScene'), { ssr: false });
type Phase = 'loading' | 'ready' | 'playing' | 'paused' | 'complete' | 'error';

const FEEDBACK: Record<ExploreFeedback, string> = {
  vaulted: 'Vaulted over the ledge.',
  'vault-blocked': 'Face a low ledge with room above it, then try Vault again.',
  'jump-blocked': 'Move out from under the roof and stand before jumping.',
  returned: 'Back at the gate. Your relics are still with you.',
};

const PAD: { direction: MoveControl; glyph: string; label: string }[] = [
  { direction: 'forward', glyph: '↑', label: 'Move forward' },
  { direction: 'left', glyph: '←', label: 'Move left' },
  { direction: 'back', glyph: '↓', label: 'Move backward' },
  { direction: 'right', glyph: '→', label: 'Move right' },
];

export default function ExploreGame() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [found, setFound] = useState<ReadonlySet<RelicId>>(() => new Set());
  const [clues, setClues] = useState(false);
  const [crouched, setCrouched] = useState(false);
  const [touchCrouch, setTouchCrouch] = useState(false);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef(newExploreInput());
  const foundRef = useRef(new Set<RelicId>());
  const viewRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const playing = phase === 'playing' && !clues;

  const ready = useCallback(() => setPhase(current => current === 'loading' ? 'ready' : current), []);
  const fail = useCallback(() => {
    clearExploreInput(inputRef.current);
    setPhase('error');
  }, []);
  const feedback = useCallback((value: ExploreFeedback) => setNotice(FEEDBACK[value]), []);
  const collect = useCallback((relic: Relic) => {
    if (foundRef.current.has(relic.id)) return;
    foundRef.current.add(relic.id);
    setFound(new Set(foundRef.current));
    setNotice('Found ' + relic.name + '.');
    if (foundRef.current.size === RELICS.length) {
      clearExploreInput(inputRef.current);
      setPhase('complete');
    }
  }, []);

  const pause = useCallback(() => {
    clearExploreInput(inputRef.current);
    drag.current = null;
    setPhase(current => current === 'playing' ? 'paused' : current);
  }, []);
  const returnToGate = useCallback(() => {
    const input = inputRef.current;
    clearExploreInput(input);
    input.touchCrouch = false;
    setTouchCrouch(false);
    setCrouched(false);
    input.reset++;
    input.wake?.();
    setNotice('Back at the gate. Your relics are still with you.');
  }, []);
  const restart = () => {
    foundRef.current.clear();
    setFound(new Set());
    returnToGate();
    setNotice('A new hunt begins.');
    setClues(false);
    setPhase('playing');
  };

  useEffect(() => {
    if (playing) viewRef.current?.focus({ preventScroll: true });
  }, [playing]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 4600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const input = inputRef.current;
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        if (clues) { event.preventDefault(); setClues(false); }
        else if (phase === 'playing') { event.preventDefault(); pause(); }
        else if (phase === 'paused') { event.preventDefault(); setPhase('playing'); }
        return;
      }
      if (!playing || !GAME_KEYS.has(event.code) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      input.keys.add(event.code);
      if (!event.repeat && event.code === 'Space') input.jump = true;
      if (!event.repeat && event.code === 'KeyE') input.vault = true;
      input.wake?.();
    };
    const up = (event: KeyboardEvent) => {
      if (input.keys.delete(event.code)) input.wake?.();
    };
    const blur = () => {
      clearExploreInput(input);
      drag.current = null;
      input.wake?.();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      clearExploreInput(input);
    };
  }, [clues, phase, pause, playing]);

  const action = (kind: 'jump' | 'vault') => {
    if (!playing) return;
    inputRef.current[kind] = true;
    inputRef.current.wake?.();
  };
  const toggleCrouch = () => {
    if (!playing) return;
    const input = inputRef.current;
    input.touchCrouch = !input.touchCrouch;
    setTouchCrouch(input.touchCrouch);
    input.wake?.();
  };
  const moveDown = (event: PointerEvent<HTMLButtonElement>, direction: MoveControl) => {
    if (!playing) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    inputRef.current.touch.add(direction);
    inputRef.current.wake?.();
  };
  const moveUp = (direction: MoveControl) => {
    inputRef.current.touch.delete(direction);
    inputRef.current.wake?.();
  };
  const lookDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!playing || drag.current || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const lookMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId || !playing) return;
    inputRef.current.lookX += event.clientX - active.x;
    inputRef.current.lookY += event.clientY - active.y;
    active.x = event.clientX;
    active.y = event.clientY;
    inputRef.current.wake?.();
  };
  const lookUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };
  const showClues = () => {
    clearExploreInput(inputRef.current);
    drag.current = null;
    setClues(current => !current);
  };

  return <main className={styles.game} data-play-state={phase}>
    <div
      ref={viewRef}
      className={styles.view}
      tabIndex={0}
      aria-label="Playable castle view. Drag to look. Use the movement and action controls to explore."
      onPointerDown={lookDown}
      onPointerMove={lookMove}
      onPointerUp={lookUp}
      onPointerCancel={lookUp}
      onLostPointerCapture={lookUp}
    >
      {phase !== 'error' && <ExploreScene key={attempt} retry={attempt > 0} inputRef={inputRef} playing={playing} found={found} onReady={ready} onError={fail} onCollect={collect} onFeedback={feedback} onCrouch={setCrouched} />}
    </div>

    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><span aria-hidden="true">←</span> Castle tour</Link>
      <h1>Castle Relic Hunt</h1>
      <div className={styles.inventory} role="status" aria-label={'Relics found: ' + found.size + ' of ' + RELICS.length}>
        <div className={styles.relicPips} aria-hidden="true">{RELICS.map(relic => <span key={relic.id} className={found.has(relic.id) ? styles.filled : undefined} />)}</div>
        <span>{found.size} / {RELICS.length} relics</span>
      </div>
    </header>

    {(phase === 'playing' || phase === 'paused') && <div className={styles.utility}>
      <button type="button" onClick={showClues} aria-expanded={clues} aria-controls="relic-clues">Clues</button>
      <button type="button" onClick={() => {
        returnToGate();
        if (playing) viewRef.current?.focus({ preventScroll: true });
      }}>Return to gate</button>
      <button type="button" onClick={phase === 'paused' ? () => setPhase('playing') : pause}>{phase === 'paused' ? 'Resume' : 'Pause'}</button>
    </div>}

    {clues && <aside className={styles.cluePanel} id="relic-clues" aria-label="Relic clues">
      <div className={styles.clueTitle}><h2>Relic clues</h2><button type="button" onClick={showClues} aria-label="Close clues">×</button></div>
      <ol>{RELICS.map(relic => <li key={relic.id}><strong>{relic.name}</strong><span>{found.has(relic.id) ? 'Found' : relic.hint}</span></li>)}</ol>
    </aside>}

    {phase === 'playing' && !clues && <>
      <div className={styles.desktopKeys} aria-label="Keyboard controls">
        <span><kbd>WASD</kbd> Move</span><span><kbd>Space</kbd> Jump</span><span><kbd>C</kbd> Crouch</span><span><kbd>E</kbd> Vault</span>
        <span>Drag to look · <kbd>Q</kbd> <kbd>R</kbd> turn</span>
      </div>
      <div className={styles.touchControls} aria-label="Touch controls">
        <div className={styles.pad}>{PAD.map(control => <button
          key={control.direction}
          type="button"
          className={styles[control.direction]}
          aria-label={control.label}
          onPointerDown={event => moveDown(event, control.direction)}
          onPointerUp={() => moveUp(control.direction)}
          onPointerCancel={() => moveUp(control.direction)}
          onLostPointerCapture={() => moveUp(control.direction)}
        >{control.glyph}</button>)}</div>
        <div className={styles.actions}>
          <button type="button" onClick={() => action('jump')}>Jump</button>
          <button type="button" onClick={toggleCrouch} aria-pressed={touchCrouch}>Crouch</button>
          <button type="button" onClick={() => action('vault')}>Vault</button>
        </div>
      </div>
    </>}

    {crouched && playing && <div className={styles.stance}>Crouching</div>}
    <div className={styles.notice} role="status" aria-live="polite">{notice && <span>{notice}</span>}</div>

    {phase !== 'playing' && !clues && <section className={styles.welcome} aria-label="Relic hunt menu">
      <div className={styles.card}>
        <span className={styles.crest} aria-hidden="true">◆</span>
        <p className={styles.eyebrow}>CONTINUUM 2027 · CASTLE QUEST</p>
        {phase === 'loading' && <><h2>Opening the castle</h2><p role="status">Loading the world and preparing the walking surfaces…</p></>}
        {phase === 'ready' && <><h2>Find the lost relics.</h2><p>Follow the gate road into the castle. Search for five relics, climb low ledges, and crouch beneath shelters.</p><button className={styles.primary} type="button" onClick={() => setPhase('playing')}>Begin hunt <span aria-hidden="true">→</span></button><p className={styles.hint}>WASD or arrows to move. Drag to look. Touch controls appear on phones.</p></>}
        {phase === 'paused' && <><h2>Hunt paused.</h2><p>You have found {found.size} of {RELICS.length} relics.</p><div className={styles.menuButtons}><button className={styles.primary} type="button" onClick={() => setPhase('playing')}>Resume hunt</button><button type="button" onClick={restart}>Restart hunt</button></div></>}
        {phase === 'complete' && <><h2>All five relics found.</h2><p>The Warden’s collection is whole again. Your castle hunt is complete.</p><div className={styles.menuButtons}><button className={styles.primary} type="button" onClick={() => setPhase('playing')}>Keep exploring</button><button type="button" onClick={restart}>Play again</button><Link href="/">Return to castle tour</Link></div></>}
        {phase === 'error' && <><h2>The castle could not open.</h2><p>Reload the world to try again, or return to the castle tour.</p><div className={styles.menuButtons}><button className={styles.primary} type="button" onClick={() => { setAttempt(current => current + 1); setPhase('loading'); }}>Try again</button><Link href="/">Return to castle tour</Link></div></>}
      </div>
    </section>}
  </main>;
}
