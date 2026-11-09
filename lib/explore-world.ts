import { BRIDGE_PATCHES, type WorldPoint } from './journey';

export type ExploreBlock = {
  position: WorldPoint;
  size: WorldPoint;
  color: string;
};

export const EXPLORE_SPAWN: WorldPoint = [0, 0.015, -32.15];

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
  { id: 'gate-seal', name: 'Gatekeeper’s Seal', position: [-.29, .49, -18.05] as WorldPoint, color: '#ffb57d', hint: 'Raise the portcullis with the lever to the left of the entrance. The seal is beyond the arch.' },
  { id: 'wayfinder', name: 'Wayfinder’s Compass', position: [.31, .55, -10.7] as WorldPoint, color: '#8ce2d0', hint: 'The chest beside the crawl shelter holds the order for the two bridge levers.' },
  { id: 'warden-crown', name: 'Warden’s Crown', position: [3.63, .58, -.57] as WorldPoint, color: '#ffdf7d', hint: 'Beyond the inner gate, turn into the courtyard and vault the low supply crate.' },
] as const;

export type Relic = typeof RELICS[number];
export type RelicId = Relic['id'];

export const PORTCULLIS = {
  position: [0, 0, -21.55] as WorldPoint,
  size: [1.48, 1.56, .18] as WorldPoint,
};

export type QuestInteractableId = 'chest' | 'gate-lever' | 'bridge-left' | 'bridge-right' | 'altar' | 'secret';
type QuestInteractable = {
  id: QuestInteractableId;
  position: WorldPoint;
  approach: WorldPoint;
  label: string;
  range: number;
};

export const QUEST_INTERACTABLES = {
  chest: { id: 'chest', position: [5.05, 0, -28.4], approach: [4.95, 0, -27.8], label: 'Open chest', range: .84 },
  'gate-lever': { id: 'gate-lever', position: [1.23, .64, -24.8], approach: [.64, 0, -24.8], label: 'Raise gate', range: .82 },
  'bridge-left': { id: 'bridge-left', position: [.78, .5, -14.55], approach: [0, 0, -14.55], label: 'Pull amber lever', range: .78 },
  'bridge-right': { id: 'bridge-right', position: [-.78, .5, -11.8], approach: [0, 0, -11.8], label: 'Pull blue lever', range: .78 },
  altar: { id: 'altar', position: [4.37, 0, .66], approach: [3.7, 0, .41], label: 'Light the beacon', range: .76 },
  secret: { id: 'secret', position: [5.17, .1, 1.52], approach: [4.73, 0, 1.22], label: 'Place missing block', range: .67 },
} satisfies Record<QuestInteractableId, QuestInteractable>;

export type CheckpointId = 'gate' | 'bridge' | 'courtyard';
type Checkpoint = { position: WorldPoint; yaw: number; radius: number; name: string };
export const QUEST_CHECKPOINTS: Record<CheckpointId, Checkpoint> = {
  gate: { position: EXPLORE_SPAWN, yaw: 0, radius: .95, name: 'Gateyard' },
  bridge: { position: [0, .015, -14.55], yaw: 0, radius: .7, name: 'Village bridge' },
  courtyard: { position: [1.6, .015, -.6], yaw: Math.PI / 2, radius: .66, name: 'Inner courtyard' },
};

// Solid prop cores. Thin foliage, pennants and lantern effects are decorative.
export const QUEST_PROP_COLLIDERS: { position: WorldPoint; size: WorldPoint }[] = [
  { position: [5.05, .23, -28.4], size: [.56, .46, .45] },
  { position: [1.23, .32, -24.8], size: [.44, .64, .44] },
  { position: [4.37, .29, .66], size: [.55, .58, .55] },
  { position: [5.45, .53, 1.52], size: [.47, .86, .82] },
  { position: [8.6, .56, -29.3], size: [1.9, 1.12, .73] },
  { position: [-7.7, .35, -27.5], size: [1.08, .70, .88] },
  { position: [-6.5, .35, -27.3], size: [.45, .70, .45] },
  { position: [7.1, .31, -28.1], size: [.4, .62, .4] },
  ...([-1, 1] as const).flatMap(x => [
    { position: [x * 2.06, .77, -30.7] as WorldPoint, size: [.17, 1.54, .17] as WorldPoint },
    { position: [x * 1.64, .30, -25.9] as WorldPoint, size: [.42, .6, .42] as WorldPoint },
  ]),
];
