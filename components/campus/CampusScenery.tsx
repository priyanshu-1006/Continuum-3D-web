'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { AnimationMixer, Box3, CanvasTexture, Color, Group, InstancedMesh, Object3D, SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import {
  CAMPUS_BLOCKS, CAMPUS_DESKS, CAMPUS_DISCOVERIES, CAMPUS_FOUNTAIN, CAMPUS_PALMS, CAMPUS_RAMPS, CAMPUS_ROOMS, CAMPUS_SHELVES, CAMPUS_STREET_HOUSES,
  type CampusBlock, type CampusDiscoveryId, type CampusRoom,
} from '@/lib/campus-world';
import type { WorldPoint } from '@/lib/journey';

const ASSETS = {
  houseA: '/assets/campus/building-sample-house-a.glb',
  houseB: '/assets/campus/building-sample-house-b.glb',
  houseC: '/assets/campus/building-sample-house-c.glb',
  desk: '/assets/campus/desk.glb',
  chair: '/assets/campus/chairDesk.glb',
  monitor: '/assets/campus/computerScreen.glb',
  shelf: '/assets/campus/bookcaseOpen.glb',
  books: '/assets/campus/books.glb',
  bench: '/assets/campus/bench.glb',
  fountain: '/assets/campus/fountain-round.glb',
  spout: '/assets/campus/fountain-center.glb',
  stall: '/assets/campus/stall-red.glb',
  cart: '/assets/campus/cart.glb',
  lantern: '/assets/campus/lantern.glb',
  banner: '/assets/campus/flag-banner-long.glb',
  tower: '/assets/campus/tower-square-roof.glb',
  studentA: '/assets/campus/character-a.glb',
  studentE: '/assets/campus/character-e.glb',
  tree: '/assets/models/nature/tree-1.glb',
  bush: '/assets/models/nature/bush-1.glb',
};
const ASSET_KEYS = Object.keys(ASSETS) as (keyof typeof ASSETS)[];
const MODEL_PATHS = ASSET_KEYS.map(key => ASSETS[key]);

function SceneProp({ source, position, height, width, depth, yaw = 0 }: {
  source: GLTF; position: WorldPoint; height: number; width?: number; depth?: number; yaw?: number;
}) {
  const { model, offset, scale } = useMemo(() => {
    const model = clone(source.scene);
    const bounds = new Box3().setFromObject(model);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const factor = height / Math.max(size.y, .001);
    const offset: WorldPoint = [-center.x, -bounds.min.y, -center.z];
    const scale: WorldPoint = [width === undefined ? factor : width / Math.max(size.x, .001), factor, depth === undefined ? factor : depth / Math.max(size.z, .001)];
    return { model, offset, scale };
  }, [source, height, width, depth]);
  return <group position={position} rotation-y={yaw} scale={scale}>
    <group position={offset}><primitive object={model} dispose={null} /></group>
  </group>;
}

function Box({ position, size, color, glow = false }: Pick<CampusBlock, 'position' | 'size' | 'color'> & { glow?: boolean }) {
  return <mesh position={position}>
    <boxGeometry args={size} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshStandardMaterial color={color} roughness={.92} />}
  </mesh>;
}

function BlockBatch({ blocks }: { blocks: CampusBlock[] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new Object3D();
    const color = new Color();
    blocks.forEach((block, i) => {
      transform.position.set(...block.position);
      transform.scale.set(...block.size);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      mesh.setColorAt(i, color.set(block.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks]);
  return <instancedMesh ref={ref} args={[undefined, undefined, blocks.length]}>
    <boxGeometry />
    <meshStandardMaterial roughness={.94} />
  </instancedMesh>;
}

function Plaque({ title, detail, position, width, height = .72, tint = '#27484c', yaw = Math.PI }: {
  title: string; detail?: string; position: WorldPoint; width: number; height?: number; tint?: string; yaw?: number;
}) {
  const texture = useMemo(() => {
    const surface = document.createElement('canvas');
    surface.width = 1024;
    surface.height = 210;
    const ctx = surface.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f6da9f';
      ctx.fillRect(0, 0, 1024, 210);
      ctx.fillStyle = tint;
      ctx.fillRect(11, 11, 1002, 188);
      ctx.strokeStyle = '#f2d699';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, 976, 162);
      ctx.fillStyle = '#fff6e3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 54px Georgia, serif';
      ctx.fillText(title, 512, detail ? 86 : 108, 916);
      if (detail) {
        ctx.font = '600 28px system-ui, sans-serif';
        ctx.fillStyle = '#f0dfbe';
        ctx.fillText(detail, 512, 147, 916);
      }
    }
    const result = new CanvasTexture(surface);
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 4;
    return result;
  }, [title, detail, tint]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation-y={yaw}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

const FACADE_STYLES = [
  { background: '#29576b', glass: '#78a9ab', reflection: '#c7dad0' },
  { background: '#51495b', glass: '#a69498', reflection: '#e5d1ac' },
];
function RoomFacade({ room }: { room: CampusRoom }) {
  const { x, z, depth, width, wall, accent } = room;
  const front = z - depth / 2;
  const glass = FACADE_STYLES[room.id === 'admin' || room.id === 'library' ? 1 : 0];
  return <group>
    {[-1, 1].flatMap(side => [1.98, 3.25].map((offset, i) => {
      const wx = x + side * offset;
      return <group key={String(side) + i}>
        <Box position={[wx, 1.63, front - .198]} size={[.98, 1.25, .08]} color="#f6e1bc" />
        <Box position={[wx, 1.65, front - .251]} size={[.79, 1.05, .04]} color={glass.background} />
        <Box position={[wx, 1.73, front - .278]} size={[.71, .89, .022]} color={glass.glass} />
        <Box position={[wx, 1.69, front - .298]} size={[.055, .94, .022]} color={wall} />
        <Box position={[wx, 1.75, front - .298]} size={[.74, .046, .021]} color={wall} />
        <Box position={[wx + .13, 1.95, front - .302]} size={[.14, .18, .018]} color={glass.reflection} />
        <Box position={[wx, 1.065, front - .285]} size={[1.02, .11, .25]} color={accent} />
      </group>;
    }))}
    <Box position={[x, .29, front - .182]} size={[width, .17, .04]} color={accent} />
    <Box position={[x, 3.2, front - .32]} size={[width + .5, .14, .28]} color="#f7dcb2" />
    <Box position={[x, 2.39, front - .48]} size={[3.22, .15, 1.21]} color={accent} />
    <Box position={[x, 2.32, front - 1.04]} size={[3.22, .16, .19]} color="#f5d4a4" />
    {[-1.31, 1.31].map(offset => <group key={offset}>
      <Box position={[x + offset, 1.11, front - .76]} size={[.12, 2.22, .12]} color={accent} />
      <Box position={[x + offset, .11, front - .76]} size={[.28, .22, .28]} color="#e8c99b" />
    </group>)}
    <Plaque title={room.name} detail={room.subtitle} position={[x, 2.779, front - .354]} width={4.35} height={.58} tint={accent} />
    <Box position={[x, .013, front + 1.9]} size={[1.8, .015, 3.05]} color={accent} />
    <Box position={[x, 2.96, z]} size={[2.7, .06, .25]} color="#fff0c6" glow />
    <Box position={[x, .03, front - .31]} size={[2.3, .035, .48]} color="#ead8b2" />
    <Box position={[x - width / 2 - .177, 1.62, z - .85]} size={[.07, 1.18, 2.4]} color="#f5e2bd" />
    <Box position={[x - width / 2 - .226, 1.64, z - .85]} size={[.045, .92, 2.15]} color={glass.glass} />
    <Box position={[x + width / 2 + .177, 1.62, z - .85]} size={[.07, 1.18, 2.4]} color="#f5e2bd" />
    <Box position={[x + width / 2 + .226, 1.64, z - .85]} size={[.045, .92, 2.15]} color={glass.glass} />
  </group>;
}

const trim = (position: WorldPoint, size: WorldPoint, color: string): CampusBlock => ({ position, size, color });
const PALM_GREENS = ['#699844', '#78a046', '#9fb04e', '#588842'];
const PALM_BLOCKS = CAMPUS_PALMS.flatMap(({ position: [x, , z], scale }, i) => {
  const topX = x + (i % 2 ? .18 : -.18);
  const head = 4.1 * scale;
  return [
    trim([x, .13, z], [.72, .25, .72], '#c49f74'),
    ...Array.from({ length: 11 }, (_, j) => trim(
      [x + (topX - x) * j / 11, (.33 + j * .34) * scale, z],
      [.31 - j * .006, .39 * scale, .31 - j * .006], ['#9c704b', '#a98259', '#b28d66'][j % 3],
    )),
    trim([topX, head, z], [.55, .38, .55], '#739d43'),
    ...Array.from({ length: 8 }, (_, leaf) => {
      const angle = leaf * Math.PI / 4 + i * .21;
      return Array.from({ length: 4 }, (_, n) => {
        const distance = (.32 + n * .32) * scale;
        return trim([topX + Math.cos(angle) * distance, head + (.20 - n * .1 + (leaf % 2) * .08) * scale, z + Math.sin(angle) * distance],
          [.49 * scale, .18 * scale, .49 * scale], PALM_GREENS[(leaf + n) % PALM_GREENS.length]);
      });
    }).flat(),
  ];
});

const ROAD_DETAILS = [
  ...Array.from({ length: 8 }, (_, i) => trim([0, .018, -21 + i * 1.95], [.08, .015, .85], '#ead6a6')),
  ...Array.from({ length: 8 }, (_, i) => trim([-2.24 + i * .64, .018, -3.85], [.36, .015, 1.26], '#f0e4c8')),
  ...[-1, 1].flatMap(side => Array.from({ length: 11 }, (_, i) => trim([side * 2.84, .02, -20.2 + i * 1.9], [.12, .035, 1.73], i % 2 ? '#d7b879' : '#b59b78'))),
  ...[-1, 1].flatMap(side => Array.from({ length: 26 }, (_, i) => trim([side * 2.93, .018, 1.2 + i * 1.46], [.13, .025, 1.24], i % 2 ? '#d5a961' : '#685649'))),
  ...Array.from({ length: 11 }, (_, i) => trim([-4.62 + i * .92, .019, 38.5], [.33, .018, 3.48], '#ddcca9')),
];

const GARDEN_BEDS = [[-6.5, 3.1], [6.5, 3.1], [-5.1, 17.9], [5.1, 17.9], [-14.5, 19.4], [14.5, 19.4], [-3.5, 39.2], [3.5, 39.2]];
const GARDEN_BLOCKS = GARDEN_BEDS.flatMap(([x, z], i) => [
  trim([x, .075, z], [2, .15, .82], '#c9af82'),
  trim([x, .152, z], [1.78, .08, .6], '#7e8657'),
  ...Array.from({ length: 6 }, (_, j) => {
    const dx = (j - 2.5) * .26;
    return [
      trim([x + dx, .255, z + (j % 2 ? .11 : -.08)], [.067, .22, .067], '#5c8244'),
      trim([x + dx, .397 + j % 3 * .02, z + (j % 2 ? .11 : -.08)], [.17, .13, .16],
        ['#efb377', '#f1cf73', '#d88c80', '#fff1b6', '#a7c6cf', '#f1d892'][(j + i) % 6]),
    ];
  }).flat(),
]);

const KEEP_DETAIL = [
  ...[-1, 1].flatMap(side => [43.75, 53.15].flatMap(z => [
    trim([side * 5.7, 2.1, z - 1.2], [2.43, .16, .11], '#9a6952'),
    trim([side * 5.7, 3.09, z - 1.23], [.39, .87, .095], '#594b49'),
    trim([side * 5.7, 3.11, z - 1.285], [.21, .58, .03], '#ffcc83'),
    trim([side * 5.7, .65, z - 1.2], [2.47, .28, .11], '#e5ca9e'),
  ])),
  ...Array.from({ length: 7 }, (_, i) => {
    const x = -4.8 + i * 1.6;
    return [
      trim([x, 3.14, 42.7], [.63, .39, .46], '#e7cd9d'),
      trim([x, 3.14, 54.2], [.63, .39, .46], '#e7cd9d'),
    ];
  }).flat(),
  ...[-1, 1].flatMap(side => [2.1, 3.72].map(x => trim([side * x, 1.46, 42.456], [.63, .95, .08], '#b9a17f'))),
  ...Array.from({ length: 8 }, (_, i) => trim([8.66, .26 + i * .30, 41.55 + i], [.16, .49, .16], '#d1b68c')),
];

const DECORATION = [...PALM_BLOCKS, ...ROAD_DETAILS, ...GARDEN_BLOCKS, ...KEEP_DETAIL];
const OUTER_TREES: WorldPoint[] = [
  [-11.4, 0, -17], [11.7, 0, -19], [-20.5, 0, -13.5], [20.2, 0, -13.5],
  [-18, 0, 7], [19, 0, 11], [-20, 0, 18], [17.2, 0, 21],
  [-20.3, 0, 26], [16.5, 0, 32], [-20.5, 0, 36], [20, 0, 40],
  [-15.1, 0, 41], [-17.8, 0, 41.9], [-21.2, 0, 43.1], [-22.9, 0, 46.4],
  [-18.8, 0, 47.3], [-14.4, 0, 47.6], [-22.1, 0, 53.6], [-17, 0, 54.8], [17.6, 0, 53],
];

function Student({ source, position, yaw, playing }: { source: GLTF; position: WorldPoint; yaw: number; playing: boolean }) {
  const invalidate = useThree(state => state.invalidate);
  const { model, mixer, offset, scale } = useMemo(() => {
    const model = clone(source.scene);
    const bounds = new Box3().setFromObject(model);
    const center = bounds.getCenter(new Vector3());
    const offset: WorldPoint = [-center.x, -bounds.min.y, -center.z];
    return { model, mixer: new AnimationMixer(model), offset, scale: 1.3 / Math.max(.01, bounds.max.y - bounds.min.y) };
  }, [source]);
  const anchor = useRef<Group>(null);
  useEffect(() => {
    const idle = source.animations.find(animation => animation.name === 'idle');
    if (!idle) return;
    mixer.clipAction(idle).play();
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(model); };
  }, [model, mixer, source]);
  useFrame(({ camera }, delta) => {
    if (!playing || !anchor.current || camera.position.distanceToSquared(anchor.current.position) > 144) return;
    mixer.update(Math.min(delta, .04));
    invalidate();
  });
  return <group ref={anchor} position={position} rotation-y={yaw} scale={scale}>
    <group position={offset}><primitive object={model} dispose={null} /></group>
  </group>;
}

function DiscoverySignals({ collected, beaconLit }: { collected?: ReadonlySet<CampusDiscoveryId>; beaconLit: boolean }) {
  return <group>{CAMPUS_DISCOVERIES.filter(item => item.id !== 'gate' && item.id !== 'secret').map(item => {
    const discovered = collected?.has(item.id);
    const marker: WorldPoint = [item.position[0], item.position[1] + .22, item.position[2] - .04];
    return <group key={item.id} position={marker}>
      <mesh rotation={[.2, .6, .2]}>
        <octahedronGeometry args={[.148, 0]} />
        <meshBasicMaterial color={discovered ? '#fff0cb' : item.accent} toneMapped={false} />
      </mesh>
      {!discovered && <mesh rotation={[0, Math.PI, 0]}>
        <ringGeometry args={[.19, .205, 4]} />
        <meshBasicMaterial color={item.accent} transparent opacity={.88} toneMapped={false} />
      </mesh>}
      {item.id === 'keep' && beaconLit && <mesh position-y={5}>
        <cylinderGeometry args={[.37, .13, 10, 8, 1, true]} />
        <meshBasicMaterial color="#ffe1a0" transparent opacity={.32} depthWrite={false} toneMapped={false} />
      </mesh>}
    </group>;
  })}</group>;
}

const POSTERS = [
  { url: '/assets/posters/neural-nexsus.webp', position: [7.22, 1.79, 14.251] as WorldPoint },
  { url: '/assets/posters/promptx.webp', position: [10.8, 1.79, 26.251] as WorldPoint },
  { url: '/assets/posters/redstone-rush.webp', position: [7.18, 1.88, 36.751] as WorldPoint },
  { url: '/assets/posters/nexathon.webp', position: [10.85, 1.88, 36.751] as WorldPoint },
  { url: '/assets/posters/battleforge.webp', position: [-9, 1.84, 37.504] as WorldPoint },
];
const POSTER_PATHS = [...POSTERS.map(poster => poster.url), '/continuum/people/vice-chancellor.webp'];

const INTERIOR_FINISHES: CampusBlock[] = CAMPUS_ROOMS.flatMap(room => {
  const { x, z, width, depth, accent } = room;
  const side = width / 2 - .175;
  return [
    { position: [x, .17, z + depth / 2 - .175], size: [width - .32, .3, .05], color: accent },
    { position: [x - side, .17, z], size: [.05, .3, depth - .32], color: accent },
    { position: [x + side, .17, z], size: [.05, .3, depth - .32], color: accent },
    { position: [x, 3.077, z], size: [width - .35, .05, depth - .37], color: '#ead8bc' },
    { position: [x - 1.8, 3.03, z], size: [.36, .09, 1.68], color: '#fff1c4' },
    { position: [x + 1.8, 3.03, z], size: [.36, .09, 1.68], color: '#fff1c4' },
  ];
});

export default function CampusScenery({ collected, playing = false, beaconLit = false }: {
  collected?: ReadonlySet<CampusDiscoveryId>; playing?: boolean; beaconLit?: boolean;
}) {
  const models = useLoader(GLTFLoader, MODEL_PATHS);
  const assets = Object.fromEntries<GLTF>(ASSET_KEYS.map((key, i) => [key, models[i]])) as Record<keyof typeof ASSETS, GLTF>;
  const posters = useLoader(TextureLoader, POSTER_PATHS);
  useEffect(() => {
    for (const texture of posters) { texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4; texture.needsUpdate = true; }
  }, [posters]);
  const keepLit = beaconLit || Boolean(collected?.has('keep'));
  return <group>
    <BlockBatch blocks={CAMPUS_BLOCKS} />
    <BlockBatch blocks={DECORATION} />
    <BlockBatch blocks={INTERIOR_FINISHES} />
    {CAMPUS_RAMPS.map((ramp, i) => <mesh key={i} position={ramp.position} rotation={ramp.rotation}>
      <boxGeometry args={ramp.size} /><meshStandardMaterial color="#c8ad80" roughness={.9} />
    </mesh>)}
    {CAMPUS_ROOMS.map(room => <RoomFacade key={room.id} room={room} />)}
    {CAMPUS_STREET_HOUSES.map(({ asset, position, height, width, depth, yaw }, i) => <SceneProp key={i} source={assets[asset]} position={position} height={height} width={width} depth={depth} yaw={yaw} />)}
    {OUTER_TREES.map((position, i) => <SceneProp key={i} source={assets.tree} position={position} height={3.25 + i % 4 * .47} yaw={i * 1.19} />)}
    {GARDEN_BEDS.map(([x, z], i) => <SceneProp key={i} source={assets.bush} position={[x + .6, .14, z]} height={.44} yaw={i * .9} />)}
    <SceneProp source={assets.stall} position={[-5.6, 0, -5.4]} height={2.35} yaw={-.55} />
    <SceneProp source={assets.cart} position={[5.6, 0, -6.5]} height={1.1} yaw={.61} />
    <Plaque title="CHAI CORNER" detail="Gorakhpur Road" position={[-5.6, 1.91, -6.29]} width={2.01} height={.42} tint="#805641" />
    <Plaque title="CAMPUS CHOWK" detail="CONTINUUM 2027" position={[0, .86, 8.55]} width={2.39} height={.48} />
    <SceneProp source={assets.fountain} position={[CAMPUS_FOUNTAIN[0], .35, CAMPUS_FOUNTAIN[2]]} height={.42} width={4.25} depth={4.25} />
    <mesh position={[0, .61, 10.7]} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[1.83, 28]} /><meshBasicMaterial color="#75bdd0" toneMapped={false} />
    </mesh>
    <SceneProp source={assets.spout} position={[0, .61, 10.7]} height={.83} />
    <mesh position={[0, .625, 10.7]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[.82, .85, 28]} /><meshBasicMaterial color="#d0edf0" transparent opacity={.57} />
    </mesh>
    {[-1, 1].flatMap(side => [5.32, 15.87, 37.6].map((z, i) => <group key={String(side) + z}>
      <Box position={[side * 3.68, .95, z]} size={[.13, 1.9, .13]} color="#785944" />
      <Box position={[side * 3.56, 1.82, z]} size={[.34, .13, .14]} color="#835c42" />
      <SceneProp source={assets.lantern} position={[side * 3.4, 1.46, z]} height={.37} />
      {i !== 2 && <SceneProp source={assets.bench} position={[side * 4.1, 0, z + 1.6]} height={.66} yaw={side * Math.PI / 2} />}
    </group>))}
    {CAMPUS_DESKS.map((position, i) => <group key={i}>
      <SceneProp source={assets.desk} position={position} height={.76} width={1.15} depth={.55} />
      <SceneProp source={assets.chair} position={[position[0] + .76, 0, position[2] + .16]} height={.83} yaw={.45} />
      {i === 0 || i === 4 || i > 4
        ? <SceneProp source={assets.monitor} position={[position[0], .76, position[2] + .03]} height={.45} />
        : <SceneProp source={assets.books} position={[position[0], .76, position[2] + .03]} height={.15} />}
    </group>)}
    {CAMPUS_SHELVES.map(({ position, yaw }, i) => <SceneProp key={i} source={assets.shelf} position={position} height={1.6} width={1.12} depth={.42} yaw={yaw} />)}
    {collected?.has('secret') && <Plaque title="FIRST BUILD" detail="Castle route blueprint" position={[-6.3, 1.76, 26.27]} width={1.92} height={.45} tint="#425a68" />}
    <Box position={[-6.4, 1.11, 25.805]} size={[.108, .12, .08]} color="#e9be74" glow />
    <Plaque title="CSE FACULTY" detail="Coordinators & department" position={[-7.25, 1.8, 14.252]} width={2.34} height={.58} />
    <Plaque title="CHIEF PATRON" detail="Vice-Chancellor, MMMUT" position={[-10.75, 2.42, 14.255]} width={2.33} height={.46} tint="#735847" />
    <Box position={[-10.75, 1.65, 14.25]} size={[.96, .96, .075]} color="#ad8658" />
    <mesh position={[-10.75, 1.65, 14.202]} rotation-y={Math.PI}>
      <planeGeometry args={[.85, .85]} />
      <meshBasicMaterial map={posters[POSTERS.length]} toneMapped={false} />
    </mesh>
    <Plaque title="FESTIVAL ARENA" detail="CONTINUUM 2027" position={[-9, 2.82, 37.49]} width={4.4} height={.52} tint="#55436a" />
    <Plaque title="FESTIVAL KEEP" detail="Archive & Observatory" position={[0, 2.79, 42.438]} width={4.18} height={.51} tint="#7b5346" />
    <Box position={[-18.3, .71, 44.8]} size={[.13, 1.4, .13]} color="#73553e" />
    <Plaque title="OLD CASTLE" detail="Follow the forest trail" position={[-18.35, 1.3, 44.8]} width={2.2} height={.51} tint="#506d49" yaw={Math.PI / 2} />
    {[-1, 1].flatMap(side => [43.75, 53.15].map(z => <SceneProp key={String(side) + z} source={assets.tower} position={[side * 5.7, 4.07, z]} height={1.8} width={2.95} depth={2.9} />))}
    {[-1, 1].map(side => <SceneProp key={side} source={assets.banner} position={[side * 2.6, .65, 42.44]} height={1.65} yaw={Math.PI} />)}
    <Box position={[0, 3.14, 51.05]} size={[.49, .56, .45]} color={keepLit ? '#fff0ad' : '#c9ae7c'} glow={keepLit} />
    <Box position={[0, 3.46, 51.05]} size={[.57, .09, .53]} color="#a66e50" />
    {POSTERS.map((poster, i) => <mesh key={poster.url} position={poster.position} rotation-y={Math.PI}>
      <planeGeometry args={[.94, 1.18]} /><meshBasicMaterial map={posters[i]} toneMapped={false} />
    </mesh>)}
    <Student source={assets.studentA} position={[-3.14, 0, 6.98]} yaw={.84} playing={playing} />
    <Student source={assets.studentE} position={[4.88, 0, 17.78]} yaw={-.76} playing={playing} />
    <Student source={assets.studentA} position={[-4.2, 0, 37.25]} yaw={.62} playing={playing} />
    <DiscoverySignals collected={collected} beaconLit={keepLit} />
  </group>;
}
