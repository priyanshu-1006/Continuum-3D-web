"use client";

import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { Color, InstancedMesh, MathUtils, Mesh, Object3D, PerspectiveCamera, Plane, SRGBColorSpace, TextureLoader, Vector3, type Group, type Material, type Texture } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { BRIDGE_PATCHES, HERO_SCENERY_END, JOURNEY_STOPS, ROUTE_LENGTH, SCREEN_STATIONS, getCameraHeight, getRouteSample, resolveRouteProgress, type JourneyProgress, type ScreenStation, type WorldPoint } from "../lib/journey";

type CastleWorldProps = {
  progressRef: RefObject<JourneyProgress>;
  quality: "high" | "low";
  paused: boolean;
  onReady: () => void;
  onError?: (message: string) => void;
  onSelectEvent: (slug: string) => void;
};
type Block = { position: WorldPoint; scale: WorldPoint; color: string; rotation?: number };
type GuidePart = "root" | "head" | "leftArm" | "rightArm" | "leftLeg" | "rightLeg";
type GuideRig = Record<GuidePart, { current: Group | null }>;

const NATURE_NAMES = ["tree-1", "tree-4", "tree-7", "stone-1", "stone-3", "bush-1", "forest-4", "path-straight-3", "path-curve-3"] as const;
const TREE_POSITIONS: [number, number, number, number][] = [
  [-12.5, -29, 1, 4.8], [12.6, -29.5, 2, 4], [-17, -32, 2, 5], [17.6, -32.5, 1, 5.7],
  [-9.3, -36, 0, 7], [8.8, -37, 1, 4.8], [-24, -28, 1, 5.4], [24.3, -30, 2, 4.7],
  [-19, -39, 2, 5.5], [18.5, -41, 1, 5.5], [-12, -43, 1, 6.2], [10.5, -45, 2, 6.1],
  [-31, -16, 2, 5.5], [32, -18, 1, 6.5], [-33, -2, 1, 6], [33, 1, 2, 5.3],
];
const BACKDROP_TREES: [number, number, number, number, number][] = [
  [-54, 3, 35, 2, 3.3], [-44, 3, 43, 1, 4], [-59, 3, 41, 1, 3.2],
  [48, 3.6, 44, 2, 3.5], [55, 3.6, 52, 1, 4.2], [43, 3.6, 54, 2, 3.2],
  [-23, 3.2, 63, 2, 3.8], [-16, 3.2, 69, 1, 3.8], [24, 3, 67, 2, 3.6],
];

function configureGLTF(loader: GLTFLoader) { loader.setMeshoptDecoder(MeshoptDecoder); }

function getIntroProgress(state: JourneyProgress) {
  return state.index === 0 ? MathUtils.clamp(state.introProgress ?? 0, 0, 1) : 1;
}

function exteriorOpacity(intro: number) {
  return MathUtils.smoothstep(intro, 0.5, HERO_SCENERY_END);
}

function heroCameraFrame(aspect: number) {
  const portrait = 1 - MathUtils.smoothstep(aspect, 0.7, 1.18);
  const fov = MathUtils.lerp(39, 50, portrait);
  const halfFov = Math.tan(MathUtils.degToRad(fov) / 2);
  const width = MathUtils.lerp(0.59, 0.82, portrait);
  const distance = Math.max(122, 21 + 52 / (2 * halfFov * aspect * width));
  const eyeY = distance * 0.18 + 4;
  // Keep the walk entrance on the pathway layer's screen-space vanishing point.
  const gate = getRouteSample(0).position;
  const gateAngle = Math.atan2(gate[1] - eyeY, distance + gate[2]);
  const viewAngle = gateAngle + Math.atan(0.35 * halfFov);
  return { fov, distance, eyeY, lookY: eyeY + distance * Math.tan(viewAngle) };
}

/** Show the existing walk scenery as the painted exterior gives way to the world. */
function ExteriorReveal({ progressRef, children }: Pick<CastleWorldProps, "progressRef"> & { children: ReactNode }) {
  const group = useRef<Group>(null);
  const lastOpacity = useRef(-1);
  const materials = useRef<{ material: Material; opacity: number; transparent: boolean; depthWrite: boolean }[]>([]);

  useLayoutEffect(() => {
    const found = new Set<Material>();
    group.current?.traverse(object => {
      if (!(object instanceof Mesh)) return;
      if (Array.isArray(object.material)) object.material.forEach(material => found.add(material));
      else found.add(object.material);
    });
    const originals = Array.from(found, material => ({
      material,
      opacity: material.opacity,
      transparent: material.transparent,
      depthWrite: material.depthWrite,
    }));
    materials.current = originals;
    lastOpacity.current = -1;
    return () => {
      for (const { material, opacity, transparent, depthWrite } of originals) {
        material.opacity = opacity;
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
        material.depthWrite = depthWrite;
      }
    };
  }, [children]);

  useFrame(() => {
    if (!group.current) return;
    const reveal = exteriorOpacity(getIntroProgress(progressRef.current));
    if (reveal === lastOpacity.current) return;
    lastOpacity.current = reveal;
    group.current.visible = reveal > 0;
    for (const { material, opacity, transparent, depthWrite } of materials.current) {
      material.opacity = opacity * reveal;
      const isTransparent = reveal < 1 || transparent;
      if (material.transparent !== isTransparent) {
        material.transparent = isTransparent;
        material.needsUpdate = true;
      }
      material.depthWrite = reveal === 1 && depthWrite;
    }
  });

  return <group ref={group} visible={false}>{children}</group>;
}

function InstancedBlocks({ blocks, unlit = false }: { blocks: Block[]; unlit?: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    blocks.forEach((block, index) => {
      dummy.position.set(...block.position);
      dummy.scale.set(...block.scale);
      dummy.rotation.set(0, block.rotation ?? 0, 0);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
      mesh.current!.setColorAt(index, color.set(block.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [blocks, color, dummy]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]}>
    <boxGeometry args={[1, 1, 1]} />
    {unlit ? <meshBasicMaterial toneMapped={false} /> : <meshStandardMaterial roughness={0.95} metalness={0.02} />}
  </instancedMesh>;
}

function ExteriorGround() {
  const ground = useMemo<Block[]>(() => {
    const blocks: Block[] = [
      { position: [0, -0.18, -187.25], scale: [700, 0.35, 325.5], color: "#628149" },
      { position: [-189.375, -0.18, 0], scale: [321.25, 0.35, 49], color: "#628149" },
      { position: [189.375, -0.18, 0], scale: [321.25, 0.35, 49], color: "#628149" },
      { position: [0, -0.18, 187.25], scale: [700, 0.35, 325.5], color: "#628149" },
      { position: [0, 0.006, -29.1], scale: [4.5, 0.025, 9.2], color: "#777965" },
      ...BRIDGE_PATCHES.map(position => ({ position, scale: [1.4, 0.05, 0.28] as WorldPoint, color: "#777361" })),
    ];
    for (let i = 0; i < 84; i++) {
      const x = (i % 2 ? -1 : 1) * (4.1 + (i * 7 % 52));
      const z = -26.5 - (i * 11 % 45);
      blocks.push({ position: [x, 0.015, z], scale: [0.7 + i % 4, 0.03, 0.9 + i % 3], color: ["#587748", "#6f8b52", "#68834e"][i % 3] });
    }
    const hills = [[-52, 38, 38, 24, 3], [50, 49, 35, 25, 3.6], [-22, 65, 29, 24, 3.2], [23, 69, 31, 23, 3]];
    hills.forEach(([x, z, width, depth, height]) => {
      blocks.push({ position: [x, height / 4, z], scale: [width, height / 2, depth], color: "#5b7649" });
      blocks.push({ position: [x, height * 0.75, z], scale: [width * 0.73, height / 2, depth * 0.7], color: "#6c8652" });
    });
    return blocks;
  }, []);
  return <InstancedBlocks blocks={ground} />;
}

function VoxelClouds() {
  const clouds = useMemo<Block[]>(() => [
    { position: [-44, 38, 40], scale: [17, 1.1, 6], color: "#e1eef3" },
    { position: [-35, 38, 41], scale: [9, 1.1, 4], color: "#e1eef3" },
    { position: [-46, 38.5, 39], scale: [10, 0.6, 4.2], color: "#e8f3f6" },
    { position: [50, 34, 53], scale: [20, 0.9, 5], color: "#e1eef3" },
    { position: [42, 34, 54.8], scale: [8, 0.9, 5], color: "#e1eef3" },
    { position: [53, 34.5, 52], scale: [12, 0.6, 4], color: "#e8f3f6" },
  ], []);
  return <InstancedBlocks blocks={clouds} unlit />;
}

function SignalPath() {
  const blocks = useMemo<Block[]>(() => {
    const count = Math.min(80, Math.ceil(ROUTE_LENGTH / 1.15));
    return Array.from({ length: count }, (_, index) => {
      const sample = getRouteSample(index / Math.max(1, count - 1));
      return { position: [sample.position[0], sample.position[1] + 0.028, sample.position[2]], scale: [0.055, 0.016, 0.2], color: "#92aa72", rotation: Math.atan2(sample.tangent[0], sample.tangent[2]) };
    });
  }, []);
  return <InstancedBlocks blocks={blocks} unlit />;
}

function ModelClone({ scene, position = [0, 0, 0], scale = 1, rotation = 0 }: { scene: Group; position?: WorldPoint; scale?: number; rotation?: number }) {
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <group position={position} scale={scale} rotation={[0, rotation, 0]} dispose={null}><primitive object={clone} dispose={null} /></group>;
}

function cloneWithTone(scene: Group, tone: Color) {
  const clone = scene.clone(true);
  const materials = new Map<Material, Material>();
  const shade = (material: Material) => {
    const existing = materials.get(material);
    if (existing) return existing;
    const adjusted = material.clone();
    if ("color" in adjusted && adjusted.color instanceof Color) adjusted.color.multiply(tone);
    materials.set(material, adjusted);
    return adjusted;
  };
  clone.traverse(object => {
    if (!(object instanceof Mesh)) return;
    object.material = Array.isArray(object.material) ? object.material.map(shade) : shade(object.material);
  });
  return { scene: clone, materials: [...materials.values()] };
}

function ForestApproach({ models, quality }: { models: GLTF[]; quality: "high" | "low" }) {
  return <group>
    {TREE_POSITIONS.filter((_, index) => quality === "high" || index < 10).map(([x, z, model, scale], index) => <ModelClone key={index} scene={models[model].scene} position={[x, 0.015, z]} scale={scale} rotation={index * 1.1} />)}
    {BACKDROP_TREES.filter((_, index) => quality === "high" || index % 2 === 0).map(([x, y, z, model, scale], index) => <ModelClone key={"backdrop-" + index} scene={models[model].scene} position={[x, y, z]} scale={scale} rotation={index * 0.9} />)}
    {[-1, 1].map(side => <group key={side}>
      <ModelClone scene={models[6].scene} position={[side * 13, -0.1, -36]} scale={3.2} />
      <ModelClone scene={models[4].scene} position={[side * 4.4, 0, -29.7]} scale={1.6} rotation={side} />
      <ModelClone scene={models[3].scene} position={[side * 5.1, 0, -34]} scale={1.4} rotation={side * 2} />
      <ModelClone scene={models[5].scene} position={[side * 7.4, 0, -27.4]} scale={2.4} />
      <ModelClone scene={models[5].scene} position={[side * 8, 0, -40.5]} scale={3} />
    </group>)}
    <ModelClone scene={models[7].scene} position={[0, 0.028, -28]} scale={1.9} rotation={Math.PI / 2} />
    <ModelClone scene={models[8].scene} position={[2.3, 0.025, -33]} scale={1.9} rotation={Math.PI} />
  </group>;
}

function bannerBlock(station: ScreenStation, position: WorldPoint, scale: WorldPoint, color: string): Block {
  const sin = Math.sin(station.rotation), cos = Math.cos(station.rotation);
  return { position: [station.position[0] + position[0] * cos + position[2] * sin, station.position[1] + position[1], station.position[2] - position[0] * sin + position[2] * cos], scale, color, rotation: station.rotation };
}

function BannerFrames() {
  const blocks = useMemo<Block[]>(() => {
    const result: Block[] = [];
    SCREEN_STATIONS.forEach(station => {
      const width = station.width, height = width * 9 / 16;
      const put = (p: WorldPoint, s: WorldPoint, c: string) => result.push(bannerBlock(station, p, s, c));
      put([0, 0, -0.07], [width + 0.22, height + 0.22, 0.13], "#3e3427");
      [-1, 1].forEach(side => {
        put([0, side * (height / 2 + 0.095), 0.015], [width + 0.3, 0.18, 0.23], "#776147");
        put([side * (width / 2 + 0.1), 0, 0.015], [0.15, height, 0.21], "#66543e");
        const poleHeight = station.position[1] - station.groundY;
        put([side * (width / 2 + 0.09), -poleHeight / 2, -0.08], [0.14, poleHeight, 0.16], "#574832");
        put([side * (width / 2 + 0.09), -poleHeight + 0.08, -0.08], [0.28, 0.16, 0.3], "#78745a");
      });
    });
    return result;
  }, []);
  return <InstancedBlocks blocks={blocks} />;
}

function EventBanner({ station, chapter, activeBannerRef, texture, onSelectEvent }: {
  station: ScreenStation;
  chapter: number;
  activeBannerRef: RefObject<number | null>;
  texture: Texture;
  onSelectEvent: (slug: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, "pointer", "auto");
  const select = (event: ThreeEvent<MouseEvent>) => {
    if (activeBannerRef.current !== chapter) return;
    event.stopPropagation();
    onSelectEvent(station.slug);
  };
  const hover = (event: ThreeEvent<PointerEvent>) => {
    if (activeBannerRef.current !== chapter) return;
    event.stopPropagation();
    setHovered(true);
  };
  return <group position={station.position} rotation={[0, station.rotation, 0]}>
    <mesh position={[0, 0, 0.011]} onClick={select} onPointerOver={hover} onPointerOut={() => setHovered(false)}>
      <planeGeometry args={[station.width, station.width * 9 / 16]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
    <mesh position={[0, station.width * 9 / 32 + 0.2, 0.05]}>
      <boxGeometry args={[0.36, 0.055, 0.08]} />
      <meshBasicMaterial color={station.accent} toneMapped={false} />
    </mesh>
  </group>;
}

function LoadedWorld({ quality, progressRef, baseClip, activeBannerRef, onReady, onSelectEvent }: Pick<CastleWorldProps, "quality" | "progressRef" | "onReady" | "onSelectEvent"> & { baseClip: Plane; activeBannerRef: RefObject<number | null> }) {
  const castle = useLoader(GLTFLoader, "/api/castle?v=7b2c0586", configureGLTF);
  const nature = useLoader(GLTFLoader, NATURE_NAMES.map(name => "/assets/models/nature/" + name + ".glb"), configureGLTF);
  const posters = useLoader(TextureLoader, SCREEN_STATIONS.map(station => station.poster));
  const { invalidate, gl } = useThree();
  const castleTone = useMemo(() => {
    const toned = cloneWithTone(castle.scene, new Color(1.45, 1.45, 1.45));
    // The isolated GLB contains an exposed underground slice. Hide that face
    // in the opening frame so the existing castle sits on the illustrated valley.
    toned.materials.forEach(material => { material.clippingPlanes = [baseClip]; });
    return toned;
  }, [castle.scene, baseClip]);
  const natureTone = useMemo(() => nature.map(asset => cloneWithTone(asset.scene, new Color(0.93, 0.62, 0.84))), [nature]);
  const forestModels = useMemo(() => nature.map((asset, index) => ({ ...asset, scene: natureTone[index].scene })), [nature, natureTone]);
  useEffect(() => () => castleTone.materials.forEach(material => material.dispose()), [castleTone]);
  useEffect(() => () => natureTone.forEach(asset => asset.materials.forEach(material => material.dispose())), [natureTone]);
  useMemo(() => posters.forEach(texture => { texture.colorSpace = SRGBColorSpace; texture.anisotropy = Math.min(quality === "high" ? 8 : 2, gl.capabilities.getMaxAnisotropy()); texture.needsUpdate = true; }), [gl, posters, quality]);
  useEffect(() => { onReady(); invalidate(); }, [invalidate, onReady]);
  return <group>
    <group position={[-0.25, -9, 0]} dispose={null}><primitive object={castleTone.scene} dispose={null} /></group>
    <ExteriorReveal progressRef={progressRef}>
      <ForestApproach models={forestModels} quality={quality} />
      <BannerFrames />
      {SCREEN_STATIONS.map((station, index) => <EventBanner key={station.slug} station={station} chapter={index + 1} activeBannerRef={activeBannerRef} texture={posters[index]} onSelectEvent={onSelectEvent} />)}
    </ExteriorReveal>
  </group>;
}

function Cube({ position, scale, color }: { position: WorldPoint; scale: WorldPoint; color: string }) {
  return <mesh position={position}><boxGeometry args={scale} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>;
}

/** Original voxel guide: green jacket, small field bag and lime backpack patch. */
function GuideAvatar({ rig }: { rig: GuideRig }) {
  return <group ref={rig.root} scale={0.94}>
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.27, 12]} /><meshBasicMaterial color="#111b14" transparent opacity={0.28} depthWrite={false} /></mesh>
    <Cube position={[0, 0.68, 0]} scale={[0.38, 0.4, 0.22]} color="#38664a" />
    <Cube position={[0, 0.864, 0]} scale={[0.28, 0.055, 0.24]} color="#638565" />
    <Cube position={[0, 0.67, -0.172]} scale={[0.29, 0.32, 0.14]} color="#293d31" />
    <Cube position={[0, 0.68, -0.249]} scale={[0.12, 0.115, 0.018]} color="#b6d487" />
    <Cube position={[0.025, 0.69, -0.261]} scale={[0.027, 0.07, 0.008]} color="#3f6040" />
    <Cube position={[0, 0.49, 0]} scale={[0.37, 0.065, 0.24]} color="#29372c" />
    <Cube position={[0.21, 0.55, 0.02]} scale={[0.14, 0.19, 0.19]} color="#8b704b" />
    <Cube position={[0.21, 0.62, 0.025]} scale={[0.16, 0.04, 0.205]} color="#b39966" />
    <group ref={rig.head} position={[0, 1.055, 0]}>
      <Cube position={[0, 0, 0]} scale={[0.31, 0.31, 0.3]} color="#bc946f" />
      <Cube position={[0, 0.12, -0.012]} scale={[0.33, 0.105, 0.33]} color="#302e25" />
      <Cube position={[0, 0.035, -0.145]} scale={[0.32, 0.16, 0.045]} color="#302e25" />
      <Cube position={[-0.14, 0.055, 0.06]} scale={[0.055, 0.15, 0.19]} color="#302e25" />
      <Cube position={[-0.064, 0.005, 0.154]} scale={[0.037, 0.04, 0.015]} color="#272f29" />
      <Cube position={[0.064, 0.005, 0.154]} scale={[0.037, 0.04, 0.015]} color="#272f29" />
      <Cube position={[0, -0.09, 0.153]} scale={[0.073, 0.017, 0.012]} color="#8b674f" />
    </group>
    {(["leftArm", "rightArm"] as const).map((part, index) => <group key={part} ref={rig[part]} position={[index ? -0.21 : 0.21, 0.84, 0]}>
      <Cube position={[0, -0.17, 0]} scale={[0.14, 0.34, 0.185]} color="#315b42" />
      <Cube position={[0, -0.345, 0]} scale={[0.145, 0.055, 0.19]} color="#718d61" />
      <Cube position={[0, -0.405, 0]} scale={[0.13, 0.09, 0.165]} color="#bc946f" />
    </group>)}
    {(["leftLeg", "rightLeg"] as const).map((part, index) => <group key={part} ref={rig[part]} position={[index ? -0.102 : 0.102, 0.48, 0]}>
      <Cube position={[0, -0.195, 0]} scale={[0.155, 0.39, 0.185]} color="#3a4440" />
      <Cube position={[0, -0.423, 0.025]} scale={[0.17, 0.115, 0.24]} color="#262e28" />
      <Cube position={[0, -0.477, 0.025]} scale={[0.175, 0.025, 0.25]} color="#77755d" />
    </group>)}
  </group>;
}

function dampAngle(current: number, target: number, amount: number) {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * amount;
}

/** Both camera and guide follow the path itself, so damping cannot cut through a wall. */
function TravelerRig({ progressRef, baseClip, activeBannerRef, paused }: Pick<CastleWorldProps, "progressRef" | "paused"> & { baseClip: Plane; activeBannerRef: RefObject<number | null> }) {
  const { camera, gl, size, invalidate } = useThree();
  const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
  const mobile = aspect < 0.85;
  const heroFrame = useMemo(() => heroCameraFrame(aspect), [aspect]);
  const rig = useMemo<GuideRig>(() => ({ root: { current: null }, head: { current: null }, leftArm: { current: null }, rightArm: { current: null }, leftLeg: { current: null }, rightLeg: { current: null } }), []);
  const distance = useRef(0), phase = useRef(0), gait = useRef(0), yaw = useRef(0);
  const initialized = useRef(false), pausedRef = useRef(paused);
  const lookTarget = useMemo(() => new Vector3(), []);
  const nextLook = useMemo(() => new Vector3(), []);
  const bannerLook = useMemo(() => new Vector3(), []);
  pausedRef.current = paused;

  useEffect(() => {
    let raf = 0, previous = "";
    const poll = () => {
      const state = progressRef.current;
      if (!pausedRef.current && !document.hidden) {
        const signature = [state.index, state.previous, state.blend.toFixed(5), state.routeProgress?.toFixed(5), state.introProgress?.toFixed(5), state.jump].join(":");
        if (signature !== previous) { previous = signature; invalidate(); }
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [invalidate, progressRef]);
  useEffect(() => { if (!paused) invalidate(); }, [invalidate, paused, size.width, size.height]);

  useFrame((_, rawDelta) => {
    if (pausedRef.current || !rig.root.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const state = progressRef.current;
    const wanted = resolveRouteProgress(state) * ROUTE_LENGTH;
    const snap = state.jump || !initialized.current;
    const previous = distance.current;
    distance.current = snap ? wanted : previous + (wanted - previous) * (1 - Math.exp(-delta * 12));
    if (Math.abs(wanted - distance.current) < 0.001) distance.current = wanted;
    const moved = snap ? 0 : distance.current - previous;
    const progress = distance.current / ROUTE_LENGTH;
    const sample = getRouteSample(progress);
    const movement = Math.min(1, Math.abs(moved) / Math.max(delta, 0.001) / 0.8);
    gait.current = snap ? 0 : gait.current + (movement - gait.current) * (1 - Math.exp(-delta * 15));
    if (gait.current < 0.002 && movement === 0) gait.current = 0;
    phase.current += moved / 0.67 * Math.PI * 2;
    const swing = Math.sin(phase.current) * 0.28 * gait.current;
    const banner = state.index > 0 && state.index < 6 ? SCREEN_STATIONS[state.index - 1] : null;
    const stopDistance = Math.abs(progress - JOURNEY_STOPS[Math.max(0, Math.min(6, state.index))]) * ROUTE_LENGTH;
    const reading = banner ? 1 - Math.min(1, stopDistance / 1.15) : 0;
    activeBannerRef.current = banner && stopDistance < 0.075 && Math.abs(wanted - distance.current) < 0.025 ? state.index : null;
    let facing = Math.atan2(sample.tangent[0], sample.tangent[2]);
    if (banner && reading > 0.4) {
      facing = dampAngle(facing, Math.atan2(banner.position[0] - sample.position[0], banner.position[2] - sample.position[2]), reading * (1 - gait.current));
    }
    yaw.current = snap ? facing : dampAngle(yaw.current, facing, 1 - Math.exp(-delta * 11));
    rig.root.current.position.set(sample.position[0], sample.position[1] + 0.012 + Math.abs(Math.sin(phase.current)) * 0.022 * gait.current, sample.position[2]);
    rig.root.current.rotation.y = yaw.current;
    if (rig.leftLeg.current) rig.leftLeg.current.rotation.x = swing;
    if (rig.rightLeg.current) rig.rightLeg.current.rotation.x = -swing;
    if (rig.leftArm.current) rig.leftArm.current.rotation.x = -swing * 0.75;
    if (rig.rightArm.current) rig.rightArm.current.rotation.x = swing * 0.75;
    if (rig.head.current) {
      const eyeHeight = sample.position[1] + 1;
      const rise = banner ? banner.position[1] - eyeHeight : 0;
      const reach = banner ? Math.hypot(banner.position[0] - sample.position[0], banner.position[2] - sample.position[2]) : 1;
      rig.head.current.rotation.x = -Math.min(0.48, Math.atan2(rise, reach)) * reading * (1 - gait.current);
    }

    const z = sample.position[2];
    const approach = Math.max(0, Math.min(1, (z + 5.5) / 3.5));
    const outerArch = Math.max(0, Math.min(1, (z + 19.75) / 2.75, (-14.5 - z) / 2.5));
    const promptBoard = Math.max(0, Math.min(1, (z + 14.3) / 2.3, (-10 - z) / 2));
    const nexathonNear = Math.max(0, Math.min(1, (z + 11) / 2, (-7 - z) / 2));
    const nexathonBoard = nexathonNear * nexathonNear * (3 - 2 * nexathonNear);
    const standardFollow = mobile ? 3.5 : 3.1;
    const followDistance = standardFollow + (2.1 - standardFollow) * Math.max(approach, promptBoard, nexathonBoard) + (2.05 - standardFollow) * outerArch;
    const behind = getRouteSample((distance.current - followDistance) / ROUTE_LENGTH);
    camera.position.set(behind.position[0], behind.position[1] + getCameraHeight(behind.position), behind.position[2]);
    const rightX = -sample.tangent[2], rightZ = sample.tangent[0];
    nextLook.set(sample.position[0] + sample.tangent[0] * 1.15, sample.position[1] + (mobile ? 0.35 : 1.05), sample.position[2] + sample.tangent[2] * 1.15);
    if (banner && reading > 0) {
      bannerLook.set(banner.position[0], banner.position[1] - (mobile ? 0.9 : 0.6), banner.position[2]);
      nextLook.lerp(bannerLook, reading * (mobile ? 1 : 0.9));
    }
    nextLook.x -= rightX * (mobile ? 0 : 0.1);
    nextLook.z -= rightZ * (mobile ? 0 : 0.1);
    const intro = getIntroProgress(state);
    const reveal = exteriorOpacity(intro);
    if (gl.getClearAlpha() !== reveal) gl.setClearAlpha(reveal);
    baseClip.constant = MathUtils.lerp(0.08, 9.25, reveal);
    const arrival = MathUtils.smoothstep(intro, 0, 1);
    if (arrival < 1) {
      camera.position.x *= arrival;
      camera.position.y = MathUtils.lerp(heroFrame.eyeY, camera.position.y, arrival);
      camera.position.z = MathUtils.lerp(-heroFrame.distance, camera.position.z, arrival);
      nextLook.x *= arrival;
      nextLook.y = MathUtils.lerp(heroFrame.lookY, nextLook.y, arrival);
      nextLook.z *= arrival;
    }
    if (snap) lookTarget.copy(nextLook);
    else lookTarget.lerp(nextLook, 1 - Math.exp(-delta * 13));
    camera.lookAt(lookTarget);
    if (camera instanceof PerspectiveCamera) {
      const holdFov = state.index === 2 ? 96 : 88;
      const portraitFit = Math.max(76, Math.atan(Math.tan(holdFov * Math.PI / 360) * (390 / 844) / aspect) * 360 / Math.PI);
      const followFov = mobile ? 76 + (portraitFit - 76) * reading : 70;
      const fov = MathUtils.lerp(heroFrame.fov, followFov, arrival);
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    }
    camera.updateMatrixWorld();
    initialized.current = true;
    if (state.jump) state.jump = false;
    const turning = Math.abs(Math.atan2(Math.sin(facing - yaw.current), Math.cos(facing - yaw.current)));
    if (Math.abs(wanted - distance.current) > 0.001 || gait.current > 0.002 || lookTarget.distanceToSquared(nextLook) > 0.000002 || turning > 0.002) invalidate();
  });
  return <GuideAvatar rig={rig} />;
}

function ContextHealth({ onError }: Pick<CastleWorldProps, "onError">) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onError?.("The 3D graphics context was interrupted. The Lite experience is still available."); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);
  return null;
}

class WorldErrorBoundary extends Component<{ children: ReactNode; onError?: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Castle world could not load", error, info.componentStack); this.props.onError?.("The 3D world could not load."); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function CastleWorld({ progressRef, quality, paused, onReady, onError, onSelectEvent }: CastleWorldProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const baseClip = useMemo(() => new Plane(new Vector3(0, 1, 0), 0.08), []);
  useEffect(() => {
    const probe = document.createElement("canvas");
    let context: WebGL2RenderingContext | null = null;
    try { context = probe.getContext("webgl2"); } catch { /* The event posters remain available. */ }
    const available = context !== null;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    setSupported(available);
    if (!available) onError?.("This browser cannot initialize the 3D world.");
  }, [onError]);
  const readyCalled = useRef(false), readyCallback = useRef(onReady);
  const activeBannerRef = useRef<number | null>(null);
  readyCallback.current = onReady;
  const markReady = useMemo(() => () => { if (!readyCalled.current) { readyCalled.current = true; readyCallback.current(); } }, []);
  if (supported !== true) return null;
  return <WorldErrorBoundary onError={onError}>
    <Canvas className="castle-canvas" style={{ width: "100%", height: "100%", touchAction: "pan-y" }} dpr={quality === "high" ? [1, 1.5] : 1} frameloop={paused ? "never" : "demand"} camera={{ position: [0, 26, -122], fov: 39, near: 0.055, far: 300 }} gl={{ alpha: true, antialias: quality === "high", powerPreference: quality === "high" ? "high-performance" : "low-power" }} onCreated={({ gl }) => { gl.localClippingEnabled = true; gl.setClearColor("#9ec9dd", 0); }} fallback={null}>
      <fog attach="fog" args={["#9ec9dd", 248, 295]} />
      <ambientLight intensity={0.9} color="#e0dcc5" />
      <hemisphereLight args={["#c7ddd7", "#35422e", 1.65]} />
      <directionalLight position={[20, 45, -30]} intensity={2} color="#ffe1af" />
      <ExteriorReveal progressRef={progressRef}>
        <ExteriorGround />
        <VoxelClouds />
        <SignalPath />
      </ExteriorReveal>
      <TravelerRig progressRef={progressRef} baseClip={baseClip} activeBannerRef={activeBannerRef} paused={paused} />
      <ContextHealth onError={onError} />
      <Suspense fallback={null}><LoadedWorld quality={quality} progressRef={progressRef} baseClip={baseClip} activeBannerRef={activeBannerRef} onReady={markReady} onSelectEvent={onSelectEvent} /></Suspense>
    </Canvas>
  </WorldErrorBoundary>;
}

