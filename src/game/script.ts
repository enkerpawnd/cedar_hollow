import type { Game } from './game';
import type { Co } from './types';

export const waitFlag = (g: Game, f: string) => () => g.flag(f);

export function* delayedSay(g: Game, delay: number, text: string): Co {
  yield delay;
  g.say(text);
}
