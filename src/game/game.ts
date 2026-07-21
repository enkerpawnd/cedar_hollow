import { W, H, createScreen, type Screen } from '../engine/screen';
import { initInput, pressed } from '../engine/input';
import { Sound, type LoopHandle } from '../engine/audio';
import { Player } from './player';
import { Phone } from './phone';
import { Narration } from './narration';
import { renderLighting } from './lighting';
import { buildRooms, actOne } from './act1';
import type { Co, Ctx2D, Interactable, Room } from './types';

interface Runner {
  co: Co;
  wait: number;
  cond: (() => boolean) | null;
  done: boolean;
}

function makeVignette(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const grad = x.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.85);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.fillStyle = grad;
  x.fillRect(0, 0, W, H);
  return c;
}

export class Game {
  screen: Screen;
  sound = new Sound();
  player = new Player();
  phone = new Phone();
  narration = new Narration();
  rooms: Record<string, Room>;
  room: Room;
  flags = new Set<string>();
  time = 0;
  state: 'title' | 'loading' | 'play' | 'end' = 'title';
  cutscene = true;
  fade = 1;
  hintText = '';
  introLines: string[] = [];

  private runners: Runner[] = [];
  private fadeFrom = 1;
  private fadeTarget = 1;
  private fadeT = 0;
  private fadeDur = 0;
  private loops: { wind: LoopHandle | null; fire: LoopHandle | null } = { wind: null, fire: null };
  private loopTargets = { wind: 0, fire: 0 };
  private vignette: HTMLCanvasElement;

  constructor() {
    this.screen = createScreen();
    initInput();
    this.rooms = buildRooms();
    this.room = this.rooms.exterior;
    this.vignette = makeVignette();
    this.screen.canvas.addEventListener('pointerdown', () => this.onClick());
  }

  private onClick(): void {
    if (this.state !== 'title') return;
    this.state = 'loading';
    void this.sound.init().then(() => {
      this.loops.wind = this.sound.loop('wind', 0);
      this.loops.fire = this.sound.loop('fire', 0);
      this.state = 'play';
      this.run(actOne(this));
    });
  }

  flag(n: string): boolean {
    return this.flags.has(n);
  }

  setFlag(n: string): void {
    this.flags.add(n);
  }

  say(t: string): void {
    this.narration.say(t);
  }

  hint(t: string): void {
    this.hintText = t;
  }

  inputLocked(): boolean {
    return this.state !== 'play' || this.cutscene || this.phone.open;
  }

  run(co: Co): void {
    this.runners.push({ co, wait: 0, cond: null, done: false });
  }

  fadeToBlack(target: number, dur: number): void {
    this.fadeFrom = this.fade;
    this.fadeTarget = target;
    this.fadeT = 0;
    this.fadeDur = dur;
  }

  gotoRoom(id: string, spawnX: number, spawnFacing: 1 | -1 = 1): void {
    const g = this;
    g.run(function* (): Co {
      g.cutscene = true;
      g.sound.play('door', { vol: 0.5 });
      g.fadeToBlack(1, 0.3);
      yield 0.35;
      g.room = g.rooms[id];
      g.player.x = spawnX;
      g.player.facing = spawnFacing;
      g.setAmbience();
      g.fadeToBlack(0, 0.35);
      yield 0.4;
      g.cutscene = false;
    }());
  }

  setAmbience(): void {
    const ext = this.room.id === 'exterior';
    this.loopTargets.wind = ext ? 0.38 : 0.1;
    this.loopTargets.fire = ext ? 0 : 0.16;
  }

  ambienceOff(): void {
    this.loopTargets.wind = 0;
    this.loopTargets.fire = 0;
  }

  update(dt: number): void {
    this.time += dt;

    if (this.state === 'end') {
      if (pressed('r')) location.reload();
      return;
    }
    if (this.state !== 'play') return;

    for (const r of this.runners) {
      if (r.wait > 0) {
        r.wait -= dt;
        if (r.wait > 0) continue;
      }
      if (r.cond && !r.cond()) continue;
      r.cond = null;
      const res = r.co.next();
      if (res.done) {
        r.done = true;
        continue;
      }
      if (typeof res.value === 'number') r.wait = res.value;
      else r.cond = res.value;
    }
    this.runners = this.runners.filter((r) => !r.done);

    if (this.fadeDur > 0) {
      this.fadeT += dt;
      const k = Math.min(1, this.fadeT / this.fadeDur);
      this.fade = this.fadeFrom + (this.fadeTarget - this.fadeFrom) * k;
      if (k >= 1) this.fadeDur = 0;
    }

    for (const key of ['wind', 'fire'] as const) {
      const h = this.loops[key];
      if (h) {
        const v = h.gain.gain.value;
        h.gain.gain.value = v + (this.loopTargets[key] - v) * Math.min(1, dt * 1.5);
      }
    }

    this.phone.update(dt, this);
    this.narration.update(dt);
    this.player.update(dt, this);

    if (!this.cutscene) {
      if (pressed('tab', 'p')) this.phone.toggle(this);
      if (this.phone.open) {
        if (pressed('e', 'enter') && this.phone.draft) this.phone.send(this);
        if (pressed('escape')) this.phone.open = false;
      } else {
        if (pressed('f') && this.flag('has_flashlight')) {
          this.player.flashOn = !this.player.flashOn;
          this.sound.play('switch', { vol: 0.35 });
        }
        const it = this.nearestItem();
        if (it && pressed('e', 'enter')) it.use(this);
      }
    }
  }

  private nearestItem(): Interactable | null {
    let best: Interactable | null = null;
    let bd = Infinity;
    for (const it of this.room.items) {
      if (!it.enabled(this)) continue;
      const d = Math.abs(it.x - this.player.x);
      if (d <= (it.radius ?? 56) && d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  render(): void {
    const { ctx } = this.screen;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (this.state === 'title' || this.state === 'loading') {
      this.drawTitle(ctx);
      return;
    }
    if (this.state === 'end') {
      this.drawEnd(ctx);
      return;
    }

    const cam = Math.max(0, Math.min(this.room.w - W, this.player.x - W / 2));

    ctx.save();
    ctx.translate(-cam, 0);
    this.room.draw(ctx, this);
    this.player.draw(ctx, this);
    ctx.restore();

    const glows = renderLighting(this, cam);
    ctx.drawImage(this.screen.light, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of glows) {
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      grad.addColorStop(0, `rgba(${s.color},${s.a})`);
      grad.addColorStop(1, `rgba(${s.color},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.drawImage(this.vignette, 0, 0);

    if (!this.cutscene && !this.phone.open) this.drawPrompt(ctx, cam);

    if (this.hintText) {
      ctx.font = '600 11px -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(190,200,220,0.38)';
      ctx.fillText(this.hintText.toUpperCase(), 20, 28);
    }

    this.narration.render(ctx);
    this.phone.render(ctx, this);

    if (this.fade > 0.001) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (this.introLines.length) {
      ctx.font = '14px "SF Mono", Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,178,200,0.9)';
      this.introLines.forEach((line, i) => ctx.fillText(line, W / 2, 232 + i * 38));
    }
  }

  private drawPrompt(ctx: Ctx2D, cam: number): void {
    const it = this.nearestItem();
    if (!it) return;
    const sx = it.x - cam;
    const sy = (it.y ?? 330) - 28;
    ctx.font = '600 11px -apple-system, "Segoe UI", sans-serif';
    const label = `E — ${it.label.toUpperCase()}`;
    const w = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(8,10,18,0.75)';
    ctx.beginPath();
    ctx.roundRect(sx - w / 2 - 10, sy - 14, w + 20, 21, 6);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(225,230,242,0.9)';
    ctx.fillText(label, sx, sy);
  }

  private drawWindowMotif(ctx: Ctx2D, lit: boolean): void {
    const wx = W / 2;
    const wy = 168;
    const flick = lit ? 0.9 + 0.1 * Math.sin(this.time * 7.3) * Math.sin(this.time * 2.1) : 0;
    if (lit) {
      const grad = ctx.createRadialGradient(wx, wy, 4, wx, wy, 110);
      grad.addColorStop(0, `rgba(245,169,78,${0.28 * flick})`);
      grad.addColorStop(1, 'rgba(245,169,78,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(wx - 120, wy - 120, 240, 240);
    }
    ctx.fillStyle = lit ? `rgba(245,169,78,${0.85 * flick})` : '#12151f';
    ctx.fillRect(wx - 15, wy - 20, 30, 40);
    ctx.fillStyle = '#000';
    ctx.fillRect(wx - 2, wy - 20, 4, 40);
    ctx.fillRect(wx - 15, wy - 3, 30, 5);
  }

  private drawTitle(ctx: Ctx2D): void {
    this.drawWindowMotif(ctx, true);
    ctx.textAlign = 'center';
    ctx.font = 'italic 42px Georgia, serif';
    ctx.fillStyle = '#ccd2e0';
    ctx.fillText('CEDAR HOLLOW', W / 2, 288);
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = '#6b7386';
    ctx.fillText('off-season rate. nobody comes out here this time of year.', W / 2, 318);
    const pulse = 0.45 + 0.35 * Math.sin(this.time * 2.5);
    ctx.font = '13px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = `rgba(200,208,225,${this.state === 'loading' ? 0.8 : pulse})`;
    ctx.fillText(this.state === 'loading' ? 'loading…' : 'click to begin', W / 2, 412);
    ctx.font = '11px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#4c5468';
    ctx.fillText('A/D or ←/→  walk     E  interact     F  flashlight     TAB  phone', W / 2, 472);
    ctx.drawImage(this.vignette, 0, 0);
  }

  private drawEnd(ctx: Ctx2D): void {
    this.drawWindowMotif(ctx, true);
    ctx.textAlign = 'center';
    ctx.font = 'italic 36px Georgia, serif';
    ctx.fillStyle = '#ccd2e0';
    ctx.fillText('CEDAR HOLLOW', W / 2, 288);
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = '#6b7386';
    ctx.fillText('end of act one — vertical slice', W / 2, 318);
    const pulse = 0.45 + 0.35 * Math.sin(this.time * 2.5);
    ctx.font = '13px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = `rgba(200,208,225,${pulse})`;
    ctx.fillText('press R to restart', W / 2, 412);
    ctx.drawImage(this.vignette, 0, 0);
  }
}
