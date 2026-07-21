const down = new Set<string>();
const pressedSet = new Set<string>();

export function initInput(): void {
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'tab' || k === ' ') e.preventDefault();
    if (!down.has(k)) {
      down.add(k);
      pressedSet.add(k);
    }
  });
  addEventListener('keyup', (e) => down.delete(e.key.toLowerCase()));
  addEventListener('blur', () => down.clear());
}

export function isDown(...keys: string[]): boolean {
  return keys.some((k) => down.has(k));
}

// True on the frame the key went down. Cleared once per frame in the main loop.
export function pressed(...keys: string[]): boolean {
  return keys.some((k) => pressedSet.has(k));
}

export function clearPressed(): void {
  pressedSet.clear();
}
