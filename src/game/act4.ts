import { anyPressed } from '../engine/input';
import { FLOOR_Y } from './world';
import { delayedSay } from './script';
import type { Game } from './game';
import type { Co, Ctx2D } from './types';

// The Tenant. Never named, barely seen. A room, a position, a direction.
const tenant = {
  room: null as string | null,
  x: 0,
  tx: 0,
  speed: 60,
  stepT: 0,
  lightExp: 0,
};

const CATCH_TOUCH = 70; // he reaches you
const CATCH_RUN = 230; // running this close, he lunges
const LIGHT_GRACE = 0.6; // seconds of light on him before he turns

function over(g: Game): boolean {
  return g.flag('caught') || g.flag('ending');
}

function catchPlayer(g: Game): void {
  if (over(g)) return;
  g.setFlag('caught');
  g.run(endingC(g));
}

// Per-frame Tenant simulation: movement, footsteps, and the catch rules.
export function tenantTick(g: Game, dt: number): void {
  if (over(g) || g.state !== 'play') return;
  // the closet rule: any input at all while his hand is on the door
  if (g.flag('setpiece_active') && g.player.hidden && anyPressed()) {
    catchPlayer(g);
    return;
  }
  if (!tenant.room) return;

  const d0 = tenant.tx - tenant.x;
  if (Math.abs(d0) > 2) {
    tenant.x += Math.sign(d0) * tenant.speed * dt;
    tenant.stepT -= dt;
    if (tenant.stepT <= 0) {
      tenant.stepT = 0.62;
      if (tenant.room === g.room.id) {
        const rel = Math.max(-1, Math.min(1, (tenant.x - g.player.x) / 480));
        g.sound.play('step_wood', { vol: 0.34, rate: 0.72 + Math.random() * 0.08, pan: rel * 0.8 });
      } else {
        g.sound.play('step_wood', { vol: 0.09, rate: 0.7 });
      }
    }
  }

  if (tenant.room !== g.room.id || g.player.hidden) {
    tenant.lightExp = 0;
    return;
  }
  const dist = Math.abs(g.player.x - tenant.x);
  if (g.player.flashOn) {
    tenant.lightExp += dt;
    if (tenant.lightExp > LIGHT_GRACE) {
      catchPlayer(g);
      return;
    }
  } else {
    tenant.lightExp = Math.max(0, tenant.lightExp - dt);
  }
  if (dist < CATCH_TOUCH) {
    catchPlayer(g);
    return;
  }
  if (g.player.running && dist < CATCH_RUN) catchPlayer(g);
}

// He is a slightly-darker shape. The darkness layer does the rest.
export function tenantDraw(ctx: Ctx2D, g: Game): void {
  if (tenant.room !== g.room.id || g.flag('ending')) return;
  const x = tenant.x;
  const fy = FLOOR_Y;
  const stride = Math.abs(tenant.tx - tenant.x) > 2 ? Math.sin(x * 0.09) * 6 : 0;
  ctx.fillStyle = '#010205';
  ctx.strokeStyle = '#010205';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 3, fy - 42);
  ctx.lineTo(x - 3 + stride, fy - 2);
  ctx.moveTo(x + 3, fy - 42);
  ctx.lineTo(x + 3 - stride, fy - 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x - 13, fy - 92, 26, 56, 10);
  ctx.fill();
  const lean = Math.sign(tenant.tx - tenant.x) * 4;
  ctx.beginPath();
  ctx.arc(x + lean, fy - 100, 9.5, 0, Math.PI * 2);
  ctx.fill();
}

// Ending C's shadow, growing across the dropped beam.
export function overlaysDraw(ctx: Ctx2D, g: Game, cam: number): void {
  if (!g.flag('shadow_grow') || !g.droppedLight) return;
  const d = g.droppedLight;
  const k = Math.min(1, Math.max(0, (g.time - d.at - 1.0) / 2.4));
  if (k <= 0) return;
  const bx = d.x - cam + d.dir * 240;
  const h = 130 + k * 250;
  const w = 46 + k * 110;
  ctx.fillStyle = `rgba(1,2,6,${0.35 + 0.55 * k})`;
  ctx.beginPath();
  ctx.ellipse(bx, FLOOR_Y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, FLOOR_Y - h - 12, w * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

// A pass: footsteps approach, he crosses the main room, pauses, goes back.
function* tenantPass(g: Game): Co {
  for (let i = 0; i < 4; i++) {
    if (over(g)) return;
    g.sound.play('step_wood', { vol: 0.12 + i * 0.05, rate: 0.72, pan: 0.6 });
    yield 0.55;
  }
  if (over(g)) return;
  tenant.room = 'main';
  tenant.x = 1040;
  tenant.tx = 320;
  tenant.speed = 62;
  yield () => Math.abs(tenant.x - tenant.tx) < 6 || over(g);
  if (over(g)) { tenant.room = null; return; }
  yield 1.6;
  tenant.tx = 1040;
  yield () => Math.abs(tenant.x - tenant.tx) < 6 || over(g);
  tenant.room = null;
}

export function* provokeTenant(g: Game): Co {
  yield 1.0;
  if (tenant.room === null && !over(g)) yield* tenantPass(g);
}

// Background loop after the closet: he keeps the house.
function* patrolLoop(g: Game): Co {
  while (!over(g)) {
    yield 7 + Math.random() * 6;
    if (over(g)) return;
    if (Math.random() < 0.5) {
      g.sound.play('drag', { vol: 0.16, pan: Math.random() - 0.5 });
      yield 3 + Math.random() * 3;
      if (over(g)) return;
    }
    if (tenant.room === null) yield* tenantPass(g);
  }
}

// The sofa, shoved back from the door. Loud. He hears it.
export function* unbarricadeCo(g: Game): Co {
  if (g.flag('unbarricading') || over(g)) return;
  g.setFlag('unbarricading');
  g.say('The sofa. Fast, fast—');
  g.sound.play('thump', { vol: 0.6 });
  yield 1.2;
  if (over(g)) return;
  g.sound.play('thump', { vol: 0.7 });
  yield 1.2;
  g.flags.delete('barricaded');
  g.flags.delete('unbarricading');
  g.setFlag('unbarricaded');
  g.sound.play('door', { vol: 0.4 });
  if (tenant.room === null && !over(g)) g.run(provokeTenant(g));
}

// ENDING A — Drive. Earn the stall.
export function* endingA(g: Game): Co {
  if (g.flag('ending')) return;
  g.setFlag('ending');
  g.cutscene = true;
  g.hint('');
  g.phone.open = false;
  tenant.room = null;
  g.sound.play('door', { vol: 0.6 });
  g.fadeToBlack(1, 0.4);
  yield 0.6;
  g.room = g.rooms.exterior;
  g.player.x = 1140;
  g.player.facing = -1;
  g.player.hidden = false;
  g.player.flashOn = false;
  g.setAmbience();
  g.fadeToBlack(0, 0.7);
  yield 0.9;
  g.autoMove = { tx: 250, speed: 175 };
  yield () => !g.autoMove;
  g.sound.play('thump', { vol: 0.5 });
  g.player.hidden = true; // in the car
  yield 1.0;
  g.sound.play('engine_fail', { vol: 0.6 });
  yield 1.7;
  g.say('No no no. Come on.');
  yield 1.7;
  g.sound.play('engine_start', { vol: 0.65 });
  yield 0.8;
  g.setFlag('headlights');
  yield 0.6;
  g.setFlag('tenant_doorway');
  yield 1.9;
  g.say('...He’s just standing there.');
  yield 2.8;
  g.fadeToBlack(1, 1.8);
  yield 2.2;
  g.ambienceOff();
  yield 1.6;
  // two miles down the road, two bars come back
  g.sound.play('buzz', { vol: 0.5 });
  g.introLines.push('ELLIS: sheriff says nobody by that name owns cedar hollow.');
  yield 4.2;
  g.sound.play('buzz', { vol: 0.5 });
  g.introLines.push('ELLIS: i think you were texting him the whole time.');
  yield 6.0;
  g.introLines = [];
  yield 1.0;
  g.endWindowLit = true;
  g.endText = 'ending — drive';
  g.state = 'end';
}

// ENDING B — Wait. Survival, hollow.
function* endingB(g: Game): Co {
  if (over(g)) return;
  g.setFlag('ending');
  g.cutscene = true;
  g.hint('');
  g.phone.open = false;
  tenant.room = null;
  if (g.room.id !== 'main') {
    g.fadeToBlack(1, 0.4);
    yield 0.6;
    g.room = g.rooms.main;
    g.player.x = 300;
    g.player.hidden = false;
    g.setAmbience();
    g.fadeToBlack(0, 0.5);
    yield 0.7;
  }
  g.player.hidden = false;
  g.setFlag('sheriff_lights');
  yield 1.6;
  g.say('Red and blue. Red and blue, red and blue—');
  yield 3.8;
  g.sound.play('knock', { vol: 0.6 });
  yield 2.2;
  g.say('A voice. A name and a badge. Real.');
  yield 3.4;
  g.sound.play('knock', { vol: 0.5 });
  yield 1.8;
  g.fadeToBlack(1, 2.2);
  g.ambienceOff();
  yield 3.0;
  g.introLines.push('They walked every room with me. The duffel was gone.');
  yield 4.0;
  g.introLines.push('The crawlspace was empty.');
  yield 4.4;
  g.introLines.push('Cedar Hollow — relisted. Off-season rate.');
  yield 5.0;
  g.introLines = [];
  g.endWindowLit = true;
  g.endText = 'ending — wait';
  g.state = 'end';
}

// ENDING C — Caught. No gore. The flashlight drops and rolls.
function* endingC(g: Game): Co {
  g.cutscene = true;
  g.hint('');
  g.phone.open = false;
  g.autoMove = null;
  // the glimpse: under two seconds, total
  if (g.flag('has_flashlight') && !g.player.hidden) g.player.flashOn = true;
  yield 0.4;
  g.sound.play('step_wood', { vol: 0.5, rate: 0.95 });
  yield 0.25;
  g.sound.play('step_wood', { vol: 0.6, rate: 1.0 });
  yield 0.5;
  g.player.flashOn = false;
  g.player.hidden = false;
  g.droppedLight = { x: g.player.x + g.player.facing * 12, dir: g.player.facing, at: g.time };
  g.sound.play('thump', { vol: 0.5 });
  g.sound.play('creak', { vol: 0.4, pan: 0.3 });
  yield 1.2;
  g.setFlag('shadow_grow');
  g.sound.play('drag', { vol: 0.7 });
  yield 2.8;
  g.sound.play('thump', { vol: 0.8 });
  g.fade = 1;
  g.ambienceOff();
  tenant.room = null;
  yield 2.6;
  g.droppedLight = null;
  g.endWindowLit = false; // the lit window is dark now
  g.endText = '';
  g.state = 'end';
}

// ACT FOUR — the night. Fast, lethal, short.
export function* actFour(g: Game): Co {
  g.setFlag('act4');
  g.cutscene = true;
  g.hint('');
  g.fade = 1;
  tenant.room = null;
  const barricaded = g.flag('chose_barricade');

  g.onRoomEnter = (id) => {
    if (id === 'backroom' && !g.flag('a4_backroom')) {
      g.setFlag('a4_backroom');
      g.run(delayedSay(g, 1.0, 'The hatch gapes. He could be right below me.'));
    }
  };

  if (barricaded) {
    g.room = g.rooms.main;
    g.player.x = 300;
  } else {
    g.room = g.rooms.backroom;
    g.player.x = 180;
    g.player.facing = -1;
  }
  g.player.flashOn = false;
  g.setAmbience();
  yield 0.8;
  g.fadeToBlack(0, 1.6);
  yield 2.0;
  g.cutscene = false;

  if (barricaded) {
    g.say('Sit still. “Sit still” isn’t a plan, but it’s mine.');
    g.hint('hold out — or go for the keys');
    g.run(sheriffTimer(g));
    g.sound.play('drag', { vol: 0.2, pan: 0.5 });
  } else {
    g.say('Out. Out of this room. Now.');
    g.hint('get out of the back room');
    yield () => g.room.id === 'main' || over(g);
    if (over(g)) return;
    yield 1.2;
    g.sound.play('creak', { vol: 0.4, pan: 0.7 });
    g.sound.play('drag', { vol: 0.35, pan: 0.7 });
    g.say('He’s out. He’s in the house.');
    g.hint('the pantry — quietly');
  }

  // the interception: he cuts the cabin in half.
  // barricade branch: he moves when you commit east, toward the pantry.
  // search branch: the pantry is near the back room; he moves when you start
  // the long westward cross toward the door — or the moment you have keys.
  const t0 = g.time;
  if (barricaded) {
    yield () => over(g) || (g.room.id === 'main' && g.player.x > 500) || g.time - t0 > 28;
  } else {
    yield () => over(g) || (g.room.id === 'main' && (g.player.x < 650 || g.flag('has_keys'))) || g.time - t0 > 30;
  }
  if (over(g)) return;
  for (let i = 0; i < 4; i++) {
    if (over(g)) return;
    g.sound.play('step_wood', { vol: 0.14 + i * 0.06, rate: 0.72, pan: 0.7 });
    yield 0.5;
  }
  if (over(g)) return;
  tenant.room = 'main';
  tenant.x = 1040;
  tenant.tx = 600;
  tenant.speed = 55;
  g.hint('hide — the bedroom closet');
  g.run(delayedSay(g, 1.4, 'Move. Move, move—'));

  const tI = g.time;
  yield () => g.player.hidden || over(g) || g.time - tI > 40;
  if (over(g)) return;

  if (g.player.hidden) {
    // THE CLOSET. Hold still. Eight real seconds.
    yield 1.2;
    tenant.room = 'bedroom';
    tenant.x = 95;
    tenant.tx = 645;
    tenant.speed = 52;
    yield () => Math.abs(tenant.x - 645) < 8 || over(g);
    if (over(g)) return;
    tenant.tx = tenant.x;
    yield 0.9;
    g.sound.play('creak', { vol: 0.35, pan: 0.2 });
    yield 0.9;
    g.setFlag('hand_on_door');
    g.sound.play('thump', { vol: 0.22 });
    yield 0.8;
    g.setFlag('setpiece_active');
    g.sound.play('breath', { vol: 0.3 });
    yield 8.0;
    if (over(g)) return;
    g.flags.delete('setpiece_active');
    yield 0.7;
    g.flags.delete('hand_on_door');
    tenant.tx = 95;
    tenant.speed = 60;
    yield () => tenant.x < 115 || over(g);
    if (over(g)) return;
    tenant.room = 'main';
    tenant.x = 590;
    tenant.tx = 1040;
    yield () => tenant.x > 1030 || over(g);
    tenant.room = null;
    g.setFlag('setpiece_done');
    g.say('Gone. Not far.');
  } else {
    // they never hid; he loses the scent and gives the room back
    tenant.tx = 1040;
    yield () => tenant.x > 1030 || over(g);
    tenant.room = null;
  }
  if (over(g)) return;

  g.run(patrolLoop(g));
  if (g.flag('has_keys')) g.hint(g.flag('barricaded') ? 'shove the sofa back, then the door' : 'the front door');
  else g.hint(barricaded ? 'the keys — or hold out for the sheriff' : 'the pantry — his duffel');

  yield () => g.flag('has_keys') || over(g);
  if (over(g)) return;
  g.hint(g.flag('barricaded') ? 'shove the sofa back, then the door' : 'the front door');

  // the endings take it from here
  yield () => over(g);
}

// Ellis said forty minutes. Compressed, that's this.
function* sheriffTimer(g: Game): Co {
  let elapsed = 0;
  while (elapsed < 140) {
    yield 1;
    elapsed += 1;
    if (g.flag('has_keys') || over(g)) return;
  }
  yield* endingB(g);
}
