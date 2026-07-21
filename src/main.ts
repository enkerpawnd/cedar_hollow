import { Game } from './game/game';
import { clearPressed } from './engine/input';

const game = new Game();
let last = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.render();
  clearPressed();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
