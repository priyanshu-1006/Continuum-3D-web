import type { EventId } from './events';
import type { WorldPoint } from './journey';

export type CampusBlock = {
  position: WorldPoint;
  size: WorldPoint;
  color: string;
  solid?: boolean;
};

export const CAMPUS_SPAWN: WorldPoint = [0, .015, -14];
export const CAMPUS_GATE = { position: [0, 0, 0] as WorldPoint, width: 10, height: 5.7, clearWidth: 4.7 };
export const CAMPUS_BOUNDS = { minX: -27.5, maxX: 27.5, minZ: -23, maxZ: 58.5 };

export type CampusCheckpoint = { id: string; name: string; position: WorldPoint; yaw: number; radius: number };
export const CAMPUS_CHECKPOINTS: CampusCheckpoint[] = [
  { id: 'street', name: 'University entrance', position: CAMPUS_SPAWN, yaw: 0, radius: 2.6 },
  { id: 'quad', name: 'Campus Chowk', position: [-3.8, .015, 12.6], yaw: 0, radius: 2.6 },
  { id: 'plaza', name: 'Festival Plaza', position: [0, .015, 36], yaw: 0, radius: 2.8 },
  { id: 'keep', name: 'Festival Keep', position: [0, .015, 46], yaw: 0, radius: 2.6 },
];

type CampusLandmark = { id: string; name: string; position: WorldPoint };
export const CAMPUS_LANDMARKS: CampusLandmark[] = [
  { id: 'gate', name: 'MMMUT Gate', position: [0, 0, 0] },
  { id: 'quad', name: 'Campus Chowk', position: [0, 0, 10.7] },
  { id: 'cse', name: 'CSE Block', position: [9, 0, 11] },
  { id: 'admin', name: 'Administration', position: [-9, 0, 11] },
  { id: 'library', name: 'Library', position: [9, 0, 23] },
  { id: 'dev', name: 'Developers’ House', position: [-9, 0, 23] },
  { id: 'makers', name: 'Makers’ Lab', position: [9, 0, 33.5] },
  { id: 'arena', name: 'Festival Arena', position: [-9, 0, 33.5] },
  { id: 'keep', name: 'Festival Keep', position: [0, 0, 49] },
  { id: 'forest', name: 'Forest Trail', position: [-18, 0, 44.8] },
];

export type CampusDiscoveryId =
  | 'gate' | 'neural-nexsus' | 'promptx' | 'redstone-rush' | 'nexathon' | 'battleforge'
  | 'chief-patron' | 'faculty' | 'dev-house' | 'keep' | 'forest' | 'secret';
export type CampusDiscovery = {
  id: CampusDiscoveryId; name: string; location: string; position: WorldPoint; approach: WorldPoint;
  range: number; accent: string; hint: string; description: string; eventId?: EventId; link?: string;
};

export const CAMPUS_DISCOVERIES: CampusDiscovery[] = [
  {
    id: 'gate', name: 'Campus Passport', location: 'MMMUT Gate', position: [0, 1.3, -.8], approach: [0, .015, -2.6],
    range: 1.6, accent: '#f8cd75', hint: 'Follow the painted crossing to the university entrance.',
    description: 'Welcome to Madan Mohan Malaviya University of Technology, Gorakhpur. The Campus Passport records the people, places and events you discover.',
  },
  {
    id: 'neural-nexsus', name: 'Neural Nexsus', location: 'CSE Block · AI Lab', position: [9, .98, 13.75], approach: [9, .015, 12.65],
    range: 1.22, accent: '#70e3d4', hint: 'Enter the CSE Block and look for the glowing lab terminal.',
    description: 'The AI Lab terminal is live. It holds your invitation to the Neural Nexsus AI and machine learning workshop.', eventId: 'neural-nexsus',
  },
  {
    id: 'chief-patron', name: 'Chief Patron’s Desk', location: 'Administration Hall', position: [-10.75, .99, 13.75], approach: [-10.75, .015, 12.65],
    range: 1.12, accent: '#f7c271', hint: 'Look for the welcome letter in Administration Hall.',
    description: 'Prof. Anupama Kaushik Sharma, Vice-Chancellor of MMMUT, is the Chief Patron of CONTINUUM 2027. Explore the festival About page for more on the university leadership.', link: '/about',
  },
  {
    id: 'faculty', name: 'Faculty Coordinators', location: 'Administration Hall', position: [-7.25, 1.12, 13.75], approach: [-7.25, .015, 12.65],
    range: 1.12, accent: '#8ed5bc', hint: 'The faculty directory is on the other side of Administration Hall.',
    description: 'Meet the CSE Head of Department and the faculty coordinators who guide Nexsus and support CONTINUUM.', link: '/about#coordinators-heading',
  },
  {
    id: 'promptx', name: 'PromptX', location: 'Campus Library', position: [9, 1.02, 25.7], approach: [9, .015, 24.52],
    range: 1.18, accent: '#d5a7ff', hint: 'A violet page is tucked into the library’s reading desk.',
    description: 'A loose page invites you to turn a few carefully chosen words into something unexpected. It points to the PromptX challenge.', eventId: 'promptx',
  },
  {
    id: 'dev-house', name: 'Developers’ House', location: 'Builders’ Row', position: [-9.9, .96, 25.72], approach: [-9.9, .015, 24.62],
    range: 1.12, accent: '#8cd9ff', hint: 'The house with the blue awning has a terminal near the back.',
    description: 'Explore how the site was assembled, from the cast of voxel props to the routes and puzzle logic. The Nexsus directory introduces the festival team.', link: '/team',
  },
  {
    id: 'secret', name: 'First Build Archive', location: 'Developers’ House', position: [-6.4, 1.12, 25.6], approach: [-6.4, .015, 24.65],
    range: 1.04, accent: '#ffcb8c', hint: 'Search for a small brass latch near the workshop’s bookshelves.',
    description: 'A tucked-away blueprint shows the first castle route. The forest trail still leads to the original relic hunt.',
  },
  {
    id: 'redstone-rush', name: 'Redstone Rush', location: 'Makers’ Lab', position: [7.15, 1.05, 36.05], approach: [7.15, .015, 35],
    range: 1.12, accent: '#ff9870', hint: 'Find the red circuit cabinet inside the Makers’ Lab.',
    description: 'A circuit board carries the brief for Redstone Rush, the festival’s timed building challenge.', eventId: 'redstone-rush',
  },
  {
    id: 'nexathon', name: 'Nexathon', location: 'Makers’ Lab', position: [10.85, 1.05, 36.05], approach: [10.85, .015, 35],
    range: 1.12, accent: '#92d9ff', hint: 'Look for the blue prototype drawer across the makers’ workbench.',
    description: 'A half-finished prototype holds a Nexathon brief and an invitation to turn an idea into a project.', eventId: 'nexathon',
  },
  {
    id: 'battleforge', name: 'Battleforge', location: 'Festival Arena', position: [-9, 1.2, 34.8], approach: [-9, .015, 32.55],
    range: 1.45, accent: '#ffcf81', hint: 'The arena bracket board faces the entrance to the open-air stage.',
    description: 'The arena board introduces Battleforge and links to the official competition details.', eventId: 'battleforge',
  },
  {
    id: 'keep', name: 'Festival Beacon', location: 'Festival Keep · Lookout', position: [0, 3.37, 51.05], approach: [0, 2.42, 49.95],
    range: 1.45, accent: '#ffe18b', hint: 'Take the stone ramp on the east side of the keep to reach the lookout.',
    description: 'The lookout’s beacon responds to five festival event stamps. From here you can see the roads you walked to collect them.',
  },
  {
    id: 'forest', name: 'Old Castle Trail', location: 'Forest Trail', position: [-18.2, 1.15, 44.8], approach: [-16.9, .015, 44.8],
    range: 1.35, accent: '#c9ec8a', hint: 'A forest sign west of the keep points to the older castle.',
    description: 'Follow this path to the original Castle Relic Hunt, a separate adventure beyond the campus walls.', link: '/explore',
  },
];

export const CAMPUS_INTERACTIONS = CAMPUS_DISCOVERIES;

export type CampusRoom = {
  id: 'cse' | 'admin' | 'library' | 'dev' | 'makers';
  name: string; subtitle: string; x: number; z: number; width: number; depth: number; wall: string; accent: string; roof: string;
};
export const CAMPUS_ROOMS: CampusRoom[] = [
  { id: 'cse', name: 'CSE BLOCK', subtitle: 'Computer Science & Engineering', x: 9, z: 11, width: 8.4, depth: 7.1, wall: '#eee1c5', accent: '#3b9396', roof: '#397c82' },
  { id: 'admin', name: 'ADMINISTRATION', subtitle: 'Welcome Hall · Faculty Office', x: -9, z: 11, width: 8.4, depth: 7.1, wall: '#ead7ad', accent: '#b76b4a', roof: '#9b5445' },
  { id: 'library', name: 'CAMPUS LIBRARY', subtitle: 'Reading Room & Archive', x: 9, z: 23, width: 8.4, depth: 7.1, wall: '#e6dbc8', accent: '#8266a1', roof: '#69567c' },
  { id: 'dev', name: 'DEVELOPERS’ HOUSE', subtitle: 'The workshop behind the world', x: -9, z: 23, width: 8.4, depth: 7.1, wall: '#dfc4a0', accent: '#4f81a7', roof: '#45637c' },
  { id: 'makers', name: 'MAKERS’ LAB', subtitle: 'Build · Test · Tinker', x: 9, z: 33.5, width: 8.4, depth: 7.1, wall: '#e8d7b7', accent: '#b46849', roof: '#895f56' },
];

export const CAMPUS_PALMS: { position: WorldPoint; scale: number }[] = [
  { position: [-4.55, 0, 3.1], scale: 1.16 }, { position: [4.55, 0, 3.1], scale: 1.14 },
  { position: [-4.65, 0, 8.55], scale: 1.02 }, { position: [4.65, 0, 8.55], scale: 1.05 },
  { position: [-4.5, 0, 14.62], scale: 1 }, { position: [4.5, 0, 14.62], scale: 1 },
  { position: [-4.86, 0, 22.72], scale: .9 }, { position: [4.86, 0, 22.72], scale: .95 },
  { position: [-4.8, 0, 30.2], scale: .9 }, { position: [4.75, 0, 30.2], scale: 1.08 },
  { position: [-14, 0, 6.45], scale: 1.02 }, { position: [14, 0, 6.45], scale: 1.1 },
];

export const CAMPUS_STREET_HOUSES: {
  asset: 'houseA' | 'houseB' | 'houseC'; position: WorldPoint; height: number; width: number; depth: number; yaw: number;
}[] = [
  { asset: 'houseA', position: [-8.3, 0, -13.25], height: 4.7, width: 4.6, depth: 3.9, yaw: Math.PI / 2 },
  { asset: 'houseB', position: [8.3, 0, -13.55], height: 4.35, width: 4.1, depth: 3.6, yaw: -Math.PI / 2 },
  { asset: 'houseC', position: [-9.3, 0, -3.2], height: 4.6, width: 4.35, depth: 4, yaw: Math.PI / 2 },
  { asset: 'houseA', position: [9.4, 0, -3.2], height: 4.1, width: 4.5, depth: 3.7, yaw: -Math.PI / 2 },
  { asset: 'houseB', position: [17.2, 0, -5.1], height: 3.65, width: 4, depth: 3.65, yaw: -Math.PI / 2 },
  { asset: 'houseC', position: [-17.2, 0, -4.7], height: 3.95, width: 4.25, depth: 3.9, yaw: Math.PI / 2 },
];

export const CAMPUS_DESKS: WorldPoint[] = [
  [9, 0, 13.65], [-10.75, 0, 13.65], [-7.25, 0, 13.65], [9, 0, 25.65],
  [-9.9, 0, 25.65], [7.15, 0, 36.05], [10.85, 0, 36.05],
  [6.35, 0, 11.48], [11.65, 0, 11.48], [-11.8, 0, 22.25],
];
export const CAMPUS_SHELVES: { position: WorldPoint; yaw: number }[] = [
  { position: [6.02, 0, 23.25], yaw: Math.PI / 2 },
  { position: [11.98, 0, 23.25], yaw: -Math.PI / 2 },
  { position: [-6.28, 0, 26.08], yaw: Math.PI },
];

const block = (position: WorldPoint, size: WorldPoint, color: string, solid = false): CampusBlock => ({ position, size, color, solid });
const GATE_DEPTH = .55;
const CREAM = '#ebd8b2';
const STONE = '#c6ab83';
const COPPER = '#a66b50';
const WALL_H = 3.1;
export const ROOM_HEIGHT = WALL_H;
export const ROOM_DOOR_WIDTH = 2.25;

function roomStructure(room: CampusRoom): CampusBlock[] {
  const { x, z, width, depth, wall, accent, roof } = room;
  const front = z - depth / 2, back = z + depth / 2;
  const wing = (width - ROOM_DOOR_WIDTH) / 2;
  return [
    block([x, -.024, z], [width, .055, depth], '#d9b898'),
    block([x, WALL_H / 2, back], [width, WALL_H, .32], wall, true),
    block([x - width / 2, WALL_H / 2, z], [.32, WALL_H, depth], wall, true),
    block([x + width / 2, WALL_H / 2, z], [.32, WALL_H, depth], wall, true),
    block([x - ROOM_DOOR_WIDTH / 2 - wing / 2, WALL_H / 2, front], [wing, WALL_H, .34], wall, true),
    block([x + ROOM_DOOR_WIDTH / 2 + wing / 2, WALL_H / 2, front], [wing, WALL_H, .34], wall, true),
    block([x, 2.79, front], [ROOM_DOOR_WIDTH, .62, .34], accent, true),
    block([x, WALL_H + .17, z], [width + .47, .34, depth + .56], roof, true),
    block([x, WALL_H + .48, z + .25], [width - .45, .29, depth - .7], accent),
    block([x, WALL_H + .68, z + .32], [width - 1.2, .14, depth - 1.4], roof),
  ];
}

const keepFront = 42.7;
const keepBack = 54.2;
const keepDepth = keepBack - keepFront;
const keepZ = (keepFront + keepBack) / 2;
const keepHalf = 6.2;

const KEEP_BLOCKS = [
  block([0, 2.28, keepZ], [keepHalf * 2, .24, keepDepth], STONE, true),
  block([0, 1.1, keepBack], [keepHalf * 2, 2.2, .44], CREAM, true),
  block([-keepHalf, 1.1, keepZ], [.44, 2.2, keepDepth], CREAM, true),
  block([keepHalf, 1.1, keepZ], [.44, 2.2, keepDepth], CREAM, true),
  block([-3.93, 1.1, keepFront], [4.54, 2.2, .44], CREAM, true),
  block([3.93, 1.1, keepFront], [4.54, 2.2, .44], CREAM, true),
  block([0, 2.15, keepFront], [3.32, .54, .58], STONE, true),
  block([0, 2.68, keepFront], [keepHalf * 2, .56, .46], CREAM, true),
  block([0, 2.68, keepBack], [keepHalf * 2, .56, .46], CREAM, true),
  block([-keepHalf, 2.68, keepZ], [.46, .56, keepDepth], CREAM, true),
  block([keepHalf, 2.68, 45.15], [.46, .56, 4.9], CREAM, true),
  block([keepHalf, 2.68, 53.55], [.46, .56, 1.3], CREAM, true),
  block([7.3, 2.28, 50.25], [2.7, .24, 3.1], STONE, true),
  block([0, .005, keepZ], [keepHalf * 2, .015, keepDepth], '#c8b08a'),
  block([0, 2.63, 51.05], [1.38, .46, 1.24], COPPER, true),
  ...[-1, 1].flatMap(side => [keepFront + 1.05, keepBack - 1.05].flatMap(z => [
    block([side * (keepHalf - .5), 2.08, z], [2.4, 4.16, 2.36], STONE, true),
    block([side * (keepHalf - .5), 3.9, z], [2.58, .3, 2.55], CREAM),
  ])),
];

const FOUNTAIN_CENTER: WorldPoint = [0, 0, 10.7];
export const CAMPUS_FOUNTAIN = FOUNTAIN_CENTER;
export const CAMPUS_BLOCKS: CampusBlock[] = [
  block([0, -.48, 17], [58, .96, 88], '#8fa363', true),
  block([0, .006, -9.85], [5.6, .012, 23.6], '#777a74'),
  block([0, .009, 18.5], [5.8, .012, 37], '#d5c3a6'),
  block([0, .011, 7.98], [11.8, .012, 5.75], '#ded0b6'),
  block([0, .011, 13.4], [11.8, .012, 5.75], '#ded0b6'),
  ...[-1, 1].flatMap(side => [
    block([side * 3.28, .013, -9.85], [.95, .017, 23.6], '#d6c7af'),
    block([side * 4.38, .014, 10.7], [2.55, .016, 11], '#d6c7af'),
    block([side * 5.65, .014, 18.5], [1.0, .016, 34], '#cbbba2'),
    block([side * 6.75, .014, 5.95], [4.5, .016, 3.5], '#d4c6ac'),
    block([side * 6.75, .014, 17.95], [4.5, .016, 3.5], '#d4c6ac'),
    block([side * 6.75, .014, 28.45], [4.5, .016, 3.5], '#d4c6ac'),
    block([side * 16, .49, .15], [22, .98, GATE_DEPTH], '#b7a18a', true),
    block([side * 16, 1.04, .15], [22.08, .16, GATE_DEPTH + .18], '#eed8aa'),
    block([side * 27.4, .49, 28.8], [.52, .98, 57.5], '#b7a18a', true),
    block([side * 27.4, 1.04, 28.8], [.66, .16, 57.6], '#ead8ad'),
  ]),
  block([0, .48, 57.9], [54.6, .96, .53], '#b7a18a', true),
  block([0, 1.02, 57.9], [54.7, .15, .68], '#ead8ad'),
  block([0, .19, 10.7], [4.4, .38, 4.4], '#bda88d', true),
  block([0, .012, 38.5], [15.3, .018, 4.3], '#d8c7a7'),
  block([-10.35, .01, 44.8], [15, .012, 2.05], '#c6b28f'),
  block([-9, .155, 35.3], [7.8, .31, 4.7], '#b67b65', true),
  block([-9, .052, 32.65], [5.8, .104, .65], '#c89b7c', true),
  block([-9, 1.52, 37.68], [8, 3.04, .32], '#685575', true),
  block([-12.83, 1.52, 35.5], [.36, 3.04, 4.5], '#e3bc91', true),
  block([-5.17, 1.52, 35.5], [.36, 3.04, 4.5], '#e3bc91', true),
  ...CAMPUS_ROOMS.flatMap(roomStructure),
  ...KEEP_BLOCKS,
];

const rampDepth = 8;
const rampRise = 2.4;
const rampAngle = Math.atan2(rampRise, rampDepth);
export const CAMPUS_RAMPS: { position: WorldPoint; size: WorldPoint; rotation: WorldPoint }[] = [
  {
    position: [7.7, rampRise / 2 - .08 * Math.cos(rampAngle), 45.3 + .08 * Math.sin(rampAngle)],
    size: [1.82, .16, Math.hypot(rampDepth, rampRise)],
    rotation: [-rampAngle, 0, 0],
  },
];

export const CAMPUS_COLLIDERS: readonly { position: WorldPoint; size: WorldPoint }[] = [
  ...CAMPUS_BLOCKS.filter(item => item.solid).map(({ position, size }) => ({ position, size })),
  ...CAMPUS_STREET_HOUSES.map(({ position: [x, , z], height, width, depth }) => ({
    position: [x, height * .34, z] as WorldPoint, size: [depth * .84, height * .68, width * .86] as WorldPoint,
  })),
  ...CAMPUS_PALMS.map(({ position: [x, , z], scale }) => ({
    position: [x, 1.78 * scale, z] as WorldPoint, size: [.34, 3.56 * scale, .34] as WorldPoint,
  })),
  ...CAMPUS_DESKS.map(([x, , z]) => ({ position: [x, .38, z] as WorldPoint, size: [1.15, .76, .55] as WorldPoint })),
  ...CAMPUS_SHELVES.map(({ position: [x, , z], yaw }) => ({
    position: [x, .8, z] as WorldPoint, size: Math.abs(yaw) === Math.PI / 2 ? [.42, 1.6, 1.12] as WorldPoint : [1.12, 1.6, .42] as WorldPoint,
  })),
];
