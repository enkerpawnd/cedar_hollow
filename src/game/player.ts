import { isDown } from '../engine/input';
import { FLOOR_Y } from './world';
import type { Game } from './game';
import type { Ctx2D } from './types';

const SPEED = 105; // deliberately slow; the run only exists in the final act
const RUN_SPEED = 185;

export class Player {
  x = 190;
  facing: 1 | -1 = 1;
  walking = false;
  running = false;
  hidden = false;
  bob = 0;
  flashOn = false;
  private stepAcc = 0;

  update(dt: number, g: Game): void {
    // scripted movement (the run to the car) overrides everything
    if (g.autoMove) {
      const d = g.autoMove.tx - this.x;
      const step = g.autoMove.speed * dt;
      if (Math.abs(d) <= step) {
        this.x = g.autoMove.tx;
        g.autoMove = null;
        this.walking = false;
      } else {
        this.x += Math.sign(d) * step;
        this.facing = d > 0 ? 1 : -1;
        this.walking = true;
        this.bob += dt * 11;
        this.step(g, step, 30, 0.3);
      }
      return;
    }

    let vx = 0;
    if (!g.inputLocked() && !this.hidden) {
      const l = isDown('a', 'arrowleft');
      const r = isDown('d', 'arrowright');
      vx = (r ? 1 : 0) - (l ? 1 : 0);
    }
    // under the house you crawl. nobody runs in a hundred-and-thirty
    // centimeters of headroom.
    const crawl = g.room.id === 'crawl';
    this.running = vx !== 0 && g.flag('act4') && isDown('shift') && !crawl;
    const speed = (this.running ? RUN_SPEED : SPEED) * (crawl ? 0.55 : 1);
    if (vx !== 0) this.facing = vx > 0 ? 1 : -1;
    this.x = Math.max(36, Math.min(g.room.w - 36, this.x + vx * speed * dt));
    this.walking = vx !== 0;
    this.bob += dt * (this.walking ? (this.running ? 12 : 8) : 2.4);
    if (this.walking) {
      this.step(g, Math.abs(vx) * speed * dt, this.running ? 30 : 36, this.running ? 0.36 : 0.2);
    }
  }

  private step(g: Game, dist: number, span: number, vol: number): void {
    this.stepAcc += dist;
    if (this.stepAcc >= span) {
      this.stepAcc = 0;
      g.sound.play(g.room.id === 'exterior' ? 'step_gravel' : 'step_wood', {
        vol,
        rate: 0.9 + Math.random() * 0.2,
      });
    }
  }

  draw(ctx: Ctx2D, g: Game): void {
    if (this.hidden) return;
    const x = this.x;
    const fy = FLOOR_Y;
    const bobY = Math.sin(this.bob) * (this.walking ? 1.6 : 0.8);
    const stride = this.walking ? Math.sin(this.bob) * 7 : 0;

    if (g.room.id === 'crawl') {
      // hands and knees: a low hunched shape, head ducked under the joists
      ctx.fillStyle = '#04050a';
      ctx.beginPath();
      ctx.roundRect(x - 16, fy - 40 + bobY * 0.6, 32, 26, 10);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + this.facing * 16, fy - 44 + bobY * 0.6, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#04050a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + this.facing * 10, fy - 24);
      ctx.lineTo(x + this.facing * 16 + stride * 0.4, fy - 2);
      ctx.moveTo(x - this.facing * 8, fy - 22);
      ctx.lineTo(x - this.facing * 14 - stride * 0.4, fy - 2);
      ctx.stroke();
      return;
    }

    // duffel bag until it's put down — and again once it's packed to leave
    if (!g.flag('bag_dropped') || g.flag('packed_bag')) {
      ctx.fillStyle = '#04050a';
      ctx.beginPath();
      ctx.roundRect(x - this.facing * 22 - 8, fy - 58 + bobY, 18, 24, 5);
      ctx.fill();
      ctx.strokeStyle = '#04050a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - this.facing * 4, fy - 72 + bobY);
      ctx.lineTo(x - this.facing * 18, fy - 56 + bobY);
      ctx.stroke();
    }

    ctx.strokeStyle = '#04050a';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 2, fy - 38 + bobY);
    ctx.lineTo(x - 2 + stride, fy - 2);
    ctx.moveTo(x + 2, fy - 38 + bobY);
    ctx.lineTo(x + 2 - stride, fy - 2);
    ctx.stroke();

    ctx.fillStyle = '#04050a';
    ctx.beginPath();
    ctx.roundRect(x - 9, fy - 78 + bobY, 18, 44, 8);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + this.facing * 2, fy - 86 + bobY, 8.5, 0, Math.PI * 2);
    ctx.fill();

    if (this.flashOn && g.flag('has_flashlight')) {
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + this.facing * 5, fy - 64 + bobY);
      ctx.lineTo(x + this.facing * 18, fy - 68 + bobY);
      ctx.stroke();
    }
  }
}
