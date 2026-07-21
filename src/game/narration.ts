import { W, H } from '../engine/screen';
import type { Ctx2D } from './types';

const CPS = 30; // reveal speed, characters per second

interface Line {
  text: string;
  t: number;
}

// Sam's sparse interior monologue: bottom of screen, one line at a time.
export class Narration {
  private queue: string[] = [];
  private cur: Line | null = null;

  say(text: string): void {
    this.queue.push(text);
  }

  update(dt: number): void {
    if (this.cur) {
      this.cur.t += dt;
      const total = this.cur.text.length / CPS + 2.4;
      if (this.cur.t > total + 0.5) this.cur = null;
    }
    if (!this.cur && this.queue.length) {
      this.cur = { text: this.queue.shift()!, t: 0 };
    }
  }

  render(ctx: Ctx2D): void {
    if (!this.cur) return;
    const { text, t } = this.cur;
    const total = text.length / CPS + 2.4;
    const a = Math.max(0, Math.min(1, t * 4, (total + 0.5 - t) * 2));
    const shown = text.slice(0, Math.floor(t * CPS));
    ctx.font = 'italic 19px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(10,12,20,${a * 0.55})`;
    const w = ctx.measureText(text).width;
    ctx.fillRect(W / 2 - w / 2 - 16, H - 66, w + 32, 32);
    ctx.fillStyle = `rgba(207,212,224,${a})`;
    ctx.fillText(shown, W / 2, H - 44);
  }
}
