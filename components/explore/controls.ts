import type { CheckpointId } from '@/lib/explore-world';

export type MoveControl = 'forward' | 'back' | 'left' | 'right';

export type ExploreInput = {
  keys: Set<string>;
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  jump: boolean;
  vault: boolean;
  touchCrouch: boolean;
  recenter: boolean;
  respawn: CheckpointId;
  reset: number;
  wake?: () => void;
};

export const MOVEMENT_KEYS: Record<MoveControl, string[]> = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};

export const GAME_KEYS = new Set([...Object.values(MOVEMENT_KEYS).flat(), 'Space', 'KeyC', 'KeyE', 'KeyQ', 'KeyR', 'KeyF', 'ShiftLeft', 'ShiftRight']);

export function newExploreInput(): ExploreInput {
  return {
    keys: new Set(), moveX: 0, moveY: 0, lookX: 0, lookY: 0, jump: false, vault: false,
    touchCrouch: false, recenter: false, respawn: 'gate', reset: 0,
  };
}

export function clearExploreInput(input: ExploreInput) {
  input.keys.clear();
  input.moveX = 0;
  input.moveY = 0;
  input.lookX = 0;
  input.lookY = 0;
  input.jump = false;
  input.vault = false;
  input.recenter = false;
}
