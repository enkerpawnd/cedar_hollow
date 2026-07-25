import { H } from '../engine/screen';
import type { Ctx2D } from './types';
import type { Game } from './game';

export const FLOOR_Y = 470;

export function srand(i: number): number {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function rr(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function pine(ctx: Ctx2D, x: number, base: number, h: number, fill: string): void {
  const w = h * 0.42;
  ctx.fillStyle = fill;
  for (let i = 0; i < 3; i++) {
    const ty = base - h + (h * 0.28 * i);
    const tw = w * (0.5 + 0.25 * i);
    const th = h * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, ty);
    ctx.lineTo(x - tw / 2, ty + th);
    ctx.lineTo(x + tw / 2, ty + th);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(x - 2, base - h * 0.2, 4, h * 0.2);
}

function windowPane(ctx: Ctx2D, x: number, y: number, w: number, h: number, glass: string): void {
  ctx.fillStyle = '#0a0c13';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = glass;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0a0c13';
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  ctx.fillRect(x, y + h / 2 - 2, w, 4);
}

function doorFrame(ctx: Ctx2D, x: number, open = false, w = 68): void {
  ctx.fillStyle = '#0b0e17';
  ctx.fillRect(x - w / 2, 316, w, FLOOR_Y - 316);
  if (open) {
    ctx.fillStyle = '#05060c';
    ctx.fillRect(x - w / 2 + 7, 322, w - 14, FLOOR_Y - 322);
  } else {
    ctx.fillStyle = '#080a11';
    ctx.fillRect(x - w / 2 + 7, 322, w - 14, FLOOR_Y - 322);
    ctx.fillStyle = '#242b3d';
    ctx.beginPath();
    ctx.arc(x + w / 2 - 16, 396, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function lightSwitch(ctx: Ctx2D, x: number): void {
  ctx.fillStyle = '#1c2231';
  ctx.fillRect(x - 5, 330, 10, 15);
  ctx.fillStyle = '#2b3345';
  ctx.fillRect(x - 2, 334, 4, 7);
}

function interiorShell(ctx: Ctx2D, w: number, wall: string): void {
  ctx.fillStyle = '#0a0c13';
  ctx.fillRect(0, 0, w, 84);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 84, w, FLOOR_Y - 84);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  for (let y = 118; y < FLOOR_Y; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#0e1119';
  ctx.fillRect(0, FLOOR_Y, w, H - FLOOR_Y);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  for (let x = 20; x < w; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_Y);
    ctx.lineTo(x - 14, H);
    ctx.stroke();
  }
}

function ceilingLamp(ctx: Ctx2D, x: number, lit: boolean): void {
  ctx.strokeStyle = '#0a0c13';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 84);
  ctx.lineTo(x, 140);
  ctx.stroke();
  ctx.fillStyle = '#0a0c13';
  ctx.beginPath();
  ctx.moveTo(x - 20, 162);
  ctx.lineTo(x - 8, 140);
  ctx.lineTo(x + 8, 140);
  ctx.lineTo(x + 20, 162);
  ctx.closePath();
  ctx.fill();
  if (lit) {
    ctx.fillStyle = 'rgba(255,217,160,0.85)';
    ctx.beginPath();
    ctx.arc(x, 160, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Exterior: driveway, cabin against the pines. Dusk on arrival, grey
// morning the second day, true dark from Act Three on. ---

export function drawExterior(ctx: Ctx2D, g: Game): void {
  const w = 1400;
  const t = g.time;
  const day = g.isDay();
  const night = g.flag('act3');

  const sky = ctx.createLinearGradient(0, 0, 0, 460);
  if (day) {
    sky.addColorStop(0, '#3f4a5e');
    sky.addColorStop(0.6, '#5b6579');
    sky.addColorStop(1, '#6e7787');
  } else if (night) {
    sky.addColorStop(0, '#03040a');
    sky.addColorStop(0.6, '#080c18');
    sky.addColorStop(1, '#0b1020');
  } else {
    sky.addColorStop(0, '#0a0e1f');
    sky.addColorStop(0.55, '#141b34');
    sky.addColorStop(0.92, '#39262b');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, 460);

  if (!day) {
    const dim = night ? 0.6 : 1;
    for (let i = 0; i < 44; i++) {
      const x = srand(i) * w;
      const y = srand(i + 99) * 250;
      const a = (0.15 + 0.35 * srand(i + 7)) * (0.6 + 0.4 * Math.sin(t * (0.6 + srand(i)) + i)) * dim;
      ctx.fillStyle = `rgba(200,210,255,${Math.max(0, a)})`;
      ctx.fillRect(x, y, 1.6, 1.6);
    }
  } else {
    // low cloud, moving barely
    for (let i = 0; i < 6; i++) {
      const cx = ((srand(i + 30) * w + t * 3.5) % (w + 300)) - 150;
      ctx.fillStyle = 'rgba(200,208,220,0.05)';
      ctx.beginPath();
      ctx.ellipse(cx, 60 + srand(i + 41) * 90, 130 + srand(i) * 70, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < 30; i++) {
    const x = i * 52 + srand(i) * 34;
    pine(ctx, x, 452, 90 + srand(i + 3) * 70, day ? '#252e40' : '#0b0e18');
  }

  ctx.fillStyle = day ? '#1a1f2b' : '#0c0e15';
  ctx.fillRect(0, 445, w, H - 445);

  for (const x of [36, 320, 706, 1356]) {
    pine(ctx, x, 470, 170 + srand(x) * 70, day ? '#131926' : '#060810');
  }

  // the lake path: a break in the treeline, west end of the property
  ctx.fillStyle = day ? '#232936' : '#101320';
  ctx.beginPath();
  ctx.moveTo(20, 470);
  ctx.lineTo(96, 470);
  ctx.lineTo(66, 445);
  ctx.lineTo(38, 445);
  ctx.closePath();
  ctx.fill();
  // little wooden sign
  ctx.fillStyle = day ? '#2b3040' : '#0d1018';
  ctx.fillRect(88, 408, 4, 40);
  ctx.fillRect(74, 402, 32, 12);

  // the woodshed, padlocked until it isn't
  ctx.fillStyle = day ? '#171c28' : '#05060b';
  ctx.beginPath();
  ctx.moveTo(370, 352);
  ctx.lineTo(470, 312);
  ctx.lineTo(570, 352);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = day ? '#1c2230' : '#070910';
  ctx.fillRect(382, 350, 176, 108);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (let x = 396; x < 556; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 352);
    ctx.lineTo(x, 456);
    ctx.stroke();
  }
  // shed door + hasp; the padlock is gone from the second morning on
  ctx.fillStyle = day ? '#12161f' : '#04050a';
  ctx.fillRect(448, 366, 44, 92);
  ctx.fillStyle = day ? '#2b3345' : '#151a26';
  ctx.fillRect(486, 404, 10, 6);
  if (!g.flag('act2')) {
    ctx.fillStyle = day ? '#3a4258' : '#1d2334';
    ctx.beginPath();
    ctx.roundRect(488, 408, 9, 12, 3);
    ctx.fill();
  }

  // woodpile between the shed and the drive
  ctx.fillStyle = day ? '#151a26' : '#0b0e16';
  for (const [lx, ly] of [[586, 458], [602, 458], [618, 458], [594, 446], [610, 446], [602, 434]] as const) {
    ctx.beginPath();
    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // cabin
  ctx.fillStyle = day ? '#141927' : '#05060b';
  ctx.beginPath();
  ctx.moveTo(920, 302);
  ctx.lineTo(1170, 205);
  ctx.lineTo(1420, 302);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = day ? '#181e2c' : '#080a10';
  ctx.fillRect(950, 300, 440, 158);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (let y = 318; y < 455; y += 18) {
    ctx.beginPath();
    ctx.moveTo(950, y);
    ctx.lineTo(1390, y);
    ctx.stroke();
  }
  // lattice skirting: the crawlspace runs under the whole thing
  ctx.fillStyle = day ? '#10141f' : '#04050a';
  ctx.fillRect(950, 458, 440, 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let x = 958; x < 1390; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, 458);
    ctx.lineTo(x + 8, 470);
    ctx.stroke();
  }

  // chimney; smoke only while the stove is alive (the first night)
  ctx.fillStyle = day ? '#141927' : '#060810';
  ctx.fillRect(1290, 218, 20, 62);
  if (!g.flag('act2')) {
    for (let i = 0; i < 5; i++) {
      const rise = (t * 13 + i * 30) % 150;
      const a = 0.06 * (1 - rise / 150);
      ctx.fillStyle = `rgba(180,190,210,${a})`;
      ctx.beginPath();
      ctx.arc(1300 + Math.sin(t * 0.7 + i * 2) * (6 + rise * 0.12), 214 - rise, 6 + rise * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // porch
  ctx.fillStyle = day ? '#161b27' : '#0a0c12';
  ctx.fillRect(1120, 455, 190, 8);
  ctx.fillStyle = day ? '#11151f' : '#07080e';
  ctx.fillRect(1138, 382, 6, 74);
  ctx.fillRect(1262, 382, 6, 74);

  // front door
  ctx.fillStyle = day ? '#0d1119' : '#04050a';
  ctx.fillRect(1151, 333, 50, 124);
  ctx.fillStyle = '#2a3040';
  ctx.beginPath();
  ctx.arc(1191, 398, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // the window: lit at dusk, dark glass by day, dead when the power goes
  const glass = g.flag('power_out') ? '#0a0f1d' : day ? '#1b2331' : '#f5a94e';
  windowPane(ctx, 1000, 350, 46, 40, glass);

  // sill, key, open lockbox
  ctx.fillStyle = day ? '#141927' : '#0a0c13';
  ctx.fillRect(994, 392, 58, 4);
  if (!g.flag('entered')) {
    ctx.fillStyle = '#c8b06a';
    ctx.fillRect(1016, 388, 9, 3);
  }
  ctx.fillStyle = '#10141f';
  ctx.fillRect(1206, 398, 15, 17);
  ctx.fillStyle = '#151a28';
  ctx.fillRect(1202, 390, 15, 5);

  // boot prints under the window, pressed into the mud. morning only —
  // by night you'd never see them, and by then it doesn't matter.
  if (day) {
    ctx.fillStyle = 'rgba(8,10,16,0.55)';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(972 + i * 22, 458 + (i % 2) * 5);
      ctx.rotate(-0.35);
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Sam's car
  rr(ctx, 118, 400, 152, 42, 14, '#06070b');
  rr(ctx, 150, 376, 84, 34, 10, '#06070b');
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(158, 382, 30, 22);
  ctx.fillRect(196, 382, 30, 22);
  ctx.fillStyle = '#04050a';
  ctx.beginPath();
  ctx.arc(152, 442, 13, 0, Math.PI * 2);
  ctx.arc(240, 442, 13, 0, Math.PI * 2);
  ctx.fill();

  if (g.flag('headlights')) {
    // the beam sweeps the porch
    const grad = ctx.createLinearGradient(272, 0, 1300, 0);
    grad.addColorStop(0, 'rgba(235,235,215,0.2)');
    grad.addColorStop(1, 'rgba(235,235,215,0.04)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(272, 402);
    ctx.lineTo(1310, 348);
    ctx.lineTo(1310, 468);
    ctx.lineTo(272, 430);
    ctx.closePath();
    ctx.fill();
  }
  if (g.flag('tenant_doorway')) {
    // he is standing in the doorway. not chasing. watching.
    ctx.fillStyle = 'rgba(235,230,210,0.14)';
    ctx.fillRect(1151, 333, 50, 124);
    ctx.fillStyle = '#040508';
    ctx.beginPath();
    ctx.roundRect(1165, 363, 22, 64, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1176, 355, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(1168, 425, 7, 31);
    ctx.fillRect(1177, 425, 7, 31);
  }
}

// --- Main room: stove, kitchen, doors to bedroom and the back room ---

export function drawMain(ctx: Ctx2D, g: Game): void {
  const w = 1100;
  const t = g.time;
  const day = g.isDay();
  interiorShell(ctx, w, '#161b29');

  windowPane(ctx, 190, 175, 80, 92, day ? '#8b9cb0' : '#0a0f1d');
  pine(ctx, 214, 262, 40, '#070a12');
  pine(ctx, 244, 262, 30, '#070a12');

  doorFrame(ctx, 70);
  lightSwitch(ctx, 140);

  // key hook: Sam's keys hang here from arrival — until they don't
  ctx.fillStyle = '#1d2434';
  ctx.fillRect(28, 350, 7, 7);
  if (g.flag('entered') && !g.flag('act2')) {
    ctx.fillStyle = '#8f9573';
    ctx.fillRect(29, 357, 3, 9);
    ctx.fillRect(33, 357, 3, 7);
  }

  // sofa — shoved against the front door if Sam barricaded
  const sofaX = g.flag('barricaded') ? 48 : 280;
  rr(ctx, sofaX, 368, 130, 28, 8, '#0b0e17');
  rr(ctx, sofaX, 392, 130, 50, 10, '#0a0d15');
  ctx.fillStyle = '#07090f';
  ctx.fillRect(sofaX + 8, 440, 8, 30);
  ctx.fillRect(sofaX + 114, 440, 8, 30);

  // wood stove
  ctx.fillStyle = '#05060c';
  ctx.fillRect(468, 120, 14, 264);
  rr(ctx, 440, 382, 72, 88, 6, '#07080f');
  if (g.flag('act2')) {
    // dead from the second morning on; nobody relit it
    ctx.fillStyle = '#0d1019';
    ctx.beginPath();
    ctx.arc(476, 428, 9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const flick = 0.5 + 0.28 * (Math.sin(t * 11.3) * 0.6 + Math.sin(t * 27.1) * 0.4);
    ctx.fillStyle = `rgba(255,140,60,${Math.max(0.2, flick)})`;
    ctx.beginPath();
    ctx.arc(476, 428, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // log pile
  ctx.fillStyle = '#0b0e16';
  for (const [lx, ly] of [[532, 458], [548, 458], [540, 446]] as const) {
    ctx.beginPath();
    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  doorFrame(ctx, 560);

  // table and chairs, everything tucked in where it should be
  ctx.fillStyle = '#0a0d15';
  ctx.fillRect(600, 410, 92, 8);
  // guestbook on the table
  ctx.fillStyle = '#1b2233';
  ctx.fillRect(634, 403, 27, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(634, 403, 27, 2);
  ctx.fillStyle = '#0a0d15';
  ctx.fillRect(606, 418, 6, 52);
  ctx.fillRect(680, 418, 6, 52);
  ctx.fillStyle = '#090c13';
  ctx.fillRect(585, 418, 8, 52);
  ctx.fillRect(585, 396, 8, 24);
  if (!g.flag('chair_moved')) {
    ctx.fillRect(699, 418, 8, 52);
    ctx.fillRect(699, 396, 8, 24);
  } else {
    // pulled out from the table, angled, like someone sat down
    ctx.save();
    ctx.translate(718, 430);
    ctx.rotate(0.14);
    ctx.fillRect(-4, -12, 8, 52);
    ctx.fillRect(-4, -34, 8, 24);
    ctx.restore();
  }

  // kitchen counter, drawer, the mug
  rr(ctx, 730, 398, 180, 72, 4, '#0b0e17');
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(730, 398, 180, 3);
  rr(ctx, 768, 412, 52, 16, 3, '#0d1019');
  ctx.fillStyle = '#1d2434';
  ctx.fillRect(788, 419, 12, 3);

  ctx.fillStyle = '#2a3145';
  ctx.fillRect(846, 382, 12, 15);
  ctx.strokeStyle = '#2a3145';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(860, 389, 4, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  // steam: it is still warm, and it should not be
  if (!g.flag('act2')) {
    ctx.strokeStyle = 'rgba(220,228,245,0.07)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(850 + i * 5, 378);
      ctx.quadraticCurveTo(846 + i * 5 + Math.sin(t * 2 + i) * 4, 366, 851 + i * 5, 354);
      ctx.stroke();
    }
  }

  // pantry door, then the open hallway to the back room
  doorFrame(ctx, 950, g.flag('pantry_ajar'), 56);
  ctx.fillStyle = '#0b0e17';
  ctx.fillRect(986, 316, 68, FLOOR_Y - 316);
  ctx.fillStyle = '#05060c';
  ctx.fillRect(993, 322, 54, FLOOR_Y - 322);

  ceilingLamp(ctx, 350, g.flag('lights_main') && !g.flag('power_out'));
  ceilingLamp(ctx, 840, g.flag('lights_main') && !g.flag('power_out'));

  if (g.flag('sheriff_lights')) {
    // red and blue through the window, washing the floor
    const red = Math.sin(g.time * 9) > 0;
    const c = red ? '255,70,70' : '90,130,255';
    ctx.fillStyle = `rgba(${c},0.5)`;
    ctx.fillRect(194, 179, 72, 84);
    ctx.fillStyle = `rgba(${c},0.09)`;
    ctx.fillRect(80, 179, 340, 320);
  }
}

// --- Bedroom ---

export function drawBedroom(ctx: Ctx2D, g: Game): void {
  const w = 900;
  const day = g.isDay();
  interiorShell(ctx, w, '#151a28');

  doorFrame(ctx, 80, true);
  windowPane(ctx, 210, 175, 70, 92, day ? '#8b9cb0' : '#0a0f1d');
  doorFrame(ctx, 850, true);

  // the closet: slatted door, floor to header
  ctx.fillStyle = '#0b0e17';
  ctx.fillRect(688, 310, 64, FLOOR_Y - 310);
  ctx.fillStyle = '#080a11';
  ctx.fillRect(694, 318, 52, FLOOR_Y - 318);
  ctx.fillStyle = '#0e1220';
  for (let sy = 332; sy < 452; sy += 12) ctx.fillRect(696, sy, 48, 4);
  ctx.fillStyle = '#242b3d';
  ctx.fillRect(740, 392, 3, 8);
  if (g.flag('hand_on_door')) {
    // a hand, flat against the slats
    ctx.fillStyle = '#8d8577';
    ctx.beginPath();
    ctx.roundRect(706, 378, 18, 22, 6);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.roundRect(706 + i * 5, 366, 4, 16, 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#111524';
  ctx.beginPath();
  ctx.ellipse(460, 494, 130, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  rr(ctx, 380, 418, 180, 42, 6, '#0a0d15');
  rr(ctx, 384, 398, 172, 26, 8, '#1c2333');
  rr(ctx, 516, 392, 36, 16, 6, '#28304a');
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(384, 412, 172, 3);

  rr(ctx, 590, 414, 40, 46, 4, '#0a0d15');
  // bedside lamp
  ctx.fillStyle = '#0d1019';
  ctx.fillRect(608, 396, 4, 18);
  ctx.beginPath();
  ctx.moveTo(596, 396);
  ctx.lineTo(604, 378);
  ctx.lineTo(616, 378);
  ctx.lineTo(624, 396);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,206,143,0.5)';
  ctx.fillRect(602, 380, 16, 3);

  if (g.flag('bag_dropped') && !g.flag('packed_bag')) {
    rr(ctx, 310, 442, 42, 27, 7, '#05060a');
    ctx.strokeStyle = '#05060a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(331, 442, 12, Math.PI, 0);
    ctx.stroke();
  }
}

// --- Back room: the one the bulb dies in ---

export function drawBackroom(ctx: Ctx2D, g: Game): void {
  const w = 640;
  interiorShell(ctx, w, '#121623');

  doorFrame(ctx, 80, true);
  lightSwitch(ctx, 140);

  // bare bulb on a cord
  ctx.strokeStyle = '#0a0c13';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(320, 84);
  ctx.lineTo(320, 176);
  ctx.stroke();
  const lit = g.flag('bulb_lit');
  ctx.fillStyle = lit ? '#ffd9a0' : '#232a3d';
  ctx.beginPath();
  ctx.arc(320, 183, 7, 0, Math.PI * 2);
  ctx.fill();

  // shelf with boxes that aren't Sam's to open
  ctx.fillStyle = '#0b0e16';
  ctx.fillRect(184, 300, 90, 6);
  ctx.fillRect(184, 360, 90, 6);
  ctx.fillRect(186, 300, 5, 170);
  ctx.fillRect(267, 300, 5, 170);
  rr(ctx, 194, 276, 34, 24, 2, '#0d1019');
  rr(ctx, 232, 270, 30, 30, 2, '#0d1019');
  rr(ctx, 198, 330, 52, 30, 2, '#0d1019');

  // the mattress with no frame
  rr(ctx, 400, 432, 168, 28, 6, '#161b2b');
  rr(ctx, 470, 428, 62, 15, 4, '#1c2231');
  // crushed can
  ctx.fillStyle = '#1a2130';
  ctx.fillRect(578, 448, 7, 12);

  // floor hatch: barely there, until it's open
  if (g.flag('hatch_open')) {
    ctx.fillStyle = '#020308';
    ctx.fillRect(292, 494, 64, 32);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(292, 494, 64, 32);
    // the lid, thrown back against the floor
    ctx.fillStyle = '#0b0e16';
    ctx.save();
    ctx.translate(278, 496);
    ctx.rotate(-0.5);
    ctx.fillRect(-58, 0, 62, 7);
    ctx.restore();
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(292, 494, 64, 32);
    ctx.beginPath();
    ctx.arc(324, 510, 4, 0, Math.PI);
    ctx.stroke();
  }
}

// --- Bathroom: off the bedroom ---

export function drawBathroom(ctx: Ctx2D, g: Game): void {
  const w = 480;
  const day = g.isDay();
  interiorShell(ctx, w, '#141a27');

  doorFrame(ctx, 80, true);
  windowPane(ctx, 96, 140, 34, 46, day ? '#8b9cb0' : '#0a0f1d');

  // towel
  ctx.fillStyle = '#0d1019';
  ctx.fillRect(150, 318, 54, 4);
  ctx.fillStyle = '#182032';
  ctx.beginPath();
  ctx.roundRect(158, 322, 30, 42, 3);
  ctx.fill();

  // vanity light + mirror
  ctx.fillStyle = '#0d1019';
  ctx.fillRect(260, 196, 84, 7);
  ctx.fillStyle = 'rgba(255,217,160,0.55)';
  ctx.fillRect(264, 199, 76, 3);
  ctx.fillStyle = '#1c2434';
  ctx.beginPath();
  ctx.roundRect(266, 210, 72, 92, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(280, 292);
  ctx.lineTo(322, 222);
  ctx.stroke();

  // sink
  ctx.fillStyle = '#141a28';
  ctx.fillRect(248, 396, 108, 12);
  ctx.fillStyle = '#0b0e17';
  ctx.beginPath();
  ctx.roundRect(252, 408, 100, 62, 4);
  ctx.fill();
  ctx.fillStyle = '#2a3245';
  ctx.fillRect(298, 384, 5, 12);
  ctx.fillRect(298, 384, 14, 4);

  // the cup: one toothbrush once Sam unpacks, two in the morning
  ctx.fillStyle = '#232b3f';
  ctx.fillRect(336, 382, 13, 15);
  if (g.flag('unpacked') || day) {
    ctx.strokeStyle = '#3a6fa8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(340, 384);
    ctx.lineTo(338, 368);
    ctx.stroke();
  }
  if (day) {
    ctx.strokeStyle = '#8a8f9c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(345, 384);
    ctx.lineTo(349, 369);
    ctx.stroke();
  }

  // toilet
  ctx.fillStyle = '#0b0e17';
  ctx.beginPath();
  ctx.roundRect(404, 424, 46, 46, 8);
  ctx.fill();
  ctx.fillRect(438, 388, 16, 40);
}

// --- Pantry: boxes in front of something that isn't food ---

export function drawPantry(ctx: Ctx2D, g: Game): void {
  const w = 460;
  interiorShell(ctx, w, '#131826');

  doorFrame(ctx, 80, true);

  // bare bulb; this one works
  ctx.strokeStyle = '#0a0c13';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(230, 84);
  ctx.lineTo(230, 198);
  ctx.stroke();
  ctx.fillStyle = '#ffd9a0';
  ctx.beginPath();
  ctx.arc(230, 205, 6, 0, Math.PI * 2);
  ctx.fill();

  // shelving
  ctx.fillStyle = '#0b0e16';
  for (const y of [252, 312, 372]) ctx.fillRect(250, y, 172, 6);
  ctx.fillRect(252, 252, 5, 218);
  ctx.fillRect(417, 252, 5, 218);
  ctx.fillStyle = '#0d1019';
  const jars = [
    [262, 228, 30, 24], [300, 232, 24, 20], [340, 224, 34, 28],
    [266, 288, 26, 24], [306, 292, 40, 20],
    [270, 348, 36, 24], [318, 352, 22, 20], [352, 344, 30, 28],
  ] as const;
  for (const [bx, by, bw, bh] of jars) ctx.fillRect(bx, by, bw, bh);

  // the floor boxes, and what's behind them
  if (!g.flag('boxes_moved')) {
    ctx.fillStyle = '#0d1019';
    ctx.fillRect(288, 414, 54, 56);
    ctx.fillRect(344, 432, 44, 38);
    ctx.fillRect(298, 382, 46, 34);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(315, 382);
    ctx.lineTo(315, 416);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#0d1019';
    ctx.fillRect(258, 428, 50, 42);
    ctx.fillRect(388, 440, 40, 30);
    if (!g.flag('act4')) {
      // the duffel
      ctx.fillStyle = '#05060a';
      ctx.beginPath();
      ctx.roundRect(316, 434, 66, 32, 9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(322, 442);
      ctx.lineTo(376, 442);
      ctx.stroke();
      if (g.flag('clue_duffel')) {
        // the booking sheet, out where Sam dropped it
        ctx.fillStyle = 'rgba(200,205,216,0.85)';
        ctx.fillRect(394, 456, 15, 11);
        ctx.fillStyle = 'rgba(214,196,92,0.9)';
        ctx.fillRect(396, 460, 11, 2);
      }
    } else {
      // the final night: he took it back. a clean rectangle in the dust.
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(318, 440, 62, 26);
    }
  }
}

// --- Woodshed: tools, one empty outline, and the tally marks ---

export function drawShed(ctx: Ctx2D, g: Game): void {
  const w = 520;
  const day = g.isDay();

  ctx.fillStyle = '#0a0c13';
  ctx.fillRect(0, 0, w, 84);
  ctx.fillStyle = day ? '#141827' : '#101320';
  ctx.fillRect(0, 84, w, FLOOR_Y - 84);
  // vertical planks
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (let x = 18; x < w; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 84);
    ctx.lineTo(x, FLOOR_Y);
    ctx.stroke();
  }
  // dirt floor
  ctx.fillStyle = '#0d0f16';
  ctx.fillRect(0, FLOOR_Y, w, H - FLOOR_Y);

  doorFrame(ctx, 80, true);

  // gaps in the planks let thin daylight through
  if (day) {
    ctx.fillStyle = 'rgba(190,200,215,0.06)';
    for (const x of [148, 252, 388, 470]) ctx.fillRect(x, 100, 3, 300);
  }

  // pegboard: tools hung neat, one shape missing
  ctx.fillStyle = '#0d1019';
  ctx.fillRect(150, 240, 130, 110);
  ctx.strokeStyle = '#1c2231';
  ctx.lineWidth = 2;
  // hammer
  ctx.beginPath();
  ctx.moveTo(170, 258);
  ctx.lineTo(170, 300);
  ctx.moveTo(160, 258);
  ctx.lineTo(182, 258);
  ctx.stroke();
  // saw
  ctx.beginPath();
  ctx.moveTo(198, 262);
  ctx.lineTo(238, 296);
  ctx.lineTo(238, 306);
  ctx.lineTo(204, 276);
  ctx.closePath();
  ctx.stroke();
  // the empty outline: something with a short handle and a heavy head
  ctx.strokeStyle = 'rgba(160,170,190,0.16)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(258, 262);
  ctx.lineTo(258, 310);
  ctx.moveTo(248, 262);
  ctx.lineTo(272, 262);
  ctx.lineTo(272, 274);
  ctx.lineTo(248, 274);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // workbench
  ctx.fillStyle = '#0b0e16';
  ctx.fillRect(310, 396, 150, 10);
  ctx.fillRect(318, 406, 8, 64);
  ctx.fillRect(444, 406, 8, 64);
  ctx.fillStyle = '#0d1019';
  ctx.fillRect(330, 380, 26, 16);
  ctx.fillRect(368, 386, 40, 10);

  // the tallies: groups of five, scratched low on the wall
  ctx.strokeStyle = 'rgba(200,206,220,0.22)';
  ctx.lineWidth = 1.2;
  for (let gi = 0; gi < 14; gi++) {
    const gx = 96 + (gi % 7) * 42;
    const gy = 418 + Math.floor(gi / 7) * 24;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(gx + i * 5, gy);
      ctx.lineTo(gx + i * 5 + srand(gi * 9 + i) * 2 - 1, gy + 13);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(gx - 3, gy + 10);
    ctx.lineTo(gx + 18, gy + 3);
    ctx.stroke();
  }
}

// --- Lakefront: the dock, the flat water, and the camp that faces the house ---

export function drawLake(ctx: Ctx2D, g: Game): void {
  const w = 960;
  const t = g.time;
  const day = g.isDay();

  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  if (day) {
    sky.addColorStop(0, '#46516f');
    sky.addColorStop(1, '#707a8b');
  } else {
    sky.addColorStop(0, '#05070f');
    sky.addColorStop(1, '#0d1222');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, 300);

  // far shore
  for (let i = 0; i < 24; i++) {
    const x = i * 42 + srand(i + 60) * 30;
    pine(ctx, x, 302, 34 + srand(i + 2) * 26, day ? '#333e52' : '#0a0e1a');
  }

  // the water
  const water = ctx.createLinearGradient(0, 300, 0, 440);
  water.addColorStop(0, day ? '#39445a' : '#0a0f1c');
  water.addColorStop(1, day ? '#242c3e' : '#060911');
  ctx.fillStyle = water;
  ctx.fillRect(0, 300, w, 140);
  for (let i = 0; i < 34; i++) {
    const y = 308 + srand(i + 11) * 120;
    const x = srand(i + 77) * (w - 60);
    const a = (day ? 0.12 : 0.06) * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.2));
    ctx.strokeStyle = day ? `rgba(200,214,230,${a})` : `rgba(120,140,180,${a})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 14 + srand(i) * 26, y);
    ctx.stroke();
  }

  // the bank
  ctx.fillStyle = day ? '#1c212e' : '#0c0e16';
  ctx.beginPath();
  ctx.moveTo(0, 470);
  ctx.lineTo(w, 470);
  ctx.lineTo(w, 428);
  ctx.quadraticCurveTo(w * 0.6, 442, 0, 438);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = day ? '#181d29' : '#0a0c13';
  ctx.fillRect(0, FLOOR_Y, w, H - FLOOR_Y);

  // the dock
  ctx.fillStyle = day ? '#202635' : '#0d1019';
  ctx.fillRect(96, 436, 220, 9);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (let x = 106; x < 312; x += 17) {
    ctx.beginPath();
    ctx.moveTo(x, 436);
    ctx.lineTo(x, 445);
    ctx.stroke();
  }
  ctx.fillStyle = day ? '#181d2a' : '#090b12';
  ctx.fillRect(112, 445, 6, 34);
  ctx.fillRect(290, 445, 6, 30);

  // the camp: fire ring, and a chair that faces the house, not the water
  ctx.fillStyle = day ? '#12151f' : '#08090f';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(640 + Math.cos(a) * 26, 456 + Math.sin(a) * 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = day ? '#20242e' : '#101219';
  ctx.beginPath();
  ctx.ellipse(640, 456, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // the chair, angled east — toward the cabin path
  ctx.strokeStyle = day ? '#1c2231' : '#0c0f18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(718, 468);
  ctx.lineTo(726, 432);
  ctx.lineTo(748, 432);
  ctx.lineTo(752, 468);
  ctx.moveTo(726, 432);
  ctx.lineTo(720, 404);
  ctx.stroke();
  // cigarette ends by the chair leg
  if (day) {
    ctx.fillStyle = 'rgba(210,214,224,0.5)';
    for (const [cx, cy] of [[760, 464], [766, 467], [757, 468]] as const) ctx.fillRect(cx, cy, 5, 2);
  }

  // the path back east, worn flat
  ctx.fillStyle = day ? 'rgba(160,168,184,0.05)' : 'rgba(160,168,184,0.02)';
  ctx.beginPath();
  ctx.moveTo(800, 470);
  ctx.lineTo(960, 470);
  ctx.lineTo(960, 452);
  ctx.lineTo(830, 458);
  ctx.closePath();
  ctx.fill();
}

// --- Crawlspace: under the whole house. Low, dry, and lived-in. ---

export function drawCrawl(ctx: Ctx2D, g: Game): void {
  const w = 1100;

  ctx.fillStyle = '#020308';
  ctx.fillRect(0, 0, w, H);

  // foundation wall behind everything
  ctx.fillStyle = '#0b0d14';
  ctx.fillRect(0, 345, w, FLOOR_Y - 345);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  for (let y = 365; y < FLOOR_Y; y += 26) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 30; x < w; x += 52) {
    ctx.beginPath();
    ctx.moveTo(x, 345);
    ctx.lineTo(x - 8, FLOOR_Y);
    ctx.stroke();
  }

  // the floor above: joists, close enough to touch
  ctx.fillStyle = '#0a0c13';
  ctx.fillRect(0, 300, w, 45);
  ctx.fillStyle = '#070910';
  for (let x = 24; x < w; x += 84) ctx.fillRect(x, 300, 14, 50);
  // a pipe running the length
  ctx.strokeStyle = '#10141f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 358);
  ctx.lineTo(w, 358);
  ctx.stroke();

  // dirt floor
  ctx.fillStyle = '#0c0e13';
  ctx.fillRect(0, FLOOR_Y, w, H - FLOOR_Y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.ellipse(srand(i + 5) * w, FLOOR_Y + 8 + srand(i + 9) * 40, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // support posts
  ctx.fillStyle = '#080a10';
  for (const x of [150, 390, 620, 860]) ctx.fillRect(x - 5, 345, 10, FLOOR_Y - 345);

  // THE NEST. sleeping bag, cans, and the wall of paper.
  rr(ctx, 610, 448, 110, 18, 7, '#171b27');
  rr(ctx, 606, 442, 34, 14, 6, '#1c2130');
  ctx.fillStyle = '#171c28';
  ctx.fillRect(580, 456, 8, 13);
  ctx.fillRect(592, 460, 8, 9);
  // papers pinned to the foundation wall, rows of them
  for (let i = 0; i < 11; i++) {
    const px = 640 + (i % 6) * 28 + srand(i + 21) * 6;
    const py = 368 + Math.floor(i / 6) * 32;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((srand(i + 44) - 0.5) * 0.2);
    ctx.fillStyle = `rgba(190,196,210,${0.1 + srand(i) * 0.08})`;
    ctx.fillRect(-8, -11, 16, 22);
    ctx.restore();
  }
  // one photo-dark rectangle among the pale ones
  ctx.fillStyle = 'rgba(60,70,95,0.4)';
  ctx.fillRect(676, 390, 16, 12);

  // the duffel, moved down here — until the keys leave with Sam
  if (!g.flag('has_keys')) {
    ctx.fillStyle = '#05060a';
    ctx.beginPath();
    ctx.roundRect(846, 438, 66, 30, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(852, 446);
    ctx.lineTo(906, 446);
    ctx.stroke();
  }

  // the hatch overhead, east end: a slot of weak light — unless he's there
  if (g.flag('hatch_open') && !g.flag('hatch_blocked')) {
    ctx.fillStyle = 'rgba(200,214,255,0.045)';
    ctx.beginPath();
    ctx.moveTo(988, 302);
    ctx.lineTo(1044, 302);
    ctx.lineTo(1066, FLOOR_Y);
    ctx.lineTo(966, FLOOR_Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = g.flag('hatch_blocked') ? '#010204' : '#0e1322';
  ctx.fillRect(988, 296, 56, 8);
  if (g.flag('hatch_blocked')) {
    // legs, hanging through the opening. sitting on the edge. listening.
    ctx.fillStyle = '#010205';
    ctx.fillRect(1000, 300, 9, 52);
    ctx.fillRect(1016, 300, 9, 46);
  }

  // the vent panel, far west: kicked loose once before, by the look of it
  if (g.flag('vent_open')) {
    ctx.fillStyle = '#0d1524';
    ctx.fillRect(40, 420, 34, 44);
    ctx.fillStyle = 'rgba(170,190,225,0.08)';
    ctx.fillRect(40, 420, 34, 44);
    // the panel on the dirt
    ctx.fillStyle = '#0b0e16';
    ctx.save();
    ctx.translate(88, 462);
    ctx.rotate(0.3);
    ctx.fillRect(0, 0, 34, 6);
    ctx.restore();
  } else {
    ctx.fillStyle = '#0b0e16';
    ctx.fillRect(40, 420, 34, 44);
    ctx.strokeStyle = 'rgba(180,190,210,0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 420, 34, 44);
    for (let y = 428; y < 458; y += 8) {
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(70, y);
      ctx.stroke();
    }
  }
}
