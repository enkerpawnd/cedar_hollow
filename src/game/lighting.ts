import { W, H } from '../engine/screen';
import { FLOOR_Y } from './world';
import type { Game } from './game';
import type { Ctx2D } from './types';

export interface Glow {
  x: number;
  y: number;
  r: number;
  color: string; // "r,g,b"
  a: number;
}

function cutRadial(lctx: Ctx2D, x: number, y: number, r: number, s: number): void {
  const grad = lctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, `rgba(255,255,255,${s})`);
  grad.addColorStop(0.6, `rgba(255,255,255,${s * 0.6})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  lctx.fillStyle = grad;
  lctx.beginPath();
  lctx.arc(x, y, r, 0, Math.PI * 2);
  lctx.fill();
}

// Renders the darkness layer for the current room into the light canvas and
// returns the warm glows to draw additively on top of the composite.
export function renderLighting(g: Game, cam: number): Glow[] {
  const lctx = g.screen.lctx;
  const room = g.room;
  const t = g.time;
  const glows: Glow[] = [];

  const ambient = g.flag('act2') && room.ambientDay !== undefined ? room.ambientDay : room.ambient;

  lctx.save();
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = `rgba(3,4,10,${ambient})`;
  lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';

  for (const L of room.lights) {
    if (!L.on(g)) continue;
    let r = L.r;
    if (L.flicker) {
      r *= 0.86 + 0.14 * (Math.sin(t * 11.3 + L.x) * 0.6 + Math.sin(t * 27.1) * 0.4);
    }
    const x = L.x - cam;
    if (x < -r || x > W + r) continue;
    cutRadial(lctx, x, L.y, r, L.strength ?? 0.9);
    if (L.warm) glows.push({ x, y: L.y, r: r * 0.9, color: '255,166,74', a: 0.1 });
  }

  // eyes adjust: a faint pool around Sam so darkness is dread, not blindness
  const px = g.player.x - cam;
  const py = FLOOR_Y - 45;
  cutRadial(lctx, px, py, 80, 0.3);

  if (g.player.flashOn && g.flag('has_flashlight')) {
    const facing = g.player.facing;
    const ox = px + facing * 14;
    const oy = FLOOR_Y - 68;
    const R = 360;
    const ang = (facing === 1 ? 0 : Math.PI) + Math.sin(g.player.bob * 0.7) * 0.025 + 0.04 * facing;
    const spread = 0.21;
    const grad = lctx.createRadialGradient(ox, oy, 0, ox, oy, R);
    grad.addColorStop(0, 'rgba(255,255,255,0.92)');
    grad.addColorStop(0.75, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    lctx.fillStyle = grad;
    lctx.beginPath();
    lctx.moveTo(ox, oy);
    lctx.arc(ox, oy, R, ang - spread, ang + spread);
    lctx.closePath();
    lctx.fill();
    cutRadial(lctx, ox, oy, 46, 0.5);
    glows.push({ x: ox + facing * R * 0.35, y: oy + 14, r: R * 0.45, color: '188,206,255', a: 0.05 });
  }

  lctx.restore();
  return glows;
}
