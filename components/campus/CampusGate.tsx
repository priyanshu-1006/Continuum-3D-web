'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { CanvasTexture, Color, MathUtils, Mesh, MeshStandardMaterial, SRGBColorSpace, type Material } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = '/assets/campus/mmmut-gate.glb';
const CREST_URL = '/assets/campus/mmmut-crest.webp';
const ENGLISH = 'Madan Mohan Malaviya University of Technology, Gorakhpur';
const HINDI = 'मदन मोहन मालवीय प्रौद्योगिकी विश्वविद्यालय, गोरखपुर';

function universityPlaque() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const ink = context.createLinearGradient(0, 0, 0, 320);
  ink.addColorStop(0, '#254754');
  ink.addColorStop(1, '#102b35');
  context.fillStyle = ink;
  context.fillRect(0, 0, 2048, 320);
  context.strokeStyle = '#d6ac60';
  context.lineWidth = 9;
  context.strokeRect(13, 13, 2022, 294);
  context.strokeStyle = '#ffdf9a';
  context.lineWidth = 2;
  context.strokeRect(24, 24, 2000, 272);
  context.fillStyle = '#d8a85d';
  context.fillRect(190, 160, 1668, 2);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#fff4d6';
  context.font = '700 74px "Nirmala UI", "Noto Sans Devanagari", Mangal, sans-serif';
  context.fillText(HINDI, 1024, 104, 1890);
  context.font = '700 68px system-ui, sans-serif';
  context.fillText(ENGLISH, 1024, 220, 1908);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function UniversitySign() {
  const plaque = useMemo(universityPlaque, []);
  const [crest, setCrest] = useState<CanvasTexture | null>(null);
  const invalidate = useThree(state => state.invalidate);

  useEffect(() => () => plaque?.dispose(), [plaque]);
  useEffect(() => {
    const image = new Image();
    let texture: CanvasTexture | undefined;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 384;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.beginPath();
      context.arc(192, 192, 191, 0, Math.PI * 2);
      context.clip();
      context.drawImage(image, 0, 0, 384, 384);
      texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      setCrest(texture);
      invalidate();
    };
    image.src = CREST_URL;
    return () => { image.onload = null; texture?.dispose(); };
  }, [invalidate]);

  return <group position={[0, 4.24, -1.09]} rotation-y={Math.PI}>
    <mesh position-z={-.06}>
      <boxGeometry args={[7.74, 1.17, .14]} />
      <meshStandardMaterial color="#b29259" roughness={.67} />
    </mesh>
    <mesh position-z={.023}>
      <planeGeometry args={[7.6, 1.12]} />
      <meshBasicMaterial map={plaque} color={plaque ? '#ffffff' : '#204451'} toneMapped={false} />
    </mesh>
    <mesh position={[0, .88, .065]}>
      <circleGeometry args={[.45, 48]} />
      <meshBasicMaterial color="#e3bf76" toneMapped={false} />
    </mesh>
    {crest && <mesh position={[0, .88, .074]}>
      <planeGeometry args={[.84, .84]} />
      <meshBasicMaterial map={crest} transparent toneMapped={false} />
    </mesh>}
  </group>;
}

export default function CampusGate({ open }: { open: boolean }) {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const { gate, materials } = useMemo(() => {
    const gate = gltf.scene.clone(true);
    const materials = new Map<Material, Material>();
    const shade = (material: Material) => {
      const cached = materials.get(material);
      if (cached) return cached;
      if (!(material instanceof MeshStandardMaterial)) return material;
      const result = material.clone();
      result.color.multiply(new Color(1.55, 1.42, 1.28));
      result.emissive.set('#4d3b25');
      result.emissiveMap = result.map;
      result.emissiveIntensity = .44;
      materials.set(material, result);
      return result;
    };
    gate.traverse(node => {
      if (node instanceof Mesh) node.material = Array.isArray(node.material) ? node.material.map(shade) : shade(node.material);
    });
    return { gate, materials };
  }, [gltf.scene]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  const leaves = useMemo(() => [gate.getObjectByName('GateDoorLeft'), gate.getObjectByName('GateDoorRight')], [gate]);
  const opening = useRef(open ? 1 : 0);

  useFrame(({ invalidate }, delta) => {
    const target = open ? 1 : 0;
    opening.current = MathUtils.damp(opening.current, target, 7, Math.min(delta, .055));
    if (Math.abs(opening.current - target) > .003) invalidate();
    else opening.current = target;
    if (leaves[0]) leaves[0].rotation.y = opening.current * 1.16;
    if (leaves[1]) leaves[1].rotation.y = -opening.current * 1.16;
  });

  return <group>
    <group rotation-y={Math.PI} scale={[.986, .6194, .9]}>
      <primitive object={gate} dispose={null} />
    </group>
    <mesh position={[0, 5.48, .25]}>
      <boxGeometry args={[6.9, .19, 1.7]} />
      <meshStandardMaterial color="#527c70" roughness={.79} />
    </mesh>
    <UniversitySign />
  </group>;
}

export function clearCampusGate() {
  useLoader.clear(GLTFLoader, MODEL_URL);
}
