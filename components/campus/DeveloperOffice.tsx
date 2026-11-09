'use client';

import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace, TextureLoader } from 'three';
import { DEVELOPER_CABIN_PANELS, DEVELOPER_STATIONS } from '@/lib/developer-office';
import type { WorldPoint } from '@/lib/journey';

function Block({ at, size, color, lit = false }: { at: WorldPoint; size: WorldPoint; color: string; lit?: boolean }) {
  return <mesh position={at}>
    <boxGeometry args={size} />
    {lit ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshStandardMaterial color={color} roughness={.86} />}
  </mesh>;
}

function Nameplate({ name, detail, accent, lead }: { name: string; detail: string; accent: string; lead: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 284;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#183147';
    ctx.fillRect(0, 0, 1024, 284);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 1024, 13);
    ctx.fillRect(0, 270, 1024, 14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff3d7';
    ctx.font = 'bold 69px Georgia, serif';
    ctx.fillText(name, 512, 108, 928);
    ctx.fillStyle = '#e9dbbd';
    ctx.font = '600 37px system-ui, sans-serif';
    ctx.fillText(detail, 512, 198, 922);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [name, detail, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, lead ? 2.13 : 1.69, lead ? -1.22 : -.86]}>
    <planeGeometry args={[lead ? 2.72 : 1.73, lead ? .64 : .48]} />
    <meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

function LeadPortrait() {
  const image = useLoader(TextureLoader, '/continuum/people/priyanshu.webp');
  useEffect(() => { image.colorSpace = SRGBColorSpace; image.needsUpdate = true; }, [image]);
  return <>
    <Block at={[0, 1.37, -1.26]} size={[.81, .82, .067]} color="#b88b4b" />
    <mesh position={[0, 1.37, -1.219]}>
      <planeGeometry args={[.72, .73]} />
      <meshBasicMaterial map={image} toneMapped={false} />
    </mesh>
  </>;
}

function Workstation({ station }: { station: (typeof DEVELOPER_STATIONS)[number] }) {
  const { position, yaw, lead, accent, name, role, cohort } = station;
  const width = lead ? 2.44 : 1.53;
  const laptopSide = lead ? .44 : .32;
  return <group position={position} rotation-y={yaw}>
    <Nameplate name={name} detail={role + '  ·  ' + cohort} accent={accent} lead={lead} />
    {lead && <LeadPortrait />}
    <Block at={[0, .05, .28]} size={[width + .34, .06, 1.66]} color={lead ? '#b38750' : '#dac6a8'} />
    <Block at={[0, .44, -.28]} size={[.49, .10, .43]} color="#2d4154" />
    <Block at={[0, .66, -.48]} size={[.49, .41, .08]} color="#344b60" />
    {[-.16, .16].map(x => <Block key={x} at={[x, .22, -.28]} size={[.08, .41, .09]} color="#2d4154" />)}
    <Block at={[0, .66, -.24]} size={[.34, .36, .25]} color={accent} />
    <Block at={[0, .974, -.224]} size={[.28, .28, .278]} color="#b47e56" />
    <Block at={[0, 1.107, -.234]} size={[.307, .067, .293]} color="#2b2527" />
    <Block at={[0, 1.03, -.357]} size={[.303, .12, .052]} color="#2b2527" />
    {[-.063, .063].map(x => <Block key={x} at={[x, .997, -.083]} size={[.031, .032, .014]} color="#312529" />)}
    {[-1, 1].map(side => <group key={side}>
      <Block at={[side * .218, .76, -.076]} size={[.109, .118, .32]} color={accent} />
      <Block at={[side * .161, .776, .104]} size={[.102, .081, .117]} color="#b47e56" />
      <Block at={[side * .101, .44, -.01]} size={[.135, .13, .37]} color="#313d4c" />
      <Block at={[side * .101, .25, .15]} size={[.136, .34, .132]} color="#313d4c" />
      <Block at={[side * .101, .09, .199]} size={[.14, .097, .23]} color="#243241" />
    </group>)}
    <Block at={[0, .745, .426]} size={[width, .084, .76]} color={lead ? '#8f6341' : '#a37953'} />
    {[-1, 1].map(side => <Block key={side} at={[side * (width / 2 - .1), .363, .429]} size={[.115, .72, .54]} color="#795840" />)}
    <Block at={[laptopSide, .802, .38]} size={[.46, .029, .31]} color="#293e50" />
    <Block at={[laptopSide, .823, .378]} size={[.35, .011, .15]} color="#688c9a" />
    <group position={[laptopSide, .828, .48]} rotation-x={-.16}>
      <Block at={[0, .151, 0]} size={[.466, .31, .034]} color="#263a50" />
      <Block at={[0, .151, -.022]} size={[.405, .245, .012]} color="#3d657a" lit />
      <Block at={[0, .216, -.032]} size={[.30, .021, .009]} color={accent} lit />
      <Block at={[-.052, .151, -.032]} size={[.20, .016, .009]} color="#cae6dc" lit />
    </group>
    <Block at={[width / 2 - .18, .845, .39]} size={[.12, .115, .12]} color={accent} />
  </group>;
}

export default function DeveloperOffice({ archiveOpen }: { archiveOpen: boolean }) {
  return <group>
    <Block at={[-9, .024, 22.7]} size={[2.1, .027, 5.55]} color="#92785a" />
    <Block at={[-9, .026, 27.38]} size={[3.58, .028, 2.72]} color="#647b87" />
    {DEVELOPER_CABIN_PANELS.map(({ position, size }) => <group key={position[0]}>
      <Block at={[position[0], .42, position[2]]} size={[size[0], .84, size[2]]} color="#2a4559" />
      <mesh position={[position[0], 1.53, position[2]]}>
        <boxGeometry args={[size[0] - .12, 1.35, .042]} />
        <meshBasicMaterial color="#95b7c7" transparent opacity={.19} depthWrite={false} />
      </mesh>
      {[.85, 2.21].map(y => <Block key={y} at={[position[0], y, position[2]]} size={[size[0], .09, .172]} color="#a47c48" />)}
      {[-1, 1].map(side => <Block key={side} at={[position[0] + side * (size[0] / 2 - .07), 1.52, position[2]]}
        size={[.12, 1.34, .15]} color="#795f42" />)}
    </group>)}
    <Block at={[-9, 2.245, 25.95]} size={[2.1, .16, .19]} color="#a47c48" />
    <Block at={[-6.35, .49, 28.24]} size={[1.2, .98, .53]} color="#544e43" />
    <Block at={[-6.35, 1.01, 28.24]} size={[1.26, .09, .59]} color="#ac824e" />
    <Block at={[-6.35, .83, 27.96]} size={[.18, .12, .055]} color={archiveOpen ? '#fff0ad' : '#d4a65f'} lit={archiveOpen} />
    {DEVELOPER_STATIONS.map(station => <Workstation key={station.name} station={station} />)}
  </group>;
}
