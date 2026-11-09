'use client';

import { useMemo, type RefObject } from 'react';
import { useLoader } from '@react-three/fiber';
import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { AUTO_GATE_STOP, CAMPUS_VEHICLES, type VehicleKind } from '@/lib/campus-vehicles';

const MODELS = ['/assets/campus/car.glb', '/assets/campus/rickshaw.glb?v=trimmed-1'];
const setupLoader = (loader: GLTFLoader) => { loader.setMeshoptDecoder(MeshoptDecoder); };

export function clearCampusVehicles() {
  useLoader.clear(GLTFLoader, MODELS);
}

function VehicleModel({ source, kind, vehicleRef }: { source: Group; kind: VehicleKind; vehicleRef: RefObject<Group | null> }) {
  const { width, length, height, spawn } = CAMPUS_VEHICLES[kind];
  const { model, center, base, size } = useMemo(() => {
    const model = new Group();
    const scene = source.clone(true);
    if (kind === 'rickshaw') scene.rotation.y += Math.PI / 2;
    model.add(scene);
    const bounds = new Box3().setFromObject(model, true);
    return { model, center: bounds.getCenter(new Vector3()), base: bounds.min.y, size: bounds.getSize(new Vector3()) };
  }, [kind, source]);
  return <group ref={vehicleRef} position={spawn}>
    <group scale={[width / size.x, height / size.y, length / size.z]}>
      <group position={[-center.x, -base, -center.z]}><primitive object={model} dispose={null} /></group>
    </group>
    <mesh rotation-x={-Math.PI / 2} position-y={-.003} scale={[width / 2, length / 2, 1]}>
      <circleGeometry args={[1.01, 22]} />
      <meshBasicMaterial color="#3a372e" transparent opacity={.19} depthWrite={false} />
    </mesh>
  </group>;
}

export default function CampusVehicles({ car, rickshaw }: { car: RefObject<Group | null>; rickshaw: RefObject<Group | null> }) {
  const [carAsset, autoAsset] = useLoader(GLTFLoader, MODELS, setupLoader);
  return <>
    <VehicleModel source={carAsset.scene} kind="car" vehicleRef={car} />
    <VehicleModel source={autoAsset.scene} kind="rickshaw" vehicleRef={rickshaw} />
    {[CAMPUS_VEHICLES.rickshaw.spawn[2], AUTO_GATE_STOP].map(z => <group key={z} position={[3.14, 0, z]}>
      <mesh position-y={.76}>
        <boxGeometry args={[.095, 1.52, .095]} />
        <meshStandardMaterial color="#405967" />
      </mesh>
      <mesh position-y={1.43}>
        <boxGeometry args={[.42, .4, .068]} />
        <meshStandardMaterial color="#264c61" />
      </mesh>
      <mesh position={[0, 1.43, -.037]}>
        <boxGeometry args={[.26, .075, .01]} />
        <meshBasicMaterial color="#ead498" />
      </mesh>
    </group>)}
  </>;
}
