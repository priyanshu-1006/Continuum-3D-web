import { BRIDGE_PATCHES, type WorldPoint } from './journey';

export type ExploreBlock = {
  position: WorldPoint;
  size: WorldPoint;
  color: string;
};

export const EXPLORE_SPAWN: WorldPoint = [0, 0.015, -26.2];

// The four grass strips meet the model's perimeter and leave its native floors exposed.
export const EXPLORE_BLOCKS: ExploreBlock[] = [
  { position: [0, -.25, -33], size: [72, .5, 17], color: '#719056' },
  { position: [-32.375, -.25, 0], size: [7.25, .5, 49], color: '#719056' },
  { position: [32.375, -.25, 0], size: [7.25, .5, 49], color: '#719056' },
  { position: [0, -.25, 31], size: [72, .5, 13], color: '#719056' },
  ...BRIDGE_PATCHES.map(position => ({ position, size: [1.4, .05, .28] as WorldPoint, color: '#756649' })),
  { position: [-3.7, .26, -27.7], size: [1.15, .52, 1.15], color: '#8a8d79' },
  { position: [3.5, .94, -28.7], size: [1.52, .18, 2.2], color: '#735134' },
  { position: [2.84, .425, -28.7], size: [.20, .85, 2.2], color: '#9a7549' },
  { position: [4.16, .425, -28.7], size: [.20, .85, 2.2], color: '#9a7549' },
  { position: [2.45, .33, -.6], size: [.85, .66, .86], color: '#8d633b' },
];

export const RELICS = [
  { id: 'sunstone', name: 'Sunstone', position: [-3.7, .96, -27.7] as WorldPoint, color: '#ffd06b', minFeet: .32, hint: 'A low stone perch beside the gate road catches the morning light. Jump up to it.' },
  { id: 'moon-key', name: 'Moon Key', position: [3.5, .39, -28.7] as WorldPoint, color: '#b9a9fa', hint: 'The wooden shelter outside the wall has a very low roof. Crouch and look inside.' },
  { id: 'gate-seal', name: 'Gatekeeper’s Seal', position: [-.29, .49, -18.05] as WorldPoint, color: '#ffb57d', hint: 'Pass under the first gate. Look close to the stone edge on the far side.' },
  { id: 'wayfinder', name: 'Wayfinder’s Compass', position: [.31, .55, -10.7] as WorldPoint, color: '#8ce2d0', hint: 'Follow the raised village road toward the second gate. Check beside the railing.' },
  { id: 'warden-crown', name: 'Warden’s Crown', position: [3.63, .58, -.57] as WorldPoint, color: '#ffdf7d', hint: 'Beyond the inner gate, turn into the courtyard and vault the low supply crate.' },
] as const;

export type Relic = typeof RELICS[number];
export type RelicId = Relic['id'];
