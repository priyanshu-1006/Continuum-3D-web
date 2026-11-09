'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { QUEST_CHECKPOINTS, RELICS, type CheckpointId, type QuestInteractableId, type Relic } from '@/lib/explore-world';
import { BRIDGE_CLUE, HUNT_SAVE, interactQuest, newQuest, readQuest, type QuestCue } from '@/lib/explore-progress';
import type { ExploreFeedback } from '@/lib/explore-physics';
import { clearExploreInput, GAME_KEYS, newExploreInput } from './controls';
import styles from './ExploreGame.module.css';

const ExploreScene = dynamic(() => import('./ExploreScene'), { ssr: false });
type Phase = 'loading' | 'ready' | 'playing' | 'paused' | 'complete' | 'error';

const FEEDBACK: Record<ExploreFeedback, string> = {
  vaulted: 'Vaulted over the ledge.',
  'vault-blocked': 'Face a low ledge with a clear landing to vault.',
  'jump-blocked': 'Stand up in an open spot to jump.',
  returned: 'Returned to your checkpoint. Your relics are safe.',
};

const SOUNDS: Record<QuestCue, string[]> = {
  step: ['footstep00', 'footstep03', 'footstep06'], land: ['footstep06'], chest: ['creak2'],
  gate: ['doorOpen_1'], collect: ['handleCoins'], switch: ['metalClick'], beacon: ['metalLatch'],
};
const RELIC_GLYPHS = ['✦', '⚿', '⬢', '✥', '♛'];
const SOUND_PREF = 'continuum-hunt-sound';

export default function ExploreGame() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState(newQuest);
  const [clues, setClues] = useState(false);
  const [touchCrouch, setTouchCrouch] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [sound, setSound] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const progressRef = useRef(progress);
  const found = useMemo(() => new Set(progress.relics), [progress.relics]);
  const inputRef = useRef(newExploreInput());
  const viewRef = useRef<HTMLDivElement>(null);
  const stickKnob = useRef<HTMLSpanElement>(null);
  const stickPointer = useRef<number | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const finishTimer = useRef<number | undefined>(undefined);
  const audio = useRef(new Map<string, HTMLAudioElement>());
  const stepIndex = useRef(0);
  const playing = phase === 'playing' && !clues;

  const resetInput = useCallback(() => {
    clearExploreInput(inputRef.current);
    drag.current = null;
    stickPointer.current = null;
    if (stickKnob.current) stickKnob.current.style.transform = '';
    inputRef.current.wake?.();
  }, []);

  const save = useCallback((next: typeof progress) => {
    progressRef.current = next;
    setProgress(next);
    try { localStorage.setItem(HUNT_SAVE, JSON.stringify(next)); } catch { /* The hunt still works without storage. */ }
  }, []);

  useEffect(() => {
    try {
      const stored = readQuest(localStorage.getItem(HUNT_SAVE));
      progressRef.current = stored;
      setProgress(stored);
      setSound(localStorage.getItem(SOUND_PREF) === 'on');
      const speed = Number(localStorage.getItem('continuum-hunt-camera'));
      if (speed >= .55 && speed <= 1.65) setSensitivity(speed);
    } catch { /* Storage may be restricted. */ }
    return () => { window.clearTimeout(finishTimer.current); };
  }, []);

  const playCue = useCallback((cue: QuestCue) => {
    if (!sound) return;
    const samples = SOUNDS[cue];
    const clip = samples[cue === 'step' ? stepIndex.current++ % samples.length : 0];
    let sample = audio.current.get(clip);
    if (!sample) {
      sample = new Audio('/assets/explore/' + clip + '.ogg');
      audio.current.set(clip, sample);
    }
    sample.volume = cue === 'step' || cue === 'land' ? .22 : .55;
    sample.currentTime = 0;
    void sample.play().catch(() => {});
  }, [sound]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    if (!next) audio.current.forEach(sample => sample.pause());
    if (playing) viewRef.current?.focus({ preventScroll: true });
    try { localStorage.setItem(SOUND_PREF, next ? 'on' : 'off'); } catch { /* Session setting still applies. */ }
  };

  const ready = useCallback(() => setPhase(current => current === 'loading' ? 'ready' : current), []);
  const fail = useCallback(() => { resetInput(); setPhase('error'); }, [resetInput]);
  const feedback = useCallback((value: ExploreFeedback) => {
    setNotice(FEEDBACK[value]);
    if (value === 'returned') {
      resetInput();
      inputRef.current.touchCrouch = false;
      setTouchCrouch(false);
    }
  }, [resetInput]);
  const collect = useCallback((relic: Relic) => {
    const previous = progressRef.current;
    if (previous.relics.includes(relic.id)) return;
    const relics = [...previous.relics, relic.id];
    save({ ...previous, relics });
    playCue('collect');
    setNotice(relics.length === RELICS.length ? 'All five relics found. Bring them to the courtyard altar.' : 'Found ' + relic.name + '.');
  }, [playCue, save]);
  const checkpoint = useCallback((id: CheckpointId) => {
    const previous = progressRef.current;
    if (previous.checkpoint === id || (id !== 'gate' && !previous.gateOpen)) return;
    save({ ...previous, checkpoint: id });
    setNotice('Checkpoint · ' + QUEST_CHECKPOINTS[id].name);
  }, [save]);
  const interact = useCallback((id: QuestInteractableId) => {
    const previous = progressRef.current;
    const result = interactQuest(previous, id);
    if (result.progress !== previous) save(result.progress);
    if (result.cue) playCue(result.cue);
    setNotice(result.notice);
    if (!previous.beaconLit && result.progress.beaconLit) {
      finishTimer.current = window.setTimeout(() => {
        resetInput();
        setClues(false);
        setPhase('complete');
      }, 3400);
    }
  }, [playCue, resetInput, save]);

  const pause = useCallback(() => {
    resetInput();
    setPhase(current => current === 'playing' ? 'paused' : current);
  }, [resetInput]);

  const teleport = useCallback((id: CheckpointId) => {
    resetInput();
    const input = inputRef.current;
    input.touchCrouch = false;
    input.respawn = id;
    input.reset++;
    setTouchCrouch(false);
    setActionLabel(null);
    input.wake?.();
  }, [resetInput]);
  const returnToGate = () => {
    teleport('gate');
    save({ ...progressRef.current, checkpoint: 'gate' });
    setNotice('Back at the gate. Your relics are safe.');
    if (playing) viewRef.current?.focus({ preventScroll: true });
  };
  const restart = () => {
    window.clearTimeout(finishTimer.current);
    save(newQuest());
    teleport('gate');
    setNotice('A new hunt begins.');
    setClues(false);
    setPhase('playing');
  };

  useEffect(() => {
    if (playing) viewRef.current?.focus({ preventScroll: true });
  }, [playing]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 4700);
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
      if (!event.repeat) {
        if (event.code === 'Space') input.jump = true;
        if (event.code === 'KeyE') input.vault = true;
        if (event.code === 'KeyF') input.recenter = true;
      }
      input.wake?.();
    };
    const up = (event: KeyboardEvent) => {
      if (input.keys.delete(event.code)) input.wake?.();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', resetInput);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', resetInput);
      resetInput();
    };
  }, [clues, phase, pause, playing, resetInput]);

  const action = (kind: 'jump' | 'vault' | 'recenter') => {
    if (!playing) return;
    inputRef.current[kind] = true;
    inputRef.current.wake?.();
    viewRef.current?.focus({ preventScroll: true });
  };
  const toggleCrouch = () => {
    if (!playing) return;
    const input = inputRef.current;
    input.touchCrouch = !input.touchCrouch;
    setTouchCrouch(input.touchCrouch);
    input.wake?.();
    viewRef.current?.focus({ preventScroll: true });
  };
  const touchAction = (event: PointerEvent<HTMLButtonElement>, run: () => void) => {
    if (event.button !== 0) return;
    event.preventDefault();
    run();
  };
  const moveStick = (event: PointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== event.pointerId || !playing) return;
    const box = event.currentTarget.getBoundingClientRect();
    const radius = box.width * .35;
    const dx = (event.clientX - box.left - box.width / 2) / radius;
    const dy = (event.clientY - box.top - box.height / 2) / radius;
    const magnitude = Math.hypot(dx, dy);
    const divisor = Math.max(1, magnitude);
    inputRef.current.moveX = magnitude > .12 ? dx / divisor : 0;
    inputRef.current.moveY = magnitude > .12 ? -dy / divisor : 0;
    if (stickKnob.current) stickKnob.current.style.transform = 'translate(' + inputRef.current.moveX * radius + 'px, ' + -inputRef.current.moveY * radius + 'px)';
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
  const showClues = () => { resetInput(); setClues(current => !current); };
  const hasRun = progress.relics.length > 0 || progress.gateOpen;

  return <main className={styles.game} data-play-state={phase}>
    <div ref={viewRef} className={styles.view} tabIndex={0}
      aria-label="Playable castle view. Drag to look. Use the movement and action controls to explore."
      onPointerDown={lookDown} onPointerMove={lookMove} onPointerUp={lookUp}
      onPointerCancel={lookUp} onLostPointerCapture={lookUp}
    >
      {phase !== 'error' && <ExploreScene key={attempt} retry={attempt > 0} inputRef={inputRef} playing={playing} intro={phase === 'loading' || phase === 'ready'} found={found} progress={progress} sensitivity={sensitivity}
        onReady={ready} onError={fail} onCollect={collect} onFeedback={feedback}
        onInteract={interact} onCheckpoint={checkpoint} onActionLabel={setActionLabel} onSound={playCue}
      />}
    </div>

    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><span aria-hidden="true">←</span> Castle tour</Link>
      <h1>Castle Relic Hunt</h1>
      <div className={styles.inventory} role="status" aria-label={'Relics found: ' + found.size + ' of ' + RELICS.length}>
        <span>{found.size} / {RELICS.length} relics</span>
      </div>
    </header>

    {(phase === 'playing' || phase === 'paused') && <div className={styles.utility}>
      <button type="button" onClick={showClues} aria-expanded={clues} aria-controls="relic-clues">Journal</button>
      <button type="button" onClick={toggleSound} aria-pressed={sound}>Sound {sound ? 'on' : 'off'}</button>
      <button type="button" onClick={phase === 'paused' ? () => setPhase('playing') : pause}>{phase === 'paused' ? 'Resume' : 'Pause'}</button>
    </div>}

    {clues && <aside className={styles.cluePanel} id="relic-clues" aria-label="Quest journal">
      <div className={styles.clueTitle}><h2>Quest journal</h2><button type="button" onClick={showClues} aria-label="Close journal">×</button></div>
      <p>{progress.beaconLit ? 'The keep is lit.' : 'Find the five relics and bring them to the courtyard altar.'}</p>
      {progress.chestOpen && <p className={styles.clueNote}><strong>Bridge keeper’s note</strong><br />{BRIDGE_CLUE}</p>}
      <ol>{RELICS.map(relic => <li key={relic.id}><strong>{relic.name}</strong><span>{found.has(relic.id) ? 'Found' : relic.hint}</span></li>)}</ol>
      {progress.beaconLit && <p className={styles.clueNote}>{progress.secretFound ? 'Bonus found · Nexsus pennant' : 'Look for a socket in the stone near the altar.'}</p>}
    </aside>}

    {playing && <>
      <div className={styles.desktopKeys} aria-label="Keyboard controls">
        <span><kbd>WASD</kbd> Move</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>Space</kbd> Jump</span><span><kbd>C</kbd> Crouch</span>
        <span><kbd>E</kbd> Interact</span><span>Drag to look · <kbd>F</kbd> Recenter</span>
      </div>
      <div className={styles.hotbar} aria-label="Relic inventory">{RELICS.map((relic, index) => <span
        key={relic.id} className={found.has(relic.id) ? styles.acquired : undefined}
        style={{ '--relic-color': relic.color } as CSSProperties}
        aria-label={relic.name + (found.has(relic.id) ? ' found' : ' missing')}
        title={relic.name}
      >{found.has(relic.id) ? RELIC_GLYPHS[index] : index + 1}</span>)}</div>
      {actionLabel && <button type="button" className={styles.contextAction} onClick={() => action('vault')}><kbd>E</kbd>{actionLabel}</button>}
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
          <button type="button" onPointerDown={event => touchAction(event, () => action('recenter'))} onClick={event => { if (!event.detail) action('recenter'); }} aria-label="Recenter camera">↻</button>
          <button type="button" onPointerDown={event => touchAction(event, () => action('jump'))} onClick={event => { if (!event.detail) action('jump'); }}>Jump</button>
          <button type="button" onPointerDown={event => touchAction(event, toggleCrouch)} onClick={event => { if (!event.detail) toggleCrouch(); }} aria-pressed={touchCrouch}>Crouch</button>
          <button type="button" onPointerDown={event => touchAction(event, () => action('vault'))} onClick={event => { if (!event.detail) action('vault'); }}>{actionLabel === 'Vault' || !actionLabel ? 'Vault' : 'Use'}</button>
        </div>
      </div>
    </>}

    <div className={styles.notice} role="status" aria-live="polite">{notice && <span>{notice}</span>}</div>

    {phase !== 'playing' && !clues && <section className={styles.welcome} aria-label="Relic hunt menu">
      <div className={styles.card}>
        <span className={styles.crest} aria-hidden="true">◆</span>
        <p className={styles.eyebrow}>CONTINUUM 2027 · CASTLE QUEST</p>
        {phase === 'loading' && <><h2>Opening the castle</h2><p role="status">Preparing the gate and the walking surfaces…</p></>}
        {phase === 'ready' && <><h2>Light the keep.</h2><p>The Warden’s beacon went dark. Find the five relics and bring them to the altar to light the castle again.</p>
          <div className={styles.menuButtons}>
            <button className={styles.primary} type="button" onClick={() => { teleport(progressRef.current.checkpoint); setPhase('playing'); }}>
              {hasRun ? 'Continue hunt' : 'Begin hunt'} <span aria-hidden="true">→</span>
            </button>
            <Link href="/campus">MMMUT campus</Link>
          </div><p className={styles.hint}>WASD or arrows to move. Drag to look. Touch controls appear on phones.</p></>}
        {phase === 'paused' && <><h2>Hunt paused.</h2><p>{QUEST_CHECKPOINTS[progress.checkpoint].name} · {found.size} of {RELICS.length} relics</p>
          <label className={styles.sensitivity}>Look sensitivity <input type="range" min=".55" max="1.65" step=".05" value={sensitivity} onChange={event => {
            setSensitivity(Number(event.target.value));
            try { localStorage.setItem('continuum-hunt-camera', event.target.value); } catch { /* Session setting still applies. */ }
          }} /></label>
          <div className={styles.menuButtons}><button className={styles.primary} type="button" onClick={() => setPhase('playing')}>Resume hunt</button><button type="button" onClick={() => { returnToGate(); setPhase('playing'); }}>Return to gate</button><button type="button" onClick={restart}>Restart</button></div></>}
        {phase === 'complete' && <><h2>The keep is lit.</h2><p>The five relics have restored the beacon. Its light reveals a secret near the altar.</p><div className={styles.menuButtons}><button className={styles.primary} type="button" onClick={() => setPhase('playing')}>Keep exploring</button><button type="button" onClick={restart}>Play again</button><Link href="/">Castle tour</Link></div></>}
        {phase === 'error' && <><h2>The castle could not open.</h2><p>Reload the world to try again, or return to the castle tour.</p><div className={styles.menuButtons}><button className={styles.primary} type="button" onClick={() => { setAttempt(current => current + 1); setPhase('loading'); }}>Try again</button><Link href="/">Castle tour</Link></div></>}
      </div>
    </section>}
  </main>;
}
