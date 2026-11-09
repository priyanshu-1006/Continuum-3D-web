/** Coordinates preserve the source GLB's root transform, then translate [-.25,-9,0]. */
export type WorldPoint = [number, number, number];

export type JourneyProgress = {
  index: number;
  blend: number;
  previous: number;
  jump: boolean;
  introProgress?: number;
  /** Optional absolute path fraction. Without it, chapter stops and blend drive travel. */
  routeProgress?: number;
  direction?: number;
};

export type ScreenStation = {
  slug: string;
  position: WorldPoint;
  cameraPosition: WorldPoint;
  rotation: number;
  accent: string;
  poster: string;
  groundY: number;
  width: number;
};

export const SCREEN_WIDTH = 2.6;
export const SCREEN_HEIGHT = SCREEN_WIDTH * 9 / 16;

/** Finish the illustrated-to-WebGL handoff late in the existing entrance dolly. */
export const HERO_SCENERY_END = 0.82;

/**
 * Measured centerline through the source castle's outer arch, raised village
 * avenue and inner arch, followed by the collision-audited courtyard turn.
 * Keep these corners linear: a smoothing spline would cut the narrow rails.
 */
export const WALK_ROUTE: WorldPoint[] = [
  [0, 0, -23.5], [0, 0, -20], [0, 0, -17], [0, 0, -13],
  [0, 0, -9], [0, 0, -5.2], [0, 0, -3], [0, 0, -2],
  [0.1, 0, -1.8], [0.4, 0, -1.4], [0.8, 0, -1],
  [0.8, 0, -0.9], [1.1, 0, -0.6], [1.8, 0, -0.6], [3.5, 0, -0.6],
];

const distances = [0];
for (let index = 1; index < WALK_ROUTE.length; index++) {
  const a = WALK_ROUTE[index - 1], b = WALK_ROUTE[index];
  distances.push(distances[index - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
}
export const ROUTE_LENGTH = distances[distances.length - 1];
export const JOURNEY_STOPS = [0, distances[2], distances[3] + 1, distances[4], distances[9], ROUTE_LENGTH, ROUTE_LENGTH].map(distance => distance / ROUTE_LENGTH);
export const STOP_FRACTIONS = JOURNEY_STOPS;

// Place panels on alternating sides of the bridge and turn the last view
// across the courtyard. Camera anchors and panel faces clear the source mesh.
const STATIONS: Omit<ScreenStation, "rotation" | "poster">[] = [
  { slug: "neural-nexsus", position: [1.75, 2.15, -14.2], cameraPosition: [0, 1.85, -18.4], accent: "#84e7b9", groundY: -2.5, width: 2.45 },
  { slug: "promptx", position: [-1.8, 2, -10.8], cameraPosition: [0, 2.65, -14.5], accent: "#bd9bff", groundY: -2.5, width: 2.45 },
  { slug: "nexathon", position: [1.75, 2.6, -8.1], cameraPosition: [0, 3.25, -11.6], accent: "#6fdde9", groundY: -2.5, width: 2.45 },
  { slug: "redstone-rush", position: [-0.8, 2.15, 0.45], cameraPosition: [0, 1.776, -3.5], accent: "#f27963", groundY: 0, width: 2.45 },
  { slug: "battleforge", position: [4.55, 2.15, -0.1], cameraPosition: [1.45, 2.7, -0.6], accent: "#e8c176", groundY: 0, width: 2.1 },
];
export const SCREEN_STATIONS: ScreenStation[] = STATIONS.map(station => ({
  ...station,
  rotation: Math.atan2(station.cameraPosition[0] - station.position[0], station.cameraPosition[2] - station.position[2]),
  poster: `/assets/posters/${station.slug}.webp`,
}));

/** Thin, reversible additions bridge three measured quarter-block deck notches. */
export const BRIDGE_PATCHES: WorldPoint[] = [[0, -0.025, -20.375], [0, -0.025, -19.125], [0, -0.025, -4.375]];

const clamp = (value: number, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

export function resolveRouteProgress(state: JourneyProgress) {
  if (Number.isFinite(state.routeProgress)) return clamp(state.routeProgress!);
  const index = clamp(Math.round(state.index), 0, 6);
  const previous = clamp(Math.round(state.previous), 0, 6);
  const blend = state.jump ? 1 : clamp(state.blend);
  return JOURNEY_STOPS[previous] + (JOURNEY_STOPS[index] - JOURNEY_STOPS[previous]) * blend;
}

export function getRouteSample(progress: number): { position: WorldPoint; tangent: WorldPoint } {
  const wanted = progress * ROUTE_LENGTH;
  let segment = 1;
  while (segment < distances.length - 1 && distances[segment] < wanted) segment++;
  const a = WALK_ROUTE[segment - 1], b = WALK_ROUTE[segment];
  const length = distances[segment] - distances[segment - 1];
  const blend = (wanted - distances[segment - 1]) / length;
  const position: WorldPoint = [a[0] + (b[0] - a[0]) * blend, a[1] + (b[1] - a[1]) * blend, a[2] + (b[2] - a[2]) * blend];
  const tangent: WorldPoint = [(b[0] - a[0]) / length, (b[1] - a[1]) / length, (b[2] - a[2]) / length];
  return { position, tangent };
}

/** Dip under the transverse bars at the exit of the outer arch and inside the inner gate. */
export function getCameraHeight(position: WorldPoint) {
  if (Math.abs(position[0]) > 0.4) return 1.85;
  const z = position[2];
  const outer = Math.min(clamp((z + 22.5) / 0.7), clamp((-19.2 - z) / 0.4));
  const inner = Math.min(clamp((z + 5.15) / 0.35), clamp((-3.45 - z) / 0.35));
  return 1.85 - Math.max(outer, inner) * 0.52;
}

