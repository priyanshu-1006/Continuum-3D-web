'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, MathUtils, Vector3 } from 'three';
import {
  CAMPUS_BOUNDS, CAMPUS_CHECKPOINTS, CAMPUS_COLLIDERS, CAMPUS_DISCOVERIES, CAMPUS_GATE, CAMPUS_RAMPS, CAMPUS_SPAWN,
  type CampusDiscovery, type CampusDiscoveryId,
} from '@/lib/campus-world';
import type { CampusProgress } from '@/lib/campus-progress';
import { advanceExplorer, canVault, createExploreCollision, CROUCH_HEIGHT, newExplorer, STAND_HEIGHT, type CastleCollision, type CollisionBlock } from '@/lib/explore-physics';
import { MOVEMENT_KEYS, type ExploreInput, type MoveControl } from '../explore/controls';
import ExplorerGuide, { type GuideParts } from '../explore/ExplorerGuide';
import CampusGate, { clearCampusGate } from './CampusGate';
import CampusScenery from './CampusScenery';

export type CampusSceneProps = {
  inputRef: RefObject<ExploreInput>;
  playing: boolean;
  intro: boolean;
  progress: CampusProgress;
  onReady: () => void;
  onError: () => void;
  onInteract: (id: CampusDiscoveryId | 'campus-gate') => void;
  onCheckpoint: (id: string) => void;
  onActionLabel: (label: string | null) => void;
  onFeedback: (notice: string) => void;
  sensitivity?: number;
  retry?: boolean;
};

const INTRO_CAMERA = new Vector3(3.45, 3.9, -17.75);
const INTRO_TARGET = new Vector3(0, 2.4, 2);
const BOOM = 4.05;
const GATE_BASES: CollisionBlock[] = [-1, 1].map(side => ({
  position: [side * 3.675, CAMPUS_GATE.height / 2, 0], size: [2.65, CAMPUS_GATE.height, 1.9],
}));
const GATE_BARRIER: CollisionBlock = { position: [0, 1.8, 0], size: [CAMPUS_GATE.clearWidth, 3.6, .42] };

const ACTIONS: Partial<Record<CampusDiscoveryId, string>> = {
  gate: 'Read campus sign', 'neural-nexsus': 'Inspect AI terminal', 'chief-patron': 'Read welcome letter',
  faculty: 'Meet faculty', promptx: 'Read loose page', 'dev-house': 'Read developer credits',
  secret: 'Open the prototype archive', 'redstone-rush': 'Inspect circuit cabinet', nexathon: 'Open prototype drawer',
  battleforge: 'Read arena board', keep: 'Use festival beacon', forest: 'Read forest trail sign',
};

function held(input: ExploreInput, direction: MoveControl) {
  return MOVEMENT_KEYS[direction].some(key => input.keys.has(key));
}

function levelSpot(id: string) {
  return CAMPUS_CHECKPOINTS.find(spot => spot.id === id) ?? CAMPUS_CHECKPOINTS[0];
}

function findNearby(feet: Vector3, beaconLit: boolean) {
  let result: CampusDiscovery | undefined;
  let nearest = Infinity;
  for (const item of CAMPUS_DISCOVERIES) {
    if (item.id === 'secret' && !beaconLit) continue;
    if (Math.abs(item.approach[1] - feet.y) > .55) continue;
    const distance = Math.hypot(item.approach[0] - feet.x, item.approach[2] - feet.z);
    if (distance <= item.range && distance < nearest) {
      result = item;
      nearest = distance;
    }
  }
  return result;
}

function CampusPlayer({ collision, inputRef, playing, intro, progress, onInteract, onCheckpoint, onActionLabel, onFeedback, sensitivity = 1 }:
  Omit<CampusSceneProps, 'onReady' | 'onError'> & { collision: CastleCollision }) {
  const { camera, invalidate } = useThree();
  const player = useRef(newExplorer(CAMPUS_SPAWN));
  const reset = useRef(-1);
  const cameraYaw = useRef(0);
  const cameraPitch = useRef(.22);
  const boom = useRef(BOOM);
  const introduction = useRef(1);
  const walk = useRef(0);
  const limb = useRef(0);
  const lastLabel = useRef<string | null>(null);
  const nextVaultTest = useRef(0);
  const vaultPossible = useRef(false);
  const target = useMemo(() => new Vector3(), []);
  const offset = useMemo(() => new Vector3(), []);
  const motion = useMemo(() => new Vector3(), []);
  const previous = useMemo(() => new Vector3(), []);
  const guide: GuideParts = {
    body: useRef<Group>(null), leftArm: useRef<Group>(null), rightArm: useRef<Group>(null),
    leftLeg: useRef<Group>(null), rightLeg: useRef<Group>(null),
  };
  const shadow = useRef<Group>(null);

  useEffect(() => {
    const input = inputRef.current;
    input.wake = invalidate;
    invalidate();
    return () => { if (input.wake === invalidate) input.wake = undefined; };
  }, [inputRef, invalidate]);
  useEffect(() => { invalidate(); }, [playing, intro, progress, sensitivity, invalidate]);

  useFrame((_, frameDelta) => {
    const dt = Math.min(frameDelta, .055);
    const input = inputRef.current;
    const checkpoint = levelSpot(progress.checkpoint);
    collision.gateClosed = !progress.gateOpen;
    if (input.reset !== reset.current) {
      reset.current = input.reset;
      player.current = newExplorer(checkpoint.position, checkpoint.yaw);
      cameraYaw.current = checkpoint.yaw;
      cameraPitch.current = .22;
      boom.current = BOOM;
      lastLabel.current = null;
      onActionLabel(null);
      nextVaultTest.current = 0;
      vaultPossible.current = false;
    }

    const state = player.current;
    introduction.current = intro ? 1 : Math.max(0, introduction.current - dt / .75);
    if (playing) {
      const turn = Number(input.keys.has('KeyQ')) - Number(input.keys.has('KeyR'));
      cameraYaw.current += input.lookX * .006 * sensitivity + turn * dt * 1.65;
      cameraPitch.current = MathUtils.clamp(cameraPitch.current + input.lookY * .004 * sensitivity, -.26, .86);
      if (input.recenter) {
        cameraYaw.current = state.yaw;
        cameraPitch.current = .22;
      }
    }
    input.lookX = 0;
    input.lookY = 0;
    input.recenter = false;
    const forward = Number(held(input, 'forward')) - Number(held(input, 'back')) + input.moveY;
    const right = Number(held(input, 'right')) - Number(held(input, 'left')) + input.moveX;
    const yaw = cameraYaw.current;
    motion.set(Math.sin(yaw) * forward - Math.cos(yaw) * right, 0, Math.cos(yaw) * forward + Math.sin(yaw) * right);
    if (motion.lengthSq() > 1) motion.normalize();
    previous.copy(state.feet);

    if (playing) {
      const action = findNearby(state.feet, progress.beaconLit);
      if (input.vault && action) onInteract(action.id === 'gate' && !progress.gateOpen ? 'campus-gate' : action.id);
      const feedback = advanceExplorer(state, collision, {
        direction: motion,
        crouch: input.touchCrouch || input.keys.has('KeyC'),
        jump: input.jump,
        vault: input.vault && !action,
        sprint: input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'),
      }, dt, checkpoint.position, checkpoint.yaw);
      if (feedback === 'returned') {
        cameraYaw.current = checkpoint.yaw;
        cameraPitch.current = .22;
        boom.current = BOOM;
        previous.copy(state.feet);
        onFeedback('Returned to ' + checkpoint.name + '. Your passport is safe.');
      } else if (feedback === 'vault-blocked') onFeedback('Move toward a low ledge with space to land.');
      else if (feedback === 'jump-blocked') onFeedback('Stand up in an open spot to jump.');
      input.jump = false;
      input.vault = false;

      if (state.grounded && progress.gateOpen) {
        const reached = CAMPUS_CHECKPOINTS.find(spot => Math.abs(spot.position[1] - state.feet.y) < .45
          && Math.hypot(spot.position[0] - state.feet.x, spot.position[2] - state.feet.z) < spot.radius);
        if (reached && reached.id !== checkpoint.id) onCheckpoint(reached.id);
      }
      const close = findNearby(state.feet, progress.beaconLit);
      const now = performance.now();
      if (!close && now >= nextVaultTest.current) {
        vaultPossible.current = canVault(state, collision);
        nextVaultTest.current = now + 100;
      }
      const label = close?.id === 'gate' && !progress.gateOpen
        ? 'Open campus gate'
        : close ? ACTIONS[close.id] ?? 'Inspect' : vaultPossible.current && state.grounded && !state.crouched ? 'Vault' : null;
      if (label !== lastLabel.current) {
        lastLabel.current = label;
        onActionLabel(label);
      }
    }

    const travelled = Math.hypot(state.feet.x - previous.x, state.feet.z - previous.z);
    walk.current += travelled * 10.8;
    const height = state.crouched ? CROUCH_HEIGHT : STAND_HEIGHT;
    const stride = state.grounded ? Math.sin(walk.current) * Math.min(.56, travelled / Math.max(dt, .001) * .14) : -.2;
    limb.current = MathUtils.damp(limb.current, stride, 22, dt);
    if (guide.body.current) {
      guide.body.current.position.copy(state.feet);
      guide.body.current.rotation.y = state.yaw;
      guide.body.current.scale.y = height / STAND_HEIGHT;
    }
    if (guide.leftArm.current) guide.leftArm.current.rotation.x = state.vault ? -1.02 : -limb.current;
    if (guide.rightArm.current) guide.rightArm.current.rotation.x = state.vault ? -1.02 : limb.current;
    if (guide.leftLeg.current) guide.leftLeg.current.rotation.x = state.vault ? .38 : limb.current;
    if (guide.rightLeg.current) guide.rightLeg.current.rotation.x = state.vault ? -.45 : -limb.current;
    if (shadow.current) {
      shadow.current.position.copy(state.feet);
      shadow.current.position.y += .023;
      shadow.current.visible = state.grounded;
    }

    target.copy(state.feet);
    target.y += height * .76;
    const pitch = cameraPitch.current;
    offset.set(-Math.sin(cameraYaw.current) * Math.cos(pitch), Math.sin(pitch), -Math.cos(cameraYaw.current) * Math.cos(pitch));
    const obstruction = collision.trace(target, offset, BOOM, false, .02);
    const room = obstruction ? Math.max(.14, obstruction.distance - .15) : BOOM;
    boom.current = room < boom.current ? room : MathUtils.damp(boom.current, room, 11, dt);
    camera.position.copy(target).addScaledVector(offset, boom.current);
    const blend = MathUtils.smoothstep(introduction.current, 0, 1);
    camera.position.lerp(INTRO_CAMERA, blend);
    target.lerp(INTRO_TARGET, blend);
    camera.lookAt(target);
    if (guide.body.current) guide.body.current.visible = boom.current > .4 || blend > .2;
    const moving = input.keys.size > 0 || motion.lengthSq() > .0005 || !state.grounded || !!state.vault || state.velocity.lengthSq() > .0005;
    if ((!intro && introduction.current > 0) || Math.abs(boom.current - room) > .01 || (playing && (moving || Math.abs(limb.current) > .01))) invalidate();
  });

  return <>
    <group ref={shadow}>
      <mesh rotation-x={-Math.PI / 2} scale={[1, .73, 1]}>
        <circleGeometry args={[.31, 12]} />
        <meshBasicMaterial color="#4b4327" transparent opacity={.24} depthWrite={false} />
      </mesh>
    </group>
    <ExplorerGuide parts={guide} />
  </>;
}

function CampusLevel(props: CampusSceneProps) {
  const [collision, setCollision] = useState<CastleCollision | null>(null);
  const { invalidate, gl } = useThree();
  const collected = useMemo(() => new Set(props.progress.discoveries), [props.progress.discoveries]);

  useEffect(() => {
    let world: CastleCollision | undefined;
    const id = requestAnimationFrame(() => {
      try {
        world = createExploreCollision([...CAMPUS_COLLIDERS, ...CAMPUS_RAMPS, ...GATE_BASES], GATE_BARRIER, {
          x: CAMPUS_BOUNDS.maxX, minZ: CAMPUS_BOUNDS.minZ, maxZ: CAMPUS_BOUNDS.maxZ,
        });
        setCollision(world);
      } catch (error) {
        console.error('Campus terrain could not be prepared', error);
        props.onError();
      }
    });
    return () => { cancelAnimationFrame(id); world?.dispose(); };
  }, [props.onError]);

  useEffect(() => {
    if (collision) { props.onReady(); invalidate(); }
  }, [collision, invalidate, props.onReady]);

  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); props.onError(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, props.onError]);

  return <>
    {[[-16, 11, 28], [15, 13, 37], [1, 15, 65]].map(([x, y, z]) => <group key={x} position={[x, y, z]}>
      <mesh>
        <boxGeometry args={[6.8, .48, 2.2]} />
        <meshStandardMaterial color="#e7eff1" roughness={1} />
      </mesh>
      <mesh position={[-.8, .49, -.24]}>
        <boxGeometry args={[3.5, .56, 1.7]} />
        <meshStandardMaterial color="#fff2da" roughness={1} />
      </mesh>
      <mesh position={[3.35, -.13, .52]}>
        <boxGeometry args={[1.78, .35, 1.34]} />
        <meshStandardMaterial color="#e7eff1" roughness={1} />
      </mesh>
    </group>)}
    <CampusGate open={props.progress.gateOpen} />
    <CampusScenery collected={collected} playing={props.playing} beaconLit={props.progress.beaconLit} />
    {collision && <CampusPlayer {...props} collision={collision} />}
  </>;
}

class CampusBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Campus scene failed to load', error); this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function CampusScene(props: CampusSceneProps) {
  const [quality, setQuality] = useState<'full' | 'compact' | null>(null);
  useEffect(() => {
    const test = document.createElement('canvas');
    let context: WebGL2RenderingContext | null = null;
    try { context = test.getContext('webgl2'); } catch { /* The parent renders recovery controls. */ }
    if (!context) { props.onError(); return; }
    context.getExtension('WEBGL_lose_context')?.loseContext();
    if (props.retry) clearCampusGate();
    setQuality(matchMedia('(pointer: coarse), (max-width: 750px)').matches ? 'compact' : 'full');
  }, [props.onError, props.retry]);
  if (!quality) return null;

  return <CampusBoundary onError={props.onError}>
    <Canvas style={{ width: '100%', height: '100%', touchAction: 'none' }} frameloop="demand"
      dpr={quality === 'compact' ? 1 : [1, 1.35]}
      gl={{ antialias: quality === 'full', powerPreference: 'high-performance' }}
      camera={{ position: INTRO_CAMERA, fov: quality === 'compact' ? 72 : 62, near: .05, far: 165 }}>
      <color attach="background" args={['#b4dae5']} />
      <fog attach="fog" args={['#b4dae5', 51, 128]} />
      <hemisphereLight args={['#edf6f9', '#9ba16d', 1.65]} />
      <directionalLight color="#ffe7ba" intensity={2.15} position={[-15, 25, -15]} />
      <Suspense fallback={null}><CampusLevel {...props} /></Suspense>
    </Canvas>
  </CampusBoundary>;
}
