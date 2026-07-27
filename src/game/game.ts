import { W, H, createScreen, type Screen } from '../engine/screen';
import { initInput, pressed } from '../engine/input';
import { Sound, type LoopHandle } from '../engine/audio';
import { Player } from './player';
import { Phone, type Msg } from './phone';
import { Narration } from './narration';
import { renderLighting } from './lighting';
import { buildRooms } from './rooms';
import { actOne } from './act1';
import { actTwo } from './act2';
import { actThree } from './act3';
import { actFour, tenantTick, tenantDraw, tenantNoise } from './act4';
import { loadCheckpoint, clearSave, CHECKPOINT_LABELS, type Checkpoint } from './save';
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
  // a persistent control prompt shown just below the objective line — used for
  // the flashlight, so it can't be shoved off-screen by a story hint and stays
  // put until the player actually presses F.
  flashPrompt = '';
  introLines: string[] = [];
  introAdvance = false; // show a "click to continue" prompt under the intro
  private advanceTap = false; // a click landed this frame (consumed by waitTap)
  endText = 'end of act one — vertical slice';
  endWindowLit = true;
  onRoomEnter: ((id: string) => void) | null = null;
  autoMove: { tx: number; speed: number } | null = null;
  droppedLight: { x: number; dir: 1 | -1; at: number } | null = null;

  private runners: Runner[] = [];
  private fadeFrom = 1;
  private fadeTarget = 1;
  private fadeT = 0;
  private fadeDur = 0;
  private loops: { wind: LoopHandle | null; fire: LoopHandle | null } = { wind: null, fire: null };
  private loopTargets = { wind: 0, fire: 0 };
  private vignette: HTMLCanvasElement;
  private savedCp: Checkpoint | null = loadCheckpoint();

  constructor() {
    this.screen = createScreen();
    initInput();
    this.rooms = buildRooms();
    this.room = this.rooms.exterior;
    this.vignette = makeVignette();
    this.screen.canvas.addEventListener('pointerdown', () => this.onClick());
  }

  private onClick(): void {
    if (this.state !== 'title') {
      // during play, a click is an "advance" — used to page the opening text
      this.advanceTap = true;
      return;
    }
    this.state = 'loading';
    void this.sound.init().then(() => {
      this.loops.wind = this.sound.loop('wind', 0);
      this.loops.fire = this.sound.loop('fire', 0);
      this.state = 'play';
      // dev URL override first, then the saved checkpoint, then a fresh game
      const skipMap: Record<string, Checkpoint> = { '2': 'act2', '3': 'act3', '4': 'act4', '4b': 'act4b' };
      const skip = new URLSearchParams(location.search).get('act');
      this.startFrom(skip && skipMap[skip] ? skipMap[skip] : this.savedCp);
    });
  }

  // Rebuild the world state a checkpoint implies and start its act script.
  private startFrom(cp: Checkpoint | null): void {
    const act1Flags = [
      'lockbox_seen', 'entered', 'keys_hung', 'lights_main', 'mug_seen', 'bulb_popped', 'has_flashlight',
      'bag_dropped', 'shed_seen', 'has_logs', 'logs_dropped', 'ellis_done', 'ellisB_done',
      'unpacked', 'sleep_try1', 'checked_thump',
    ];
    const act2Flags = [
      'act2', 'a2_outside', 'warm_noticed', 'boxes_moved', 'mug_rinsed',
      'clue_guestbook', 'clue_backroom', 'clue_toothbrush', 'clue_duffel',
      'clue_shed', 'clue_camp', 'clue_prints',
      'ellis2_started', 'ellis2_mid', 'ellis2_done',
      'leave_early', 'packed_bag', 'packed_charger', 'packed_toothbrush',
      'keys_gone', 'act2_done',
    ];
    const act3Flags = [
      'act3', 'srch_sofa', 'srch_drawer', 'srch_bed', 'srch_nightstand', 'srch_car',
      'a3_finale', 'chair_moved', 'pantry_ajar', 'beat_guestbook', 'beat_brush_gone',
      'call_answered', 'ellis3_mid', 'ellis3_done', 'choice_open',
      'power_out', 'hatch_open', 'act3_done',
    ];
    const act1Msgs: Msg[] = [
      { from: 'sam', text: 'hey just got in, thanks for leaving the heat on', status: 'delivered' },
      { from: 'ellis', text: 'wasn’t me. haven’t been out there in a week' },
      { from: 'ellis', text: 'cleaner mustve left it. enjoy your stay' },
      { from: 'sam', text: 'quick q — the wood stove was already lit when i got in. cleaner does that too?', status: 'delivered' },
      { from: 'ellis', text: '…the cleaner doesn’t light fires' },
      { from: 'ellis', text: 'old embers mustve caught. happens with these stoves' },
      { from: 'ellis', text: 'anyway. sleep well' },
      { from: 'ellis', text: 'forgot to say — if you hear scratching at night it’s raccoons. they get under the porch' },
    ];
    const act2Msgs: Msg[] = [
      { from: 'ellis', text: 'hows the stay going? quiet enough for you?' },
      { from: 'sam', text: 'hey weird q, does anyone else stay at cedar hollow between guests? found some clothes and stuff', status: 'delivered' },
      { from: 'ellis', text: 'no. just you this weekend' },
      { from: 'ellis', text: 'why, is someone there?' },
      { from: 'sam', text: 'probably nothing. theres a duffel in the pantry with a printout of MY booking dates in it', status: 'delivered' },
      { from: 'ellis', text: 'thats the cleaners husbands. he does repairs, leaves gear around' },
      { from: 'ellis', text: 'the printout is probably her checklist' },
      { from: 'ellis', text: 'you booked through sunday right?' },
    ];
    const act3Msgs: Msg[] = [
      { from: 'sam', text: 'someone just called and breathed into the phone. what is going on out there', status: 'delivered' },
      { from: 'ellis', text: 'ok. i need you to stay calm' },
      { from: 'ellis', text: 'my dad used to let a man winter at the cabin. a handyman. an arrangement' },
      { from: 'ellis', text: 'i ended it when i took over. changed the locks. he kept coming back' },
      { from: 'ellis', text: 'he doesnt break in. he waits for the bookings to end. the cleaner found bedding under the house in march' },
      { from: 'sam', text: 'UNDER THE HOUSE??', status: 'delivered' },
      { from: 'ellis', text: 'i called the sheriff. stay in a locked room. do NOT go in the crawlspace' },
      { from: 'ellis', text: 'he lives out there sam. between bookings. im 40 min away' },
      { from: 'ellis', text: 'lock the door' },
    ];
    if (cp === 'act4' || cp === 'act4b') {
      for (const f of [...act1Flags, ...act2Flags, ...act3Flags]) this.flags.add(f);
      if (cp === 'act4b') {
        this.flags.add('chose_barricade');
        this.flags.add('barricaded');
      } else {
        this.flags.add('chose_search');
        this.flags.add('knows_keys');
        this.flags.add('hatch_seen');
      }
      this.phone.msgs.push(...act1Msgs, ...act2Msgs, ...act3Msgs);
      this.run(actFour(this));
    } else if (cp === 'act3') {
      for (const f of [...act1Flags, ...act2Flags]) this.flags.add(f);
      this.phone.msgs.push(...act1Msgs, ...act2Msgs);
      this.run(actThree(this));
    } else if (cp === 'act2') {
      for (const f of act1Flags) this.flags.add(f);
      this.phone.msgs.push(...act1Msgs);
      this.run(actTwo(this));
    } else {
      this.run(actOne(this));
    }
  }

  flag(n: string): boolean {
    return this.flags.has(n);
  }

  // Daylight lasts exactly one act: the grey morning of Act Two.
  isDay(): boolean {
    return this.flags.has('act2') && !this.flags.has('act3');
  }

  setFlag(n: string): void {
    this.flags.add(n);
  }

  say(t: string): void {
    this.narration.say(t);
  }

  // Examine chatter: replaces the previous remark, yields to story lines.
  remark(...lines: string[]): void {
    this.narration.remark(...lines);
  }

  hint(t: string): void {
    this.hintText = t;
  }

  // Player-driven "continue": a click, Enter, or Space. Consumed on read so a
  // single tap advances exactly one line of the opening.
  takeAdvance(): boolean {
    const tapped = this.advanceTap || pressed('enter', ' ');
    this.advanceTap = false;
    return tapped;
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

  gotoRoom(id: string, spawnX: number, spawnFacing: 1 | -1 = 1, opts?: { quiet?: boolean }): void {
    const g = this;
    g.run(function* (): Co {
      g.cutscene = true;
      if (!opts?.quiet) g.sound.play('door', { vol: 0.5 });
      g.fadeToBlack(1, 0.3);
      yield 0.35;
      g.room = g.rooms[id];
      g.player.x = spawnX;
      g.player.facing = spawnFacing;
      g.setAmbience();
      g.onRoomEnter?.(id);
      g.fadeToBlack(0, 0.35);
      yield 0.4;
      g.cutscene = false;
    }());
  }

  setAmbience(): void {
    const id = this.room.id;
    const outside = id === 'exterior' || id === 'lake';
    if (this.flag('act3')) {
      // night again, and the stove stayed dead
      this.loopTargets.wind = outside ? 0.42 : 0.12;
      this.loopTargets.fire = 0;
    } else if (this.flag('act2')) {
      // morning: thinner wind, and the stove burned out overnight
      this.loopTargets.wind = outside ? 0.3 : 0.07;
      this.loopTargets.fire = 0;
    } else {
      this.loopTargets.wind = outside ? 0.38 : 0.1;
      this.loopTargets.fire = outside ? 0 : 0.16;
    }
    if (id === 'shed') {
      // wind through plank gaps, no stove
      this.loopTargets.wind = 0.2;
      this.loopTargets.fire = 0;
    } else if (id === 'crawl') {
      // under the house everything is muffled, including the weather
      this.loopTargets.wind = 0.03;
      this.loopTargets.fire = 0;
    }
  }

  ambienceOff(): void {
    this.loopTargets.wind = 0;
    this.loopTargets.fire = 0;
  }

  update(dt: number): void {
    this.time += dt;

    if (this.state === 'end') {
      // the checkpoint save means R lands on "continue — the night"
      if (pressed('r')) location.reload();
      return;
    }
    if (this.state === 'title' && this.savedCp && pressed('n')) {
      clearSave();
      this.savedCp = null;
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
    if (this.flag('act4')) tenantTick(this, dt);

    if (!this.cutscene) {
      if (pressed('tab', 'p') && !this.phone.call) {
        this.phone.toggle(this);
        // in the final act, the click of the phone is a noise like any other —
        // and doing it on top of him is the last mistake Sam makes
        if (this.flag('act4')) tenantNoise(this, this.room.id, this.player.x, false, true);
      }
      if (this.phone.open) {
        if (this.phone.call?.phase === 'ringing' && pressed('e', 'enter')) this.phone.answer(this);
        else if (pressed('e', 'enter') && this.phone.draft && !this.phone.call) {
          this.phone.send(this);
          if (this.flag('act4')) tenantNoise(this, this.room.id, this.player.x, false, true);
        } else if (pressed('e', 'enter') && this.phone.dial && !this.phone.call) {
          const d = this.phone.dial;
          this.phone.dial = null;
          d.onDial();
        }
        if (pressed('escape') && !this.phone.call) this.phone.open = false;
      } else {
        if (pressed('f') && this.flag('has_flashlight')) {
          this.player.flashOn = !this.player.flashOn;
          this.sound.play('switch', { vol: 0.35 });
          this.flashPrompt = ''; // the prompt has served its purpose
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

    // rooms narrower than the screen sit centered; wider ones scroll
    const cam = this.room.w <= W
      ? (this.room.w - W) / 2
      : Math.max(0, Math.min(this.room.w - W, this.player.x - W / 2));

    ctx.save();
    ctx.translate(-cam, 0);
    this.room.draw(ctx, this);
    this.player.draw(ctx, this);
    if (this.flag('act4')) tenantDraw(ctx, this);
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

    if (!this.cutscene && !this.phone.open && !this.flag('setpiece_active')) this.drawPrompt(ctx, cam);

    if (this.hintText) {
      ctx.font = '600 11px -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(190,200,220,0.38)';
      ctx.fillText(this.hintText.toUpperCase(), 20, 28);
    }
    if (this.flashPrompt) {
      // a second line under the objective, its own persistent slot
      ctx.font = '600 11px -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(240,214,150,0.5)';
      ctx.fillText(this.flashPrompt.toUpperCase(), 20, 46);
    }

    this.narration.render(ctx, this);
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
      if (this.introAdvance) {
        const pulse = 0.35 + 0.35 * Math.sin(this.time * 3);
        ctx.font = '12px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = `rgba(150,168,196,${pulse})`;
        ctx.fillText('click or press space to continue', W / 2, 232 + this.introLines.length * 38 + 22);
      }
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
    const prompt = this.state === 'loading'
      ? 'loading…'
      : this.savedCp
        ? `click to continue — ${CHECKPOINT_LABELS[this.savedCp]}`
        : 'click to begin';
    ctx.fillText(prompt, W / 2, 412);
    if (this.savedCp && this.state !== 'loading') {
      ctx.font = '11px -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = '#5b657c';
      ctx.fillText('N — new game', W / 2, 436);
    }
    ctx.font = '11px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#4c5468';
    ctx.fillText('A/D or ←/→  walk     E  interact     F  flashlight     TAB  phone', W / 2, 472);
    ctx.drawImage(this.vignette, 0, 0);
  }

  private drawEnd(ctx: Ctx2D): void {
    this.drawWindowMotif(ctx, this.endWindowLit);
    ctx.textAlign = 'center';
    ctx.font = 'italic 36px Georgia, serif';
    ctx.fillStyle = '#ccd2e0';
    ctx.fillText('CEDAR HOLLOW', W / 2, 288);
    if (this.endText) {
      ctx.font = '13px Georgia, serif';
      ctx.fillStyle = '#6b7386';
      ctx.fillText(this.endText, W / 2, 318);
    }
    const pulse = 0.45 + 0.35 * Math.sin(this.time * 2.5);
    ctx.font = '13px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = `rgba(200,208,225,${pulse})`;
    ctx.fillText('press R to restart', W / 2, 412);
    ctx.drawImage(this.vignette, 0, 0);
  }
}
