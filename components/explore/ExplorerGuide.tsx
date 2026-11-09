import type { RefObject } from 'react';
import type { Group } from 'three';
import type { WorldPoint } from '@/lib/journey';

function Voxel({ position, size, color }: { position: WorldPoint; size: WorldPoint; color: string }) {
  return <mesh position={position}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={.9} />
  </mesh>;
}

export type GuideParts = {
  body: RefObject<Group | null>;
  leftArm: RefObject<Group | null>;
  rightArm: RefObject<Group | null>;
  leftLeg: RefObject<Group | null>;
  rightLeg: RefObject<Group | null>;
};

export default function ExplorerGuide({ parts }: { parts: GuideParts }) {
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
