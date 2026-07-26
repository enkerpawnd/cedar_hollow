import { W, H } from '../engine/screen';
import type { Game } from './game';
import type { Ctx2D } from './types';

export interface Msg {
  from: 'sam' | 'ellis';
  text: string;
  status?: 'sending' | 'delivered';
}

function wrap(ctx: Ctx2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export class Phone {
  open = false;
  slide = 0;
  msgs: Msg[] = [];
  signal = 1;
  unread = 0;
  draft: { text: string; onSent: (m: Msg) => void } | null = null;
  dial: { label: string; onDial: () => void } | null = null;
  call: { phase: 'ringing' | 'dialing' | 'active'; t: number; label: string } | null = null;
  private sigT = 0;
  private ringT = 0;

  update(dt: number, g: Game): void {
    this.slide += ((this.open ? 1 : 0) - this.slide) * Math.min(1, dt * 10);
    this.sigT -= dt;
    if (this.sigT <= 0) {
      this.sigT = 2.5 + Math.random() * 3;
      const d = Math.random();
      this.signal = Math.max(0, Math.min(3, this.signal + (d < 0.35 ? -1 : d < 0.75 ? 0 : 1)));
    }
    if (this.call) {
      this.call.t += dt;
      if (this.call.phase === 'ringing') {
        this.ringT -= dt;
        if (this.ringT <= 0) {
          this.ringT = 1.5;
          g.sound.play('buzz', { vol: 0.45 });
        }
      } else if (this.call.phase === 'dialing') {
        this.ringT -= dt;
        if (this.ringT <= 0) {
          this.ringT = 1.4;
          g.sound.play('buzz', { vol: 0.15, rate: 1.3 });
        }
      }
    }
  }

  startCall(_g: Game): void {
    this.call = { phase: 'ringing', t: 0, label: 'UNKNOWN NUMBER' };
    this.ringT = 0;
    this.open = true;
  }

  // Sam dials out. One bar and a prayer.
  startDial(label: string): void {
    this.call = { phase: 'dialing', t: 0, label };
    this.ringT = 0;
    this.open = true;
  }

  answer(g: Game): void {
    if (!this.call) return;
    this.call.phase = 'active';
    this.call.t = 0;
    g.setFlag('call_answered');
    g.sound.play('switch', { vol: 0.3 });
  }

  endCall(g: Game): void {
    this.call = null;
    g.sound.play('switch', { vol: 0.35 });
  }

  // Pin the signal bars at a level for a while (scripted dead zones).
  forceSignal(level: number, dur: number): void {
    this.signal = level;
    this.sigT = dur;
  }

  toggle(g: Game): void {
    this.open = !this.open;
    if (this.open) this.unread = 0;
    g.sound.play('switch', { vol: 0.3 });
  }

  send(g: Game): void {
    if (!this.draft) return;
    const m: Msg = { from: 'sam', text: this.draft.text, status: 'sending' };
    this.msgs.push(m);
    const cb = this.draft.onSent;
    this.draft = null;
    g.sound.play('text', { vol: 0.35 });
    cb(m);
  }

  receive(text: string, g: Game): void {
    this.msgs.push({ from: 'ellis', text });
    g.sound.play('buzz', { vol: 0.5 });
    if (!this.open) this.unread++;
  }

  render(ctx: Ctx2D, g: Game): void {
    if (this.slide < 0.01) {
      if (this.unread > 0 || this.draft || this.dial) {
        const pulse = 0.5 + 0.5 * Math.sin(g.time * 5);
        ctx.fillStyle = `rgba(240,200,120,${0.3 + 0.4 * pulse})`;
        ctx.beginPath();
        ctx.arc(W - 26, 28, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,208,225,0.55)';
        ctx.font = '10px -apple-system, "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        const label = this.unread > 0 ? 'TAB — new message' : this.dial ? 'TAB — 911' : 'TAB — phone';
        ctx.fillText(label, W - 38, 32);
      }
      return;
    }

    const pw = 252;
    const ph = 442;
    const px = W - pw - 26;
    const py = H - (ph + 18) * this.slide;

    ctx.save();
    ctx.fillStyle = '#05070c';
    ctx.beginPath();
    ctx.roundRect(px - 8, py - 8, pw + 16, ph + 16, 22);
    ctx.fill();
    ctx.strokeStyle = '#1c2230';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 14);
    ctx.clip();
    ctx.fillStyle = '#0b0e17';
    ctx.fillRect(px, py, pw, ph);

    // header
    ctx.fillStyle = '#101527';
    ctx.fillRect(px, py, pw, 44);
    ctx.fillStyle = '#d5dce8';
    ctx.font = '600 13px -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.call ? this.call.label : 'ELLIS M', px + 14, py + 27);
    for (let i = 0; i < 4; i++) {
      const bh = 3 + i * 3;
      ctx.fillStyle = i < this.signal ? '#cfd8e8' : 'rgba(207,216,232,0.22)';
      ctx.fillRect(px + pw - 38 + i * 7, py + 30 - bh, 4, bh);
    }

    if (this.call) {
      ctx.textAlign = 'center';
      if (this.call.phase === 'ringing') {
        const pulse = 0.5 + 0.5 * Math.sin(g.time * 6);
        ctx.font = '14px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = `rgba(213,220,232,${0.5 + 0.4 * pulse})`;
        ctx.fillText('incoming call', px + pw / 2, py + 190);
        ctx.font = '600 11px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = `rgba(143,208,160,${0.5 + 0.5 * pulse})`;
        ctx.fillText('E — ANSWER', px + pw / 2, py + 250);
      } else if (this.call.phase === 'dialing') {
        const pulse = 0.5 + 0.5 * Math.sin(g.time * 4);
        ctx.font = '14px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = `rgba(213,220,232,${0.4 + 0.4 * pulse})`;
        ctx.fillText('calling…', px + pw / 2, py + 190);
        const dots = 1 + (Math.floor(g.time * 1.2) % 3);
        ctx.fillStyle = 'rgba(139,147,165,0.5)';
        ctx.fillText('· '.repeat(dots).trim(), px + pw / 2, py + 230);
      } else {
        const s = Math.floor(this.call.t);
        ctx.font = '15px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(213,220,232,0.85)';
        ctx.fillText(`00:${String(s).padStart(2, '0')}`, px + pw / 2, py + 190);
        const dots = 1 + (Math.floor(g.time * 0.8) % 3);
        ctx.fillStyle = 'rgba(139,147,165,0.5)';
        ctx.fillText('· '.repeat(dots).trim(), px + pw / 2, py + 230);
      }
      ctx.restore();
      return;
    }

    // thread, newest at the bottom
    ctx.font = '12px -apple-system, "Segoe UI", sans-serif';
    let y = py + ph - 64;
    for (let i = this.msgs.length - 1; i >= 0; i--) {
      const m = this.msgs[i];
      const lines = wrap(ctx, m.text, 156);
      let bw = 0;
      for (const l of lines) bw = Math.max(bw, ctx.measureText(l).width);
      bw += 20;
      const bh = lines.length * 16 + 12;

      if (i === this.msgs.length - 1 && m.from === 'sam' && m.status) {
        ctx.fillStyle = 'rgba(139,147,165,0.8)';
        ctx.font = '10px -apple-system, "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        const dots = '.'.repeat(1 + (Math.floor(g.time * 2) % 3));
        ctx.fillText(m.status === 'sending' ? `sending${dots}` : 'delivered', px + pw - 16, y + 8);
        ctx.font = '12px -apple-system, "Segoe UI", sans-serif';
        y -= 14;
      }

      y -= bh;
      if (y < py + 52) break;
      const bx = m.from === 'sam' ? px + pw - 12 - bw : px + 12;
      ctx.fillStyle = m.from === 'sam' ? '#2f4a3a' : '#1a2130';
      ctx.beginPath();
      ctx.roundRect(bx, y, bw, bh, 10);
      ctx.fill();
      ctx.fillStyle = m.from === 'sam' ? '#dfe8df' : '#cfd8e6';
      ctx.textAlign = 'left';
      lines.forEach((l, j) => ctx.fillText(l, bx + 10, y + 18 + j * 16));
      y -= 8;
    }

    // draft bar
    ctx.fillStyle = '#0f1424';
    ctx.beginPath();
    ctx.roundRect(px + 10, py + ph - 46, pw - 20, 34, 9);
    ctx.fill();
    if (this.draft) {
      ctx.fillStyle = '#b9c2d4';
      ctx.font = '11px -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      const line = wrap(ctx, this.draft.text, 150)[0] ?? '';
      ctx.fillText(line + (line.length < this.draft.text.length ? '…' : ''), px + 20, py + ph - 25);
      const pulse = 0.6 + 0.4 * Math.sin(g.time * 5);
      ctx.fillStyle = `rgba(143,208,160,${pulse})`;
      ctx.font = '600 10px -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('E — SEND', px + pw - 18, py + ph - 25);
    } else if (this.dial) {
      const pulse = 0.6 + 0.4 * Math.sin(g.time * 5);
      ctx.fillStyle = `rgba(224,120,120,${pulse})`;
      ctx.font = '600 11px -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`E — ${this.dial.label}`, px + pw / 2, py + ph - 25);
    } else {
      ctx.fillStyle = 'rgba(107,115,134,0.4)';
      ctx.font = '11px -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Message', px + 20, py + ph - 25);
    }
    ctx.restore();
  }
}
