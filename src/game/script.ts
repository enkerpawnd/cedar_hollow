import type { Game } from './game';
import type { Co } from './types';

export const waitFlag = (g: Game, f: string) => () => g.flag(f);

// Waits for the player to click / press space or enter — used to page the
// opening text at the reader's own pace rather than on a timer.
export const waitTap = (g: Game) => () => g.takeAdvance();

export function* delayedSay(g: Game, delay: number, text: string): Co {
  yield delay;
  g.say(text);
}
