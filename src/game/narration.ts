import { W, H } from '../engine/screen';
import type { Ctx2D } from './types';

const CPS = 30; // reveal speed, characters per second

type Kind = 'story' | 'chatter';

interface Line {
  text: string;
  t: number;
  kind: Kind;
}

// Sam's sparse interior monologue: bottom of screen, one line at a time.
// Two channels: story lines (from the act scripts) always play, in order,
// and jump ahead of examine chatter. Chatter never backlogs — a new
// interaction replaces whatever the last one was still saying.
export class Narration {
  private story: string[] = [];
  private group: string[] = [];
  private cur: Line | null = null;

  say(text: string): void {
    this.story.push(text);
  }

  remark(...lines: string[]): void {
    this.group = lines.slice();
    if (this.cur?.kind === 'chatter') this.cur = null;
  }

  private dur(text: string): number {
    return text.length / CPS + 2.4;
  }

  update(dt: number): void {
    if (this.cur) {
      this.cur.t += dt;
      if (this.cur.kind === 'chatter' && this.story.length) this.cur = null;
      else if (this.cur.t > this.dur(this.cur.text) + 0.5) this.cur = null;
    }
    if (!this.cur) {
      if (this.story.length) this.cur = { text: this.story.shift()!, t: 0, kind: 'story' };
      else if (this.group.length) this.cur = { text: this.group.shift()!, t: 0, kind: 'chatter' };
    }
  }

  render(ctx: Ctx2D): void {
    if (!this.cur) return;
    const { text, t } = this.cur;
    const total = this.dur(text);
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
