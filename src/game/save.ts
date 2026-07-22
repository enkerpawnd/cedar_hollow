// Checkpoint saves in localStorage. The act scripts are live coroutines and
// can't be serialized mid-flight, so saves are act boundaries — each act
// start writes a checkpoint, and continuing rebuilds the world from flags
// (the same reconstruction the ?act= dev URLs use). No server involved.

export type Checkpoint = 'act2' | 'act3' | 'act4' | 'act4b';

const KEY = 'cedar-hollow-save';
const VALID: Checkpoint[] = ['act2', 'act3', 'act4', 'act4b'];

export const CHECKPOINT_LABELS: Record<Checkpoint, string> = {
  act2: 'the second morning',
  act3: 'nightfall',
  act4: 'the night',
  act4b: 'the night — barricaded',
};

export function saveCheckpoint(cp: Checkpoint): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ cp, at: Date.now() }));
  } catch {
    // private browsing or storage denied; the game just won't persist
  }
}

export function loadCheckpoint(): Checkpoint | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const cp = (JSON.parse(raw) as { cp?: string }).cp;
    return VALID.includes(cp as Checkpoint) ? (cp as Checkpoint) : null;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
