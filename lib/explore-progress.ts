import { QUEST_CHECKPOINTS, RELICS, type CheckpointId, type QuestInteractableId, type RelicId } from './explore-world';

export type QuestProgress = {
  relics: RelicId[];
  chestOpen: boolean;
  gateOpen: boolean;
  bridgeStep: 0 | 1 | 2;
  beaconLit: boolean;
  secretFound: boolean;
  checkpoint: CheckpointId;
};

export const HUNT_SAVE = 'continuum-castle-hunt-v1';
export const BRIDGE_CLUE = 'Light the amber lantern first, then the blue.';
export const newQuest = (): QuestProgress => ({
  relics: [], chestOpen: false, gateOpen: false, bridgeStep: 0, beaconLit: false, secretFound: false, checkpoint: 'gate',
});

export function readQuest(raw: string | null): QuestProgress {
  const initial = newQuest();
  if (!raw) return initial;
  try {
    const value = JSON.parse(raw) as Partial<QuestProgress> | null;
    if (!value || !Array.isArray(value.relics)) return initial;
    const gateOpen = value.gateOpen === true;
    const chestOpen = value.chestOpen === true && value.relics.includes('moon-key');
    const bridgeStep = chestOpen && (value.bridgeStep === 1 || value.bridgeStep === 2) ? value.bridgeStep : 0;
    const relics = RELICS.filter(({ id }) => value.relics?.includes(id)
      && (id !== 'gate-seal' || gateOpen) && (id !== 'wayfinder' || bridgeStep === 2)).map(({ id }) => id);
    const beaconLit = value.beaconLit === true && relics.length === RELICS.length;
    const checkpoint = typeof value.checkpoint === 'string' && Object.hasOwn(QUEST_CHECKPOINTS, value.checkpoint)
      && gateOpen ? value.checkpoint : 'gate';
    return { relics, gateOpen, chestOpen, bridgeStep, beaconLit, secretFound: beaconLit && value.secretFound === true, checkpoint };
  } catch { return initial; }
}

export type QuestCue = 'step' | 'land' | 'chest' | 'gate' | 'collect' | 'switch' | 'beacon';

export function interactQuest(progress: QuestProgress, id: QuestInteractableId): {
  progress: QuestProgress; notice: string; cue?: QuestCue;
} {
  switch (id) {
    case 'chest':
      return progress.relics.includes('moon-key')
        ? { progress: { ...progress, chestOpen: true }, notice: BRIDGE_CLUE, cue: 'chest' }
        : { progress, notice: 'The chest is locked. Look beneath the shelter for the Moon Key.' };
    case 'gate-lever':
      return { progress: { ...progress, gateOpen: true }, notice: 'The portcullis rises. Follow the road through the arch.', cue: 'gate' };
    case 'bridge-left':
    case 'bridge-right':
      if (!progress.chestOpen) return { progress, notice: 'Look for the bridge keeper’s note in the gateyard chest.' };
      if (progress.bridgeStep === 2) return { progress, notice: 'Both bridge lanterns are lit.' };
      if (id === 'bridge-left') {
        return { progress: { ...progress, bridgeStep: 1 }, notice: 'Amber lantern lit. Find the blue lever.', cue: 'switch' };
      }
      return progress.bridgeStep === 1
        ? { progress: { ...progress, bridgeStep: 2 }, notice: 'The compass has appeared beside the bridge railing.', cue: 'switch' }
        : { progress, notice: 'The blue lantern flickers out. Read the bridge keeper’s note in your journal.', cue: 'switch' };
    case 'altar':
      return progress.relics.length === RELICS.length
        ? { progress: { ...progress, beaconLit: true }, notice: 'The beacon is lit. Look up!', cue: 'beacon' }
        : { progress, notice: 'The altar has five sockets. Bring back the remaining relics.' };
    case 'secret':
      return progress.beaconLit
        ? { progress: { ...progress, secretFound: true }, notice: 'Secret found. The Nexsus pennant is yours!', cue: 'collect' }
        : { progress, notice: 'The socket is cold. It needs the light of the beacon.' };
  }
}
