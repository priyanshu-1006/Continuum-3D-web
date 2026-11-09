'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { AnimationMixer, Box3, Color, Group, InstancedMesh, MathUtils, Object3D, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { PORTCULLIS, QUEST_INTERACTABLES as OBJECTS, RELICS, type RelicId } from '@/lib/explore-world';
import type { QuestProgress } from '@/lib/explore-progress';
import type { WorldPoint } from '@/lib/journey';

const MODELS = [
  'treasure-chest', 'lever', 'portcullis', 'crystal-altar', 'brazier', 'barrel',
  'cart', 'stall-red', 'lantern', 'flag-banner-long', 'animal-cat',
].map(name => '/assets/explore/' + name + '.glb');
const NATURE = ['tree-4', 'tree-7', 'bush-1', 'stone-3'].map(name => '/assets/models/nature/' + name + '.glb');

function Prop({ asset, position, height, width, yaw = 0, pose, loop }: {
  asset: GLTF; position: WorldPoint; height: number; width?: number; yaw?: number; pose?: number; loop?: string;
}) {
  const { scene, mixer, offset, scale } = useMemo(() => {
    const scene = clone(asset.scene);
    const bounds = new Box3().setFromObject(scene);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const factor = height / Math.max(size.y, .001);
    return {
      scene, mixer: new AnimationMixer(scene),
      offset: [-center.x, -bounds.min.y, -center.z] as WorldPoint,
      scale: [width ? width / Math.max(size.x, .001) : factor, factor, factor] as WorldPoint,
    };
  }, [asset, height, width]);
  const invalidate = useThree(state => state.invalidate);
  const time = useRef(pose ?? 0);
  const clip = loop ? asset.animations.find(item => item.name === loop) : pose !== undefined ? asset.animations[0] : undefined;

  useEffect(() => {
    if (!clip) return;
    const action = mixer.clipAction(clip).play();
    if (pose !== undefined) action.paused = true;
    invalidate();
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(scene); };
    // The selected clip stays mounted while its target pose changes.
  }, [clip, mixer, scene, invalidate, loop]);

  useFrame((_, delta) => {
    if (!clip) return;
    if (pose === undefined) { mixer.update(Math.min(delta, .05)); return; }
    time.current = MathUtils.damp(time.current, pose, 10, Math.min(delta, .055));
    if (Math.abs(time.current - pose) < .012) time.current = pose;
    else invalidate();
    mixer.clipAction(clip).time = time.current;
    mixer.update(0);
  });

  return <group position={position} rotation-y={yaw} scale={scale}>
    <group position={offset}><primitive object={scene} dispose={null} /></group>
  </group>;
}

function Tile({ position, size, color, glow = false }: { position: WorldPoint; size: WorldPoint; color: string; glow?: boolean }) {
  return <mesh position={position}>
    <boxGeometry args={size} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshStandardMaterial color={color} roughness={.94} />}
  </mesh>;
}

const TREES: [WorldPoint, number][] = [
  [[-7, 0, -31], 4.6], [[7.5, 0, -32.5], 4.9], [[-12, 0, -29.8], 5.1],
  [[11, 0, -27.5], 3.6], [[-18, 0, -34], 4.6], [[18.8, 0, -36], 5.8],
  [[-27, 0, -28.5], 4.8], [[29, 0, -28], 4.8], [[31.7, 0, -12], 4.5],
  [[-31.4, 0, -8], 4.7], [[-31, 0, 17], 4], [[32, 0, 15.5], 4.8],
];
const STONES: WorldPoint[] = [[-5.3, 0, -30.7], [6.5, 0, -33], [-9, 0, -27], [11, 0, -34]];
const SHRUBS: WorldPoint[] = [[-6.7, 0, -29.1], [6.8, 0, -31.2], [9.6, 0, -28.2], [-9.4, 0, -33.1], [-12, 0, -25.6], [15, 0, -30]];
const PATH_TONES = ['#a49878', '#baad8e', '#c3b699', '#8f8a72', '#b3a37d'];
const PATH_TILES = Array.from({ length: 63 }, (_, index) => {
  const row = Math.floor(index / 3);
  return {
    position: [((index % 3) - 1) * .47 + ((row % 2) - .5) * .08, .001, -38.8 + row * .72] as WorldPoint,
    size: [.45, .012, .69] as WorldPoint,
    color: PATH_TONES[(row * 3 + index) % PATH_TONES.length],
  };
});
const GROUNDCOVER = Array.from({ length: 58 }, (_, index) => {
  const side = index % 2 ? 1 : -1;
  const x = side * (2.2 + (index * 19 % 69) / 12);
  const z = -39 + (index * 47 % 163) / 11.7;
  return {
    position: [x, .004, z] as WorldPoint,
    size: [.29 + index % 4 * .19, .008, .31 + index % 3 * .19] as WorldPoint,
    color: ['#7f9851', '#8ea557', '#94ab5e', '#6d8c4e'][index % 4],
  };
});
const APPROACH_TILES = [...PATH_TILES, ...GROUNDCOVER];

function ApproachTiles() {
  const tiles = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = tiles.current;
    if (!mesh) return;
    const transform = new Object3D();
    const color = new Color();
    APPROACH_TILES.forEach((tile, index) => {
      transform.position.set(...tile.position);
      transform.scale.set(...tile.size);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.set(tile.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);
  return <instancedMesh ref={tiles} args={[undefined, undefined, APPROACH_TILES.length]}>
    <boxGeometry />
    <meshStandardMaterial roughness={.94} />
  </instancedMesh>;
}

function SecretNiche({ banner, lit, opened }: { banner: GLTF; lit: boolean; opened: boolean }) {
  const shutter = useRef<Group>(null);
  const lift = useRef(opened ? .86 : 0);
  useFrame(({ invalidate }, dt) => {
    const target = opened ? .86 : 0;
    lift.current = MathUtils.damp(lift.current, target, 9, Math.min(dt, .05));
    if (Math.abs(lift.current - target) < .008) lift.current = target;
    else invalidate();
    if (shutter.current) shutter.current.position.y = lift.current;
  });
  return <group position={OBJECTS.secret.position}>
    <Tile position={[.32, .02, 0]} size={[.45, .21, .82]} color="#6e6d65" />
    <Tile position={[.5, .47, 0]} size={[.18, .79, .74]} color="#615f56" />
    {[-.37, .37].map(z => <Tile key={z} position={[.3, .44, z]} size={[.43, .78, .16]} color="#969581" />)}
    <Tile position={[.3, .88, 0]} size={[.48, .17, .88]} color="#a6a28c" />
    <Tile position={[0, 0, 0]} size={[.22, .2, .24]} color={opened ? '#ffdf7d' : lit ? '#9ae5df' : '#514f45'} glow={lit} />
    <group ref={shutter}>
      <Tile position={[.08, .45, 0]} size={[.115, .72, .59]} color="#817e70" />
      <Tile position={[.015, .48, 0]} size={[.035, .2, .23]} color="#a7a18b" />
    </group>
    {opened && <Prop asset={banner} position={[.22, .14, 0]} height={.63} width={.48} yaw={-Math.PI / 2} />}
  </group>;
}

function Beacon({ lit }: { lit: boolean }) {
  const rising = useRef<Group>(null);
  const sparks = useRef<Group>(null);
  const amount = useRef(0);
  useFrame(({ invalidate }, delta) => {
    if (!lit) { amount.current = 0; return; }
    amount.current = Math.min(amount.current + Math.min(delta, .055) / 2.4, 1);
    const eased = 1 - (1 - amount.current) ** 3;
    if (rising.current) rising.current.scale.y = Math.max(.001, eased);
    if (sparks.current) sparks.current.rotation.y = eased * Math.PI * 1.25;
    if (amount.current < 1) invalidate();
  });
  if (!lit) return null;
  return <group position={OBJECTS.altar.position}>
    <group ref={rising} position-y={.84} scale-y={.001}>
      <mesh position-y={11}>
        <boxGeometry args={[.48, 22, .48]} />
        <meshBasicMaterial color="#ffd977" transparent opacity={.19} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position-y={11}>
        <boxGeometry args={[.14, 22, .14]} />
        <meshBasicMaterial color="#fff4bc" transparent opacity={.8} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={sparks}>
        {Array.from({ length: 13 }, (_, index) => (
          <Tile key={index} position={[Math.sin(index * 1.7) * .6, .35 + index * 1.21, Math.cos(index * 1.7) * .6]} size={[.083, .083, .083]} color={index % 2 ? '#fff5bb' : '#8af7ed'} glow />
        ))}
      </group>
    </group>
    <pointLight position={[0, 2.6, 0]} color="#ffe199" distance={10} intensity={30} />
  </group>;
}

export default function QuestScenery({ found, progress, playing }: { found: ReadonlySet<RelicId>; progress: QuestProgress; playing: boolean }) {
  const [chest, lever, gate, altar, brazier, barrel, cart, stall, lantern, banner, cat] = useLoader(GLTFLoader, MODELS);
  const [oak, spruce, bush, rock] = useLoader(GLTFLoader, NATURE);

  return <group>
    <ApproachTiles />
    {TREES.map(([position, height], index) => <Prop key={index} asset={index % 3 === 0 ? spruce : oak} position={position} height={height} yaw={index * .8} />)}
    {SHRUBS.map((position, index) => <Prop key={index} asset={bush} position={position} height={.44 + index % 3 * .14} yaw={index} />)}
    {STONES.map((position, index) => <Prop key={index} asset={rock} position={position} height={.31 + index * .045} yaw={index} />)}
    <Prop asset={stall} position={[8.6, 0, -29.3]} height={2.8} yaw={-.42} />
    <Prop asset={cart} position={[-7.7, 0, -27.5]} height={1.08} yaw={.55} />
    <Prop asset={barrel} position={[-6.5, 0, -27.3]} height={.72} />
    <Prop asset={barrel} position={[7.1, 0, -28.1]} height={.63} />
    <Prop asset={cat} position={[4.4, 0, -26.6]} height={.44} yaw={-.8} loop={playing ? 'idle' : 'static'} />
    {([-1, 1] as const).map(side => <group key={side}>
      <Tile position={[side * 2.06, .77, -30.7]} size={[.17, 1.54, .17]} color="#68503a" />
      <Tile position={[side * 1.82, 1.51, -30.7]} size={[.52, .13, .15]} color="#836045" />
      <Prop asset={lantern} position={[side * 1.65, 1.1, -30.7]} height={.34} />
      <Tile position={[side * 1.65, 1.23, -30.7]} size={[.105, .12, .105]} color="#ffcb71" glow />
      <Prop asset={brazier} position={[side * 1.64, 0, -25.9]} height={.86} loop={playing ? 'smoulder_loop' : undefined} />
      <Prop asset={banner} position={[side * 2.1, 1.44, -24.68]} height={1.52} yaw={Math.PI} />
    </group>)}
    {found.has('sunstone') && [-28.3, -26.9, -25.55, -24.25].map(z => <group key={z}>
      <Tile position={[-1.06, .04, z]} size={[.16, .08, .37]} color="#ffd58b" glow />
      <Tile position={[1.06, .04, z]} size={[.16, .08, .37]} color="#ffd58b" glow />
    </group>)}

    <Prop asset={chest} position={OBJECTS.chest.position} height={.61} pose={progress.chestOpen ? 2.2 : 0} />
    {progress.chestOpen && <Tile position={[5.05, .48, -28.39]} size={[.29, .026, .2]} color="#fff0b5" glow />}
    <Tile position={[1.23, .32, -24.8]} size={[.44, .64, .44]} color="#9a9278" />
    <Prop asset={lever} position={OBJECTS['gate-lever'].position} height={.43} pose={progress.gateOpen ? 1.5 : 0} yaw={Math.PI / 2} />
    <Prop asset={gate} position={PORTCULLIS.position} height={1.62} width={1.48} pose={progress.gateOpen ? 4.55 : 0} />
    {(['bridge-left', 'bridge-right'] as const).map((id, index) => {
      const [x, y, z] = OBJECTS[id].position;
      const on = progress.bridgeStep > index;
      return <group key={id}>
        <Prop asset={lever} position={[x, y, z]} height={.41} pose={on ? 1.5 : 0} yaw={index ? -Math.PI / 2 : Math.PI / 2} />
        <Tile position={[x, y + .016, z - .21]} size={[.18, .1, .14]} color={index ? '#8cceff' : '#ffc864'} glow={on} />
        {on && Array.from({ length: 6 }, (_, tile) => (
          <Tile key={tile} position={[Math.sign(x) * .46, .035, z + tile * .44]} size={[.065, .035, .35]} color={index ? '#a4e7ff' : '#ffcb73'} glow />
        ))}
      </group>;
    })}
    <Prop asset={altar} position={OBJECTS.altar.position} height={1.29} loop={progress.beaconLit ? 'idle_loop' : undefined} />
    {RELICS.map(({ id, color }, index) => <Tile key={id}
      position={[OBJECTS.altar.position[0] + Math.sin(index * Math.PI * .4) * .55, .04, OBJECTS.altar.position[2] + Math.cos(index * Math.PI * .4) * .55]}
      size={[.13, .075, .13]} color={found.has(id) ? color : '#706859'} glow={found.has(id)}
    />)}
    <Beacon lit={progress.beaconLit} />
    <SecretNiche banner={banner} lit={progress.beaconLit} opened={progress.secretFound} />
  </group>;
}
