import type { CollisionBlock } from './explore-physics';
import type { WorldPoint } from './journey';
import { developerCredits } from './nexsus-people';

const layout: { position: WorldPoint; yaw: number; accent: string; portrait?: string }[] = [
  { position: [-9, 0, 27.4], yaw: Math.PI, accent: '#b78947', portrait: 'priyanshu' },
  { position: [-13.27, 0, 21.01], yaw: Math.PI / 2, accent: '#74b0ca' },
  { position: [-4.73, 0, 21.53], yaw: -Math.PI / 2, accent: '#8badd0', portrait: 'amitesh' },
  { position: [-13.27, 0, 22.98], yaw: Math.PI / 2, accent: '#8fbaa2' },
  { position: [-4.73, 0, 24.15], yaw: -Math.PI / 2, accent: '#d1998d' },
  { position: [-13.27, 0, 24.95], yaw: Math.PI / 2, accent: '#ba9ac9' },
];

export const DEVELOPER_STATIONS = developerCredits.map((developer, index) => {
  const { position, yaw, accent, portrait } = layout[index];
  const offset = (distance: number, y: number): WorldPoint => [
    position[0] + Math.sin(yaw) * distance, y, position[2] + Math.cos(yaw) * distance,
  ];
  const lead = index === 0;
  return { ...developer, position, yaw, accent, portrait, lead, approach: offset(1.37, .015), desk: offset(.26, .42) };
});

export const DEVELOPER_CABIN_PANELS: CollisionBlock[] = [
  { position: [-12.13, 1.12, 25.95], size: [4.23, 2.24, .15] },
  { position: [-5.87, 1.12, 25.95], size: [4.23, 2.24, .15] },
];

export const DEVELOPER_OFFICE_COLLIDERS: CollisionBlock[] = [
  ...DEVELOPER_CABIN_PANELS,
  ...DEVELOPER_STATIONS.map<CollisionBlock>(station => ({
    position: station.desk, size: [station.lead ? 2.45 : 1.55, .84, 1.18],
    rotation: [0, station.yaw, 0],
  })),
  { position: [-6.35, .51, 28.24], size: [1.2, 1.02, .53] },
];
