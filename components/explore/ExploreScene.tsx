'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Color, Group, MathUtils, Mesh, Vector3, type Material } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { advanceExplorer, canVault, createCastleCollision, CROUCH_HEIGHT, newExplorer, STAND_HEIGHT, type CastleCollision, type ExploreFeedback } from '@/lib/explore-physics';
import { EXPLORE_BLOCKS, QUEST_CHECKPOINTS, QUEST_INTERACTABLES, RELICS, type CheckpointId, type QuestInteractableId, type Relic, type RelicId } from '@/lib/explore-world';
import type { QuestCue, QuestProgress } from '@/lib/explore-progress';
import type { WorldPoint } from '@/lib/journey';
import { MOVEMENT_KEYS, type ExploreInput, type MoveControl } from './controls';
import QuestScenery from './QuestScenery';
import ExplorerGuide, { type GuideParts } from './ExplorerGuide';

export type ExploreSceneProps = {
  retry: boolean;
  inputRef: RefObject<ExploreInput>;
  playing: boolean;
  intro: boolean;
  found: ReadonlySet<RelicId>;
  progress: QuestProgress;
  sensitivity: number;
  onReady: () => void;
  onError: () => void;
  onCollect: (relic: Relic) => void;
  onFeedback: (feedback: ExploreFeedback) => void;
  onInteract: (id: QuestInteractableId) => void;
  onCheckpoint: (id: CheckpointId) => void;
  onActionLabel: (label: string | null) => void;
  onSound: (cue: QuestCue) => void;
};

function configureLoader(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder);
}

function Voxel({ position, size, color }: { position: WorldPoint; size: WorldPoint; color: string }) {
  return <mesh position={position}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={.9} />
  </mesh>;
}

function createVisibleCastle(source: Group) {
  const wrapper = new Group();
  wrapper.position.set(-.25, -9, 0);
  wrapper.add(source.clone(true));
  const materials = new Map<Material, Material>();
  const tone = new Color(1.60, 1.55, 1.48);
  const brighten = (material: Material) => {
    const cached = materials.get(material);
    if (cached) return cached;
    const copy = material.clone();
    if ('color' in copy && copy.color instanceof Color) copy.color.multiply(tone);
    materials.set(material, copy);
    return copy;
  };
  wrapper.traverse(node => {
    if (node instanceof Mesh) node.material = Array.isArray(node.material) ? node.material.map(brighten) : brighten(node.material);
  });
  return { wrapper, materials };
}

function relicAvailable(id: RelicId, progress: QuestProgress) {
  if (id === 'gate-seal') return progress.gateOpen;
  if (id === 'wayfinder') return progress.bridgeStep === 2;
  return true;
}

function RelicMarkers({ found, progress }: Pick<ExploreSceneProps, 'found' | 'progress'>) {
  return <group>
    {RELICS.filter(relic => !found.has(relic.id) && relicAvailable(relic.id, progress)).map(relic => <group key={relic.id} position={relic.position}>
      <mesh rotation={[.12, .6, .18]}>
        {relic.id === 'sunstone' ? <octahedronGeometry args={[.18, 0]} /> : <boxGeometry args={[.24, .24, .11]} />}
        <meshStandardMaterial color={relic.color} emissive={relic.color} emissiveIntensity={.74} roughness={.37} />
      </mesh>
      {relic.id === 'moon-key' && <Voxel position={[0, -.15, 0]} size={[.068, .20, .065]} color={relic.color} />}
      {relic.id === 'wayfinder' && <Voxel position={[0, .035, -.071]} size={[.044, .18, .021]} color="#284d57" />}
      {relic.id === 'warden-crown' && [-.09, 0, .09].map(x => <Voxel key={x} position={[x, .13, 0]} size={[.062, .09, .12]} color={relic.color} />)}
      <mesh position={[0, -.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.14, .17, 12]} />
        <meshBasicMaterial color={relic.color} transparent opacity={.52} depthWrite={false} />
      </mesh>
      <mesh position={[.19, .1, 0]} rotation={[0, .6, .7]}>
        <boxGeometry args={[.045, .045, .045]} />
        <meshBasicMaterial color="#fff2b7" toneMapped={false} />
      </mesh>
    </group>)}
  </group>;
}

function isHeld(input: ExploreInput, direction: MoveControl) {
  return MOVEMENT_KEYS[direction].some(key => input.keys.has(key));
}

const checkpoints = Object.entries(QUEST_CHECKPOINTS) as [CheckpointId, (typeof QUEST_CHECKPOINTS)[CheckpointId]][];
const interactables = Object.values(QUEST_INTERACTABLES);
const ESTABLISHING_POSITION = new Vector3(5.5, 7.5, -43);
const ESTABLISHING_TARGET = new Vector3(0, 4.1, -15);

function interactionAvailable(id: QuestInteractableId, progress: QuestProgress) {
  if (id === 'chest') return !progress.chestOpen;
  if (id === 'gate-lever') return !progress.gateOpen;
  if (id === 'bridge-left' || id === 'bridge-right') return progress.bridgeStep < 2;
  if (id === 'altar') return !progress.beaconLit;
  return progress.beaconLit && !progress.secretFound;
}

function near(feet: Vector3, point: WorldPoint, range: number) {
  return Math.abs(feet.y - point[1]) < .45 && Math.hypot(feet.x - point[0], feet.z - point[2]) <= range;
}

function ExplorerSimulation({
  inputRef, playing, intro, found, progress, sensitivity, onCollect, onFeedback,
  onInteract, onCheckpoint, onActionLabel, onSound, collision,
}: Omit<ExploreSceneProps, 'retry' | 'onReady' | 'onError'> & { collision: CastleCollision }) {
  const { camera, invalidate } = useThree();
  const player = useRef(newExplorer());
  const cameraYaw = useRef(0), cameraPitch = useRef(.31), boom = useRef(3.3);
  const resetSeen = useRef(-1);
  const walkPhase = useRef(0), swing = useRef(0);
  const footstepDistance = useRef(0), nextVaultCheck = useRef(0), vaultAvailable = useRef(false);
  const lastAction = useRef<string | null>(null);
  const establishing = useRef(1);
  const touched = useRef(new Set<RelicId>());
  const guide: GuideParts = {
    body: useRef<Group>(null), leftArm: useRef<Group>(null), rightArm: useRef<Group>(null),
    leftLeg: useRef<Group>(null), rightLeg: useRef<Group>(null),
  };
  const target = useMemo(() => new Vector3(), []);
  const offset = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const collectible = useMemo(() => new Vector3(), []);
  const before = useMemo(() => new Vector3(), []);
  const pickupRay = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const input = inputRef.current;
    input.wake = invalidate;
    invalidate();
    return () => { if (input.wake === invalidate) input.wake = undefined; };
  }, [inputRef, invalidate]);
  useEffect(() => { invalidate(); }, [playing, intro, found, progress, invalidate]);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, .055);
    const input = inputRef.current;
    collision.gateClosed = !progress.gateOpen;
    if (input.reset !== resetSeen.current) {
      resetSeen.current = input.reset;
      const spawn = QUEST_CHECKPOINTS[input.respawn];
      player.current = newExplorer(spawn.position, spawn.yaw);
      cameraYaw.current = spawn.yaw;
      cameraPitch.current = .31;
      boom.current = 3.3;
      footstepDistance.current = 0;
      vaultAvailable.current = false;
      nextVaultCheck.current = 0;
      lastAction.current = null;
      touched.current.clear();
    }
    const state = player.current;
    establishing.current = intro ? 1 : Math.max(0, establishing.current - dt / .65);
    const turning = Number(input.keys.has('KeyQ')) - Number(input.keys.has('KeyR'));
    if (playing) {
      cameraYaw.current += input.lookX * .006 * sensitivity + turning * dt * 1.6;
      cameraPitch.current = MathUtils.clamp(cameraPitch.current + input.lookY * .004 * sensitivity, -.28, .88);
      if (input.recenter) {
        cameraYaw.current = state.yaw;
        cameraPitch.current = .31;
      }
    }
    input.lookX = 0;
    input.lookY = 0;
    input.recenter = false;

    const ahead = Number(isHeld(input, 'forward')) - Number(isHeld(input, 'back')) + input.moveY;
    const across = Number(isHeld(input, 'right')) - Number(isHeld(input, 'left')) + input.moveX;
    const yaw = cameraYaw.current;
    direction.set(Math.sin(yaw) * ahead - Math.cos(yaw) * across, 0, Math.cos(yaw) * ahead + Math.sin(yaw) * across);
    if (direction.lengthSq() > 1) direction.normalize();
    before.copy(state.feet);
    let returned = false;
    const wasAirborne = !state.grounded && state.velocity.y < -1.65;
    if (playing) {
      const action = interactables.find(item => interactionAvailable(item.id, progress) && near(state.feet, item.approach, item.range));
      const respawn = QUEST_CHECKPOINTS[progress.checkpoint];
      if (input.vault && action) onInteract(action.id);
      const feedback = advanceExplorer(state, collision, {
        direction,
        crouch: input.touchCrouch || input.keys.has('KeyC'),
        jump: input.jump,
        vault: input.vault && !action,
        sprint: input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'),
      }, dt, respawn.position, respawn.yaw);
      if (feedback) onFeedback(feedback);
      if (feedback === 'returned') {
        returned = true;
        cameraYaw.current = respawn.yaw;
        cameraPitch.current = .31;
        boom.current = 3.3;
        footstepDistance.current = 0;
      }
      input.jump = false;
      input.vault = false;

      if (state.grounded && !returned) {
        const checkpoint = checkpoints.find(([, spot]) => near(state.feet, spot.position, spot.radius));
        if (checkpoint && checkpoint[0] !== progress.checkpoint) onCheckpoint(checkpoint[0]);
      }
      const active = interactables.find(item => interactionAvailable(item.id, progress) && near(state.feet, item.approach, item.range));
      if (!active && clock.elapsedTime >= nextVaultCheck.current) {
        vaultAvailable.current = canVault(state, collision);
        nextVaultCheck.current = clock.elapsedTime + .095;
      }
      const label = active?.label ?? (vaultAvailable.current && state.grounded && !state.crouched ? 'Vault' : null);
      if (label !== lastAction.current) {
        lastAction.current = label;
        onActionLabel(label);
      }
    }

    const travelled = returned ? 0 : Math.hypot(state.feet.x - before.x, state.feet.z - before.z);
    if (playing && state.grounded) {
      if (wasAirborne && !returned) onSound('land');
      footstepDistance.current += travelled;
      if (footstepDistance.current > (state.crouched ? .8 : .61)) {
        footstepDistance.current = 0;
        onSound('step');
      }
    }
    walkPhase.current += travelled * 10.8;
    const height = state.crouched ? CROUCH_HEIGHT : STAND_HEIGHT;
    const step = state.grounded ? Math.sin(walkPhase.current) * Math.min(.57, travelled / Math.max(dt, .001) * .14) : -.22;
    swing.current += (step - swing.current) * (1 - Math.exp(-dt * 22));
    if (guide.body.current) {
      guide.body.current.position.copy(state.feet);
      guide.body.current.rotation.y = state.yaw;
      guide.body.current.scale.y = height / STAND_HEIGHT;
    }
    if (guide.leftArm.current) guide.leftArm.current.rotation.x = state.vault ? -1.05 : -swing.current;
    if (guide.rightArm.current) guide.rightArm.current.rotation.x = state.vault ? -1.05 : swing.current;
    if (guide.leftLeg.current) guide.leftLeg.current.rotation.x = state.vault ? .38 : swing.current;
    if (guide.rightLeg.current) guide.rightLeg.current.rotation.x = state.vault ? -.46 : -swing.current;

    target.copy(state.feet);
    target.y += height * .77;
    const pitch = cameraPitch.current;
    offset.set(-Math.sin(cameraYaw.current) * Math.cos(pitch), Math.sin(pitch), -Math.cos(cameraYaw.current) * Math.cos(pitch));
    const obstruction = collision.trace(target, offset, 3.3, false, .018);
    const room = obstruction ? Math.max(.12, obstruction.distance - .16) : 3.3;
    boom.current = room < boom.current ? room : boom.current + (room - boom.current) * (1 - Math.exp(-dt * 11));
    camera.position.copy(target).addScaledVector(offset, boom.current);
    const blend = MathUtils.smoothstep(establishing.current, 0, 1);
    camera.position.lerp(ESTABLISHING_POSITION, blend);
    target.lerp(ESTABLISHING_TARGET, blend);
    camera.lookAt(target);
    if (guide.body.current) guide.body.current.visible = boom.current > .38;

    if (playing) {
      target.copy(state.feet);
      target.y += height * .55;
      for (const relic of RELICS) {
        if (!relicAvailable(relic.id, progress) || found.has(relic.id) || touched.current.has(relic.id)) continue;
        if ('minFeet' in relic && state.feet.y < relic.minFeet) continue;
        collectible.set(...relic.position);
        if (Math.hypot(state.feet.x - collectible.x, state.feet.z - collectible.z) > .48 || Math.abs(target.y - collectible.y) > .58) continue;
        pickupRay.subVectors(collectible, target);
        const reach = pickupRay.length();
        if (reach > .05 && collision.trace(target, pickupRay.normalize(), reach - .035)) continue;
        touched.current.add(relic.id);
        onCollect(relic);
        break;
      }
    }

    const drifting = Math.abs(room - boom.current) > .008 || (state.grounded && Math.abs(swing.current) > .008);
    const moving = input.keys.size > 0 || direction.lengthSq() > .0005 || !state.grounded || !!state.vault || state.velocity.lengthSq() > .0005;
    if ((!intro && establishing.current > 0) || drifting || (playing && moving)) invalidate();
  });

  return <ExplorerGuide parts={guide} />;
}

function CastleLevel(props: ExploreSceneProps) {
  const asset = useLoader(GLTFLoader, '/api/castle?v=7b2c0586', configureLoader);
  const castle = useMemo(() => createVisibleCastle(asset.scene), [asset.scene]);
  const [collision, setCollision] = useState<CastleCollision | null>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    let created: CastleCollision | undefined;
    const frame = requestAnimationFrame(() => {
      try {
        created = createCastleCollision(castle.wrapper);
        setCollision(created);
      } catch (error) {
        console.error('Could not prepare the castle terrain', error);
        props.onError();
      }
    });
    return () => { cancelAnimationFrame(frame); created?.dispose(); };
  }, [castle, props.onError]);

  useEffect(() => {
    if (collision) { props.onReady(); invalidate(); }
  }, [collision, invalidate, props.onReady]);
  useEffect(() => () => castle.materials.forEach(material => material.dispose()), [castle]);

  return <>
    <primitive object={castle.wrapper} dispose={null} />
    {EXPLORE_BLOCKS.map((block, index) => <Voxel key={index} position={block.position} size={block.size} color={block.color} />)}
    <QuestScenery found={props.found} progress={props.progress} playing={props.playing} />
    <RelicMarkers found={props.found} progress={props.progress} />
    {collision && <ExplorerSimulation {...props} collision={collision} />}
  </>;
}

function ContextGuard({ onError }: Pick<ExploreSceneProps, 'onError'>) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onError(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onError]);
  return null;
}

class ExploreBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Castle explorer could not load', error); this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function ExploreScene(props: ExploreSceneProps) {
  const [quality, setQuality] = useState<'full' | 'compact' | null>(null);
  useEffect(() => {
    const test = document.createElement('canvas');
    let context: WebGL2RenderingContext | null = null;
    try { context = test.getContext('webgl2'); } catch { /* The parent displays recovery controls. */ }
    if (!context) { props.onError(); return; }
    context.getExtension('WEBGL_lose_context')?.loseContext();
    if (props.retry) useLoader.clear(GLTFLoader, '/api/castle?v=7b2c0586');
    setQuality(matchMedia('(pointer: coarse), (max-width: 750px)').matches ? 'compact' : 'full');
  }, [props.onError, props.retry]);
  if (!quality) return null;

  return <ExploreBoundary onError={props.onError}>
    <Canvas
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      frameloop="demand"
      dpr={quality === 'compact' ? 1 : [1, 1.3]}
      gl={{ antialias: quality === 'full', powerPreference: 'high-performance' }}
      camera={{ position: ESTABLISHING_POSITION, fov: quality === 'compact' ? 76 : 66, near: .045, far: 140 }}
    >
      <color attach="background" args={['#9ec9dd']} />
      <fog attach="fog" args={['#9ec9dd', 62, 131]} />
      <ambientLight intensity={1.05} color="#e4dfcf" />
      <hemisphereLight args={['#d1e7ea', '#536846', 1.4]} />
      <directionalLight position={[18, 40, -25]} intensity={2} color="#ffe4b5" />
      <ContextGuard onError={props.onError} />
      <Suspense fallback={null}><CastleLevel {...props} /></Suspense>
    </Canvas>
  </ExploreBoundary>;
}
