import { W, H } from '../engine/screen';
import type { Game } from './game';
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

  render(ctx: Ctx2D, g: Game): void {
    if (!this.cur) return;
    const { text, t } = this.cur;
    const total = this.dur(text);
    const a = Math.max(0, Math.min(1, t * 4, (total + 0.5 - t) * 2));
    const shown = text.slice(0, Math.floor(t * CPS));

    // Fit beside the phone: the caption's usable width shrinks and its center
    // slides left as the phone panel comes up. Driven by phone.slide (0…1),
    // which itself eases, so paging TAB repeatedly never snaps.
    const slide = g.phone.slide;
    const phoneEdge = W - 252 - 26 - 8; // left edge of the phone's outer shell
    const left = 40;
    const rightFull = W - 40;
    const rightOpen = phoneEdge - 16;
    const right = rightFull + (rightOpen - rightFull) * slide;
    const cx = (left + right) / 2;
    const maxW = right - left;

    let size = 19;
    ctx.font = `italic ${size}px Georgia, serif`;
    let tw = ctx.measureText(text).width;
    if (tw > maxW) {
      size = Math.max(13, Math.floor((size * maxW) / tw));
      ctx.font = `italic ${size}px Georgia, serif`;
      tw = ctx.measureText(text).width;
    }
    const boxW = Math.min(tw, maxW);

    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(10,12,20,${a * 0.55})`;
    ctx.fillRect(cx - boxW / 2 - 16, H - 66, boxW + 32, 32);
    ctx.fillStyle = `rgba(207,212,224,${a})`;
    ctx.fillText(shown, cx, H - 44);
  }
}
