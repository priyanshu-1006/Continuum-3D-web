export type MoveControl = 'forward' | 'back' | 'left' | 'right';

export type ExploreInput = {
  keys: Set<string>;
  touch: Set<MoveControl>;
  lookX: number;
  lookY: number;
  jump: boolean;
  vault: boolean;
  touchCrouch: boolean;
  reset: number;
  wake?: () => void;
};

export const MOVEMENT_KEYS: Record<MoveControl, string[]> = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};

export const GAME_KEYS = new Set([...Object.values(MOVEMENT_KEYS).flat(), 'Space', 'KeyC', 'KeyE', 'KeyQ', 'KeyR']);

export function newExploreInput(): ExploreInput {
  return { keys: new Set(), touch: new Set(), lookX: 0, lookY: 0, jump: false, vault: false, touchCrouch: false, reset: 0 };
}

export function clearExploreInput(input: ExploreInput) {
  input.keys.clear();
  input.touch.clear();
  input.lookX = 0;
  input.lookY = 0;
  input.jump = false;
  input.vault = false;
}
