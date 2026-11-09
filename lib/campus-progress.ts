import { CAMPUS_CHECKPOINTS, CAMPUS_DISCOVERIES, type CampusDiscoveryId } from './campus-world';
import { events, type EventId } from './events';

export const CAMPUS_SAVE_KEY = 'continuum-campus-passport-v1';

export type CampusProgress = {
  gateOpen: boolean;
  discoveries: CampusDiscoveryId[];
  checkpoint: string;
  beaconLit: boolean;
};

export function newCampusProgress(): CampusProgress {
  return {
    gateOpen: false,
    discoveries: [],
    checkpoint: CAMPUS_CHECKPOINTS[0].id,
    beaconLit: false,
  };
}

export function campusStamps(discoveries: readonly CampusDiscoveryId[]) {
  const found = new Set(discoveries);
  const stamps = new Set<EventId>();
  for (const stop of CAMPUS_DISCOVERIES) {
    if ('eventId' in stop && stop.eventId && found.has(stop.id)) stamps.add(stop.eventId);
  }
  return stamps;
}

export function readCampusProgress(saved: string | null): CampusProgress {
  const initial = newCampusProgress();
  if (!saved) return initial;
  try {
    const raw = JSON.parse(saved) as Partial<CampusProgress> | null;
    if (!raw || typeof raw !== 'object') return initial;
    const found = new Set(Array.isArray(raw.discoveries) ? raw.discoveries : []);
    const gateOpen = raw.gateOpen === true;
    const checkpoint = gateOpen && typeof raw.checkpoint === 'string' && CAMPUS_CHECKPOINTS.some(spot => spot.id === raw.checkpoint)
      ? raw.checkpoint
      : initial.checkpoint;
    const discoveries = CAMPUS_DISCOVERIES.filter(stop => found.has(stop.id)).map(stop => stop.id);
    const stamps = campusStamps(discoveries);
    return {
      gateOpen,
      discoveries,
      checkpoint,
      beaconLit: gateOpen && raw.beaconLit === true && events.every(event => stamps.has(event.slug)),
    };
  } catch {
    return initial;
  }
}
