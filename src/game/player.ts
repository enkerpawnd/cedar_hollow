import { isDown } from '../engine/input';
import { FLOOR_Y } from './world';
import type { Game } from './game';
import type { Ctx2D } from './types';

const SPEED = 105; // deliberately slow; there is no run in Act One

export class Player {
  x = 190;
  facing: 1 | -1 = 1;
  walking = false;
  bob = 0;
  flashOn = false;
  private stepAcc = 0;

  update(dt: number, g: Game): void {
    let vx = 0;
    if (!g.inputLocked()) {
      const l = isDown('a', 'arrowleft');
      const r = isDown('d', 'arrowright');
      vx = (r ? 1 : 0) - (l ? 1 : 0);
    }
    if (vx !== 0) this.facing = vx > 0 ? 1 : -1;
    this.x = Math.max(36, Math.min(g.room.w - 36, this.x + vx * SPEED * dt));
    this.walking = vx !== 0;
    this.bob += dt * (this.walking ? 8 : 2.4);
    if (this.walking) {
      this.stepAcc += Math.abs(vx) * SPEED * dt;
      if (this.stepAcc >= 36) {
        this.stepAcc = 0;
        g.sound.play(g.room.id === 'exterior' ? 'step_gravel' : 'step_wood', {
          vol: 0.2,
          rate: 0.9 + Math.random() * 0.2,
        });
      }
    }
  }

  draw(ctx: Ctx2D, g: Game): void {
    const x = this.x;
    const fy = FLOOR_Y;
    const bobY = Math.sin(this.bob) * (this.walking ? 1.6 : 0.8);
    const stride = this.walking ? Math.sin(this.bob) * 7 : 0;

    // duffel bag until it's put down
    if (!g.flag('bag_dropped')) {
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
