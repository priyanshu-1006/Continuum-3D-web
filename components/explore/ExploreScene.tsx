'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Color, Group, Mesh, Vector3, type Material } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { advanceExplorer, createCastleCollision, CROUCH_HEIGHT, newExplorer, STAND_HEIGHT, type CastleCollision, type ExploreFeedback } from '@/lib/explore-physics';
import { EXPLORE_BLOCKS, RELICS, type Relic, type RelicId } from '@/lib/explore-world';
import type { WorldPoint } from '@/lib/journey';
import { MOVEMENT_KEYS, type ExploreInput, type MoveControl } from './controls';

export type ExploreSceneProps = {
  retry: boolean;
  inputRef: RefObject<ExploreInput>;
  playing: boolean;
  found: ReadonlySet<RelicId>;
  onReady: () => void;
  onError: () => void;
  onCollect: (relic: Relic) => void;
  onFeedback: (feedback: ExploreFeedback) => void;
  onCrouch: (crouched: boolean) => void;
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
  const tone = new Color(1.43, 1.43, 1.43);
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

function RelicMarkers({ found }: { found: ReadonlySet<RelicId> }) {
  return <group>
    {RELICS.filter(relic => !found.has(relic.id)).map(relic => <group key={relic.id} position={relic.position}>
      <mesh rotation={[.12, .6, .18]}>
        <octahedronGeometry args={[.155, 0]} />
        <meshStandardMaterial color={relic.color} emissive={relic.color} emissiveIntensity={.48} roughness={.37} />
      </mesh>
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

type GuideParts = {
  body: RefObject<Group | null>;
  leftArm: RefObject<Group | null>;
  rightArm: RefObject<Group | null>;
  leftLeg: RefObject<Group | null>;
  rightLeg: RefObject<Group | null>;
};

function ExplorerGuide({ parts }: { parts: GuideParts }) {
  return <group ref={parts.body}>
    <Voxel position={[0, .66, 0]} size={[.355, .35, .21]} color="#385f46" />
    <Voxel position={[0, .49, 0]} size={[.36, .057, .22]} color="#262f27" />
    <Voxel position={[0, .65, -.152]} size={[.277, .29, .12]} color="#304138" />
    <Voxel position={[0, .68, -.22]} size={[.114, .106, .016]} color="#cfdf85" />
    <Voxel position={[.209, .56, .01]} size={[.13, .15, .17]} color="#9a7248" />
    <Voxel position={[0, 1.003, 0]} size={[.287, .29, .284]} color="#c3916a" />
    <Voxel position={[0, 1.13, -.012]} size={[.304, .087, .304]} color="#2f2e26" />
    <Voxel position={[0, 1.045, -.133]} size={[.303, .15, .043]} color="#2f2e26" />
    <Voxel position={[-.059, 1.01, .146]} size={[.032, .034, .014]} color="#242f29" />
    <Voxel position={[.059, 1.01, .146]} size={[.032, .034, .014]} color="#242f29" />
    {[parts.leftArm, parts.rightArm].map((ref, index) => <group key={index} ref={ref} position={[index ? -.215 : .215, .79, 0]}>
      <Voxel position={[0, -.16, 0]} size={[.127, .32, .16]} color="#31583e" />
      <Voxel position={[0, -.347, 0]} size={[.12, .075, .15]} color="#c3916a" />
    </group>)}
    {[parts.leftLeg, parts.rightLeg].map((ref, index) => <group key={index} ref={ref} position={[index ? -.097 : .097, .47, 0]}>
      <Voxel position={[0, -.188, 0]} size={[.145, .376, .16]} color="#424941" />
      <Voxel position={[0, -.417, .024]} size={[.15, .105, .222]} color="#3c3329" />
    </group>)}
  </group>;
}

function isHeld(input: ExploreInput, direction: MoveControl) {
  return input.touch.has(direction) || MOVEMENT_KEYS[direction].some(key => input.keys.has(key));
}

function ExplorerSimulation({ inputRef, playing, found, onCollect, onFeedback, onCrouch, collision }: Omit<ExploreSceneProps, 'retry' | 'onReady' | 'onError'> & { collision: CastleCollision }) {
  const { camera, invalidate } = useThree();
  const player = useRef(newExplorer());
  const cameraYaw = useRef(0), cameraPitch = useRef(.31), boom = useRef(3.3);
  const resetSeen = useRef(inputRef.current.reset);
  const previousCrouch = useRef(false), walkPhase = useRef(0), swing = useRef(0);
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
  useEffect(() => { invalidate(); }, [playing, found, invalidate]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, .055);
    const input = inputRef.current;
    if (input.reset !== resetSeen.current) {
      resetSeen.current = input.reset;
      player.current = newExplorer();
      cameraYaw.current = 0;
      cameraPitch.current = .31;
      boom.current = 3.3;
      touched.current.clear();
    }
    const state = player.current;
    const turning = Number(input.keys.has('KeyQ')) - Number(input.keys.has('KeyR'));
    if (playing) {
      cameraYaw.current += input.lookX * .006 + turning * dt * 1.6;
      cameraPitch.current = Math.max(.13, Math.min(.9, cameraPitch.current + input.lookY * .004));
    }
    input.lookX = 0;
    input.lookY = 0;

    const ahead = Number(isHeld(input, 'forward')) - Number(isHeld(input, 'back'));
    const across = Number(isHeld(input, 'right')) - Number(isHeld(input, 'left'));
    const yaw = cameraYaw.current;
    direction.set(Math.sin(yaw) * ahead - Math.cos(yaw) * across, 0, Math.cos(yaw) * ahead + Math.sin(yaw) * across);
    if (direction.lengthSq() > 1) direction.normalize();
    before.copy(state.feet);
    if (playing) {
      const feedback = advanceExplorer(state, collision, {
        direction,
        crouch: input.touchCrouch || input.keys.has('KeyC'),
        jump: input.jump,
        vault: input.vault,
      }, dt);
      if (feedback) onFeedback(feedback);
      if (feedback === 'returned') { cameraYaw.current = 0; cameraPitch.current = .31; boom.current = 3.3; }
      if (state.crouched !== previousCrouch.current) {
        previousCrouch.current = state.crouched;
        onCrouch(state.crouched);
      }
      input.jump = false;
      input.vault = false;
    }

    const travelled = Math.hypot(state.feet.x - before.x, state.feet.z - before.z);
    walkPhase.current += travelled * 10.8;
    const height = state.crouched ? CROUCH_HEIGHT : STAND_HEIGHT;
    const step = Math.sin(walkPhase.current) * Math.min(.45, travelled / Math.max(dt, .001) * .14);
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
    camera.lookAt(target);
    if (guide.body.current) guide.body.current.visible = boom.current > .38;

    if (playing) {
      target.copy(state.feet);
      target.y += height * .55;
      for (const relic of RELICS) {
        if (found.has(relic.id) || touched.current.has(relic.id)) continue;
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

    const drifting = Math.abs(room - boom.current) > .008 || Math.abs(swing.current) > .008;
    const moving = input.keys.size > 0 || input.touch.size > 0 || !state.grounded || !!state.vault || state.velocity.lengthSq() > .0005;
    if (drifting || (playing && moving)) invalidate();
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
    <RelicMarkers found={props.found} />
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
      camera={{ position: [0, 1.97, -29.4], fov: quality === 'compact' ? 76 : 66, near: .045, far: 140 }}
      fallback={<p>This browser could not open the castle.</p>}
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
