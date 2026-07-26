import { anyPressed } from '../engine/input';
import { FLOOR_Y } from './world';
import { delayedSay } from './script';
import { saveCheckpoint } from './save';
import type { Game } from './game';
import type { Co, Ctx2D } from './types';

// The Tenant. Never named, barely seen. All night he keeps the house:
// patrolling, listening, investigating. He does not despawn.
type TMode = 'patrol' | 'investigate' | 'scripted' | 'crawlchase';

type Step = { walk: number } | { thru: string; spawn: number };

const tenant = {
  room: null as string | null,
  x: 0,
  tx: 0,
  speed: 55,
  stepT: 0,
  lightExp: 0,
  mode: 'patrol' as TMode,
  route: [] as Step[],
  pauseT: 0,
  lookT: 0, // post-investigation stand-and-listen
  hyperT: 0, // window where even walking nearby is heard
  burn: false, // he watched the player hide
  breathT: 3,
  graceT: 0, // crawlchase: seconds he's still finding his bearings before he closes
  active: false,
};

// Doorways between the rooms he walks. He never enters the bathroom —
// a locked door is the one thing he respects, which Ellis knew.
const LINKS: Record<string, Record<string, { at: number; enter: number }>> = {
  main: {
    bedroom: { at: 560, enter: 80 },
    pantry: { at: 950, enter: 80 },
    backroom: { at: 1020, enter: 80 },
  },
  bedroom: { main: { at: 80, enter: 560 } },
  pantry: { main: { at: 80, enter: 950 } },
  backroom: { main: { at: 80, enter: 1020 } },
};

const CATCH_TOUCH = 70; // he reaches you
const CATCH_RUN = 230; // running this close, he lunges
const CATCH_CRAWL = 52; // under the house there is no reach, only distance
const LIGHT_GRACE = 0.6; // seconds of light on him before he turns

function over(g: Game): boolean {
  return g.flag('caught') || g.flag('ending');
}

function catchPlayer(g: Game): void {
  if (over(g)) return;
  g.setFlag('caught');
  g.run(endingC(g));
}

function planTo(room: string, x: number): void {
  if (!tenant.room) return;
  const steps: Step[] = [];
  let cur = tenant.room;
  const path: string[] = cur === room ? [] : LINKS[cur]?.[room] ? [room] : ['main', room];
  for (const nxt of path) {
    const l = LINKS[cur][nxt];
    steps.push({ walk: l.at });
    steps.push({ thru: nxt, spawn: l.enter });
    cur = nxt;
  }
  steps.push({ walk: x });
  tenant.route = steps;
  const head = steps[0];
  if ('walk' in head) tenant.tx = head.walk;
}

// A noise reaches him: same room always, adjacent rooms through the walls,
// anywhere if it's loud. He comes to look.
export function tenantNoise(g: Game, room: string, x: number, loud = false): void {
  if (!tenant.active || !tenant.room || over(g)) return;
  if (tenant.mode === 'scripted' || tenant.mode === 'crawlchase') return;
  const same = tenant.room === room;
  const adjacent = !!LINKS[tenant.room]?.[room] || !!LINKS[room]?.[tenant.room];
  if (!same && !adjacent && !loud) return;
  if (!LINKS[room] && !same) return; // noises from rooms he doesn't walk
  tenant.mode = 'investigate';
  tenant.speed = 84;
  tenant.pauseT = 0;
  planTo(room, x);
}

// Where is he? The interactables ask before letting Sam do loud things.
export function tenantAt(room: string): boolean {
  return tenant.room === room;
}

// Called when the player ducks into the closet: if he's in the bedroom and
// close enough — or lit up by the flashlight — the hiding spot is burned.
export function tenantSawHide(g: Game): void {
  if (!tenant.active || over(g) || tenant.mode === 'scripted') return;
  if (tenant.room === 'bedroom' && (Math.abs(tenant.x - g.player.x) < 380 || tenant.lightExp > 0)) {
    tenant.burn = true;
    tenant.mode = 'investigate';
    tenant.speed = 88;
    planTo('bedroom', 720);
  }
}

function stepSound(g: Game): void {
  if (!tenant.room) return;
  if (tenant.room === g.room.id) {
    const rel = Math.max(-1, Math.min(1, (tenant.x - g.player.x) / 480));
    g.sound.play('step_wood', { vol: 0.34, rate: 0.72 + Math.random() * 0.08, pan: rel * 0.8 });
  } else if (LINKS[g.room.id]?.[tenant.room] || LINKS[tenant.room]?.[g.room.id] || g.room.id === 'crawl') {
    // adjacent — or directly overhead, if you're under the house
    const vol = g.room.id === 'crawl' ? 0.16 : 0.1;
    g.sound.play('step_wood', { vol, rate: 0.7 });
  }
}

function pickPatrol(g: Game): void {
  if (!tenant.room || !LINKS[tenant.room]) return;
  const roomW: Record<string, number> = { main: 1100, bedroom: 900, pantry: 460, backroom: 640 };
  // a quarter of the time he drifts toward wherever the player last made
  // a floor creak — i.e. wherever they are, if he can walk there
  const pRoom = g.room.id;
  if (Math.random() < 0.25 && LINKS[pRoom] && pRoom !== tenant.room && !g.player.hidden) {
    planTo(pRoom, 140 + Math.random() * (roomW[pRoom] - 280));
    return;
  }
  if (Math.random() < 0.55) {
    // wander within the room
    planTo(tenant.room, 120 + Math.random() * (roomW[tenant.room] - 240));
  } else {
    const links = Object.keys(LINKS[tenant.room]);
    const nxt = links[Math.floor(Math.random() * links.length)];
    planTo(nxt, 140 + Math.random() * (roomW[nxt] - 280));
  }
}

// Per-frame Tenant simulation: movement, hearing, footsteps, catch rules.
export function tenantTick(g: Game, dt: number): void {
  if (over(g) || g.state !== 'play') return;

  // the closet rule: any input at all while his hand is on the door
  if (g.flag('setpiece_active') && g.player.hidden && anyPressed()) {
    catchPlayer(g);
    return;
  }
  // the hatch rule: any input at all while his legs hang over your head
  if (g.flag('crawl_still')) {
    tenant.lookT += dt;
    if (anyPressed() || (g.player.walking && tenant.lookT > 0.7)) {
      catchPlayer(g);
      return;
    }
  }

  if (!tenant.active || !tenant.room) return;

  // the vent kick + squeeze-out is a fixed 2.2s sequence the player can't
  // influence. reaching the vent is the win, so he takes nobody while it
  // plays — covers the two kicks, the pop, and the fade. once Sam is out
  // in the yard the exterior pursuit re-arms its own catch.
  if (g.flag('vent_kicking') && g.room.id === 'crawl') return;

  if (tenant.hyperT > 0) {
    tenant.hyperT -= dt;
    if (tenant.mode === 'patrol' && tenant.room === g.room.id && g.player.walking && !g.player.hidden) {
      tenantNoise(g, g.room.id, g.player.x);
    }
  }

  // running is loud through walls
  if (g.player.running && !g.player.hidden && tenant.mode === 'patrol') {
    tenantNoise(g, g.room.id, g.player.x);
  }

  if (tenant.mode === 'crawlchase') {
    // he drops in and takes a beat to find you in the dark before he closes —
    // the freeze-to-run handoff needs this air or the catch feels stolen
    if (tenant.graceT > 0) {
      tenant.graceT -= dt;
      tenant.stepT -= dt;
      if (tenant.stepT <= 0) {
        tenant.stepT = 0.85;
        if (g.room.id === 'crawl') g.sound.play('drag', { vol: 0.26, rate: 1.05, pan: 0.6 });
      }
      return;
    }
    tenant.tx = g.player.x;
    const d = tenant.tx - tenant.x;
    tenant.x += Math.sign(d) * tenant.speed * dt;
    tenant.stepT -= dt;
    if (tenant.stepT <= 0) {
      tenant.stepT = 0.85;
      if (g.room.id === 'crawl') {
        const rel = Math.max(-1, Math.min(1, (tenant.x - g.player.x) / 420));
        g.sound.play('drag', { vol: 0.3, rate: 1.1, pan: rel * 0.8 });
      }
    }
    if (g.room.id === 'crawl' && Math.abs(g.player.x - tenant.x) < CATCH_CRAWL) catchPlayer(g);
    return;
  }

  // movement along the current route
  const head = tenant.route[0];
  if (head && 'thru' in head) {
    tenant.room = head.thru;
    tenant.x = head.spawn;
    tenant.route.shift();
    const nxt = tenant.route[0];
    if (nxt && 'walk' in nxt) tenant.tx = nxt.walk;
    if (tenant.room === g.room.id || LINKS[g.room.id]?.[tenant.room]) {
      g.sound.play('creak', { vol: tenant.room === g.room.id ? 0.3 : 0.14, rate: 0.85 });
    }
  } else if (head && 'walk' in head) {
    tenant.tx = head.walk;
    const d = tenant.tx - tenant.x;
    if (Math.abs(d) > 3) {
      tenant.x += Math.sign(d) * tenant.speed * dt;
      tenant.stepT -= dt;
      if (tenant.stepT <= 0) {
        tenant.stepT = 0.62;
        stepSound(g);
      }
    } else {
      tenant.route.shift();
      if (tenant.route.length === 0) {
        if (tenant.mode === 'investigate') {
          // he arrived where the sound was. he stands there. he listens.
          if (tenant.burn && tenant.room === 'bedroom' && Math.abs(tenant.x - 720) < 26 && g.player.hidden) {
            g.sound.play('creak', { vol: 0.45 });
            catchPlayer(g);
            return;
          }
          tenant.burn = false;
          tenant.mode = 'patrol';
          tenant.speed = 55;
          tenant.pauseT = 2.6 + Math.random() * 1.6;
          tenant.hyperT = Math.max(tenant.hyperT, 3.5);
        } else {
          tenant.pauseT = 1.5 + Math.random() * 4;
        }
      }
    }
  } else if (tenant.mode === 'patrol' || tenant.mode === 'investigate') {
    tenant.pauseT -= dt;
    if (tenant.pauseT <= 0) {
      if (Math.random() < 0.25 && tenant.room !== g.room.id) {
        g.sound.play('drag', { vol: 0.12, pan: Math.random() - 0.5 });
        tenant.pauseT = 2 + Math.random() * 2;
      } else {
        pickPatrol(g);
      }
    }
  }

  // presence: you can hear him breathe from across a room
  if (tenant.room === g.room.id && !g.player.hidden && tenant.mode !== 'scripted') {
    tenant.breathT -= dt;
    if (tenant.breathT <= 0 && Math.abs(tenant.x - g.player.x) < 520) {
      tenant.breathT = 3.5 + Math.random() * 1.5;
      g.sound.play('breath', { vol: 0.13, rate: 0.92 });
    }
  }

  // catch rules
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
  ctx.fillStyle = '#010205';
  if (g.room.id === 'crawl') {
    // on all fours, too big for the space, closing
    const lurch = Math.sin(g.time * 5.2) * 3;
    ctx.beginPath();
    ctx.roundRect(x - 26, fy - 46 + lurch * 0.4, 52, 30, 12);
    ctx.fill();
    ctx.beginPath();
    const dir = Math.sign(g.player.x - x) || 1;
    ctx.arc(x + dir * 27, fy - 48 + lurch * 0.3, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#010205';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + dir * 16, fy - 28);
    ctx.lineTo(x + dir * 26 + lurch, fy - 2);
    ctx.moveTo(x - dir * 12, fy - 26);
    ctx.lineTo(x - dir * 22 - lurch, fy - 2);
    ctx.stroke();
    return;
  }
  const stride = Math.abs(tenant.tx - tenant.x) > 3 ? Math.sin(x * 0.09) * 6 : 0;
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

// The pantry: the duffel is gone. He corrected the mistake of being found.
export function* duffelGoneCo(g: Game): Co {
  if (g.flag('duffel_gone_seen')) return;
  g.setFlag('duffel_gone_seen');
  g.say('Gone.');
  yield 2.4;
  g.say('He moved it. He knows I found it.');
  yield 3.4;
  g.say('Ellis said don’t go in the crawlspace. Ellis said it like he knew where things end up.');
  yield 4.2;
  if (!over(g)) g.hint('the hatch — under the back room');
}

// Climbing down into his world.
export function* enterCrawlCo(g: Game): Co {
  if (over(g)) return;
  // not while he's sweeping the house for you
  if (tenant.mode === 'scripted') {
    g.remark('Not now. He’s moving. Hide first.');
    return;
  }
  // not with him in the room, and not with him just beyond the hall
  if (tenant.room === 'backroom' || (tenant.room === 'main' && tenant.x > 840)) {
    g.remark('Not with him this close. Listen. Wait for the steps to fade.');
    return;
  }
  g.cutscene = true;
  g.hint('');
  g.sound.play('creak', { vol: 0.4 });
  yield 1.2;
  g.sound.play('thump', { vol: 0.3 });
  g.fadeToBlack(1, 0.5);
  yield 0.7;
  g.room = g.rooms.crawl;
  g.player.x = 1012;
  g.player.facing = -1;
  g.setAmbience();
  g.onRoomEnter?.('crawl');
  g.fadeToBlack(0, 0.6);
  yield 0.8;
  g.cutscene = false;
  if (!g.flag('crawl_entered')) {
    g.setFlag('crawl_entered');
    g.say('Dirt. Joists a foot over my head. Cold pipe.');
    yield 3.6;
    g.say('This is the house he actually rents.');
    yield 3.0;
    if (!g.player.flashOn) g.hint('F — flashlight');
    else g.hint('his duffel — find my keys');
    if (!g.player.flashOn) {
      yield () => g.player.flashOn || over(g);
      g.hint('his duffel — find my keys');
    }
  }
}

// Climbing back up, if nerve fails before the keys.
export function* exitCrawlCo(g: Game): Co {
  if (over(g)) return;
  g.cutscene = true;
  g.hint('');
  g.sound.play('creak', { vol: 0.4 });
  g.fadeToBlack(1, 0.5);
  yield 0.7;
  g.room = g.rooms.backroom;
  g.player.x = 324;
  g.setAmbience();
  g.fadeToBlack(0, 0.6);
  yield 0.8;
  g.cutscene = false;
  g.hint('the hatch — under the back room');
}

// The keys — and the loudest zipper in the world.
export function* crawlKeysCo(g: Game): Co {
  if (g.flag('has_keys') || over(g)) return;
  g.setFlag('has_keys');
  g.sound.play('pickup', { vol: 0.55 });
  g.cutscene = true;
  g.hint('');
  g.say('Side pocket. Keys— got you. Got you.');
  yield 2.6;
  // above: the footsteps stop.
  g.say('The floor stopped creaking.');
  yield 2.2;
  // hurried steps crossing overhead, left to right, toward the back room
  for (let i = 0; i < 5; i++) {
    g.sound.play('step_wood', { vol: 0.2 + i * 0.05, rate: 0.9, pan: -0.6 + i * 0.3 });
    yield 0.42;
  }
  tenant.mode = 'scripted';
  tenant.room = null;
  g.setFlag('hatch_blocked');
  g.sound.play('thump', { vol: 0.35, pan: 0.7 });
  yield 1.0;
  g.say('He’s at the hatch. Don’t. Move.');
  yield 1.6;
  g.cutscene = false;
  tenant.lookT = 0;
  g.setFlag('crawl_still');
  g.sound.play('breath', { vol: 0.28, rate: 0.85 });
  yield 6.0;
  if (over(g)) return;
  g.flags.delete('crawl_still');
  // he doesn't leave. he comes down.
  g.sound.play('thump', { vol: 0.7, pan: 0.6 });
  g.flags.delete('hatch_blocked');
  yield 0.4;
  tenant.room = 'crawl';
  tenant.x = 1015;
  tenant.tx = 1015;
  tenant.mode = 'crawlchase';
  tenant.speed = 52; // just under the player's crawl (57.75): keep moving and you pull away
  tenant.graceT = 1.2; // a beat to orient before he starts homing
  g.sound.play('drag', { vol: 0.5, pan: 0.6 });
  g.say('No no no— the vent. The VENT.');
  g.hint('the vent — far end — GO');
}

// Two kicks and the panel gives.
export function* ventKickCo(g: Game): Co {
  if (g.flag('vent_open') || g.flag('vent_kicking') || over(g)) return;
  g.setFlag('vent_kicking');
  // reaching the vent IS the win: the kick is a 1.5s animation the player
  // can't influence, so freeze his approach the instant it starts rather
  // than letting him close during it. He hangs a body-length back, watching.
  tenant.mode = 'scripted';
  tenant.tx = tenant.x;
  tenant.route = [];
  g.sound.play('thump', { vol: 0.5 });
  yield 0.8;
  if (over(g)) return;
  g.sound.play('thump', { vol: 0.65 });
  yield 0.7;
  if (over(g)) return;
  g.setFlag('vent_open');
  g.sound.play('pop', { vol: 0.4 });
  yield 0.3;
  if (over(g)) return;
  // out into the night air, under the porch
  g.cutscene = true;
  g.hint('');
  g.fadeToBlack(1, 0.4);
  yield 0.6;
  g.setFlag('via_crawl');
  g.room = g.rooms.exterior;
  g.player.x = 1290;
  g.player.facing = -1;
  g.player.flashOn = false;
  g.setAmbience();
  g.fadeToBlack(0, 0.5);
  yield 0.6;
  g.cutscene = false;
  g.say('Air. Gravel. CAR.');
  g.hint('RUN — the car');
  // he takes the vent too, seconds behind
  yield 2.6;
  if (over(g) || g.flag('ending')) return;
  g.sound.play('thump', { vol: 0.5, pan: 0.8 });
  tenant.mode = 'scripted';
  tenant.room = 'exterior';
  tenant.x = 1330;
  tenant.tx = 210;
  tenant.route = [{ walk: 210 }];
  // faster than a walk, slower than a sprint: the choice is the mechanic
  tenant.speed = 150;
  g.run(function* (): Co {
    // scripted pursuit across the yard: distance is the only rule out here
    while (!over(g) && !g.flag('ending')) {
      if (g.room.id === 'exterior' && Math.abs(g.player.x - tenant.x) < CATCH_TOUCH) {
        catchPlayer(g);
        return;
      }
      yield 0.05;
    }
  }());
}

// ENDING A — Drive. Earn the stall.
export function* endingA(g: Game): Co {
  if (g.flag('ending')) return;
  g.setFlag('ending');
  g.cutscene = true;
  g.hint('');
  g.phone.open = false;
  const viaCrawl = g.flag('via_crawl');
  tenant.room = null;
  tenant.active = false;
  if (!viaCrawl) {
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
  }
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
  g.setFlag(viaCrawl ? 'tenant_yard' : 'tenant_doorway');
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
  tenant.active = false;
  // before the lights: he goes back down. you hear it, wherever you are.
  g.sound.play('creak', { vol: 0.4, pan: 0.6 });
  yield 1.6;
  g.sound.play('drag', { vol: 0.5, pan: 0.6 });
  yield 2.2;
  g.say('Gone. Down. Like water finding a drain.');
  yield 3.0;
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
  g.introLines.push('Dispatch logged a broken 911 call at 11:52. Enough of it got through.');
  yield 4.2;
  g.introLines.push('They walked every room with me. The duffel was gone.');
  yield 4.0;
  g.introLines.push('The crawlspace was empty. The sleeping bag was still warm.');
  yield 4.4;
  g.introLines.push('Nobody named Ellis ever called them. Nobody named Ellis called anyone.');
  yield 4.6;
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
  tenant.active = false;
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
  // labeled, so the dark card reads as an ending and not a crash to menu
  g.endText = 'ending — caught';
  g.state = 'end';
}

// Ellis, from the road. He can't help. He texts anyway.
function* ellisPings(g: Game, barricaded: boolean): Co {
  yield 12;
  if (over(g)) return;
  g.phone.receive('35 min. dont text back if youre hiding. just live', g);
  if (!barricaded) {
    yield 38;
    if (over(g) || g.flag('has_keys')) return;
    g.phone.receive('sam. dont go under the house. promise me', g);
  }
}

// Sam's own 911 call: one bar, half a sentence, and a voice through the
// floorboards that somebody downstairs was never supposed to hear.
function* call911Co(g: Game): Co {
  if (g.flag('called_911') || over(g)) return;
  g.hint('');
  g.phone.forceSignal(1, 14);
  g.phone.startDial('911');
  yield 3.4;
  if (over(g)) {
    g.phone.endCall(g);
    return;
  }
  g.phone.call!.phase = 'active';
  g.phone.call!.t = 0;
  g.sound.play('switch', { vol: 0.3 });
  yield 1.2;
  g.say('—Cedar Hollow. The old Ellis place, off route six. Please—');
  yield 4.4;
  g.phone.forceSignal(0, 10);
  g.sound.play('pop', { vol: 0.35 });
  g.phone.endCall(g);
  g.setFlag('called_911');
  yield 1.4;
  g.say('Dead. How much of that got through?');
  yield 3.0;
  // a voice, out loud, in a house he thought had gone quiet
  tenantNoise(g, g.room.id, g.player.x, true);
  yield 5.2;
  if (over(g)) return;
  g.phone.receive('who were you talking to', g);
  yield 3.8;
  g.say('…How does he know I was talking to someone?');
  yield 3.4;
  g.say('Why would Ellis ask me that.');
  yield 3.0;
  if (!over(g)) g.hint('hold out — and don’t answer him');
}

// The barricade branch. His texts promise the sheriff; the promise
// collapses; the only rescue is the one Sam calls in herself.
function* sheriffTimer(g: Game): Co {
  const bail = (): boolean => g.flag('has_keys') || g.flag('crawl_entered') || over(g);
  const cleanup = (): void => {
    g.phone.dial = null;
  };
  let t = 0;
  const fired = new Set<number>();
  const at = (mark: number, fn: () => void): void => {
    if (t >= mark && !fired.has(mark)) {
      fired.add(mark);
      fn();
    }
  };

  // phase one: the promise. help is always exactly twenty minutes away.
  while (t < 100) {
    yield 0.5;
    t += 0.5;
    if (bail()) return cleanup();
    at(24, () => g.sound.play('drag', { vol: 0.2, pan: 0.5 }));
    at(48, () => {
      g.phone.receive('20 min out. are you hidden?', g);
      if (!g.phone.draft) {
        g.phone.draft = {
          text: 'inside. hurry.',
          onSent: (m) => {
            // the tap of a send is a noise like any other
            tenantNoise(g, g.room.id, g.player.x);
            g.run(function* (): Co {
              yield 2.5;
              m.status = 'delivered';
            }());
          },
        };
      }
    });
    at(82, () => {
      g.run(function* (): Co {
        if (over(g)) return;
        tenant.mode = 'investigate';
        tenant.speed = 70;
        planTo('main', 520);
        yield 2.0;
        g.say('He stopped. Why did he stop.');
        tenant.hyperT = 16;
      }());
    });
  }

  // phase two: the collapse. the sheriff was never coming, because the
  // man who "called" him is standing on the other side of the wall.
  while (t < 128) {
    yield 0.5;
    t += 0.5;
    if (bail()) return cleanup();
    at(101, () => g.phone.receive('sam. sheriff radioed. theres a wreck on the rt 9 bridge, hes stuck behind it', g));
    at(109, () => g.phone.receive('could be an hour. maybe more. im sorry. stay hidden', g));
    at(115, () => g.say('An hour.'));
    at(119, () => g.say('He said forty minutes. Forty minutes ago.'));
    at(124, () => {
      g.say('Nobody is coming unless I make them come.');
      g.phone.draft = null; // that reply's moment has passed
      g.phone.dial = { label: 'CALL 911', onDial: () => g.run(call911Co(g)) };
      g.hint('call 911 yourself — TAB');
    });
  }

  // the wait is now Sam's choice to make real
  while (!g.flag('called_911')) {
    yield 0.5;
    if (bail()) return cleanup();
  }

  // phase three: he knows you called. hold the line.
  let t2 = 0;
  const fired2 = new Set<number>();
  const at2 = (mark: number, fn: () => void): void => {
    if (t2 >= mark && !fired2.has(mark)) {
      fired2.add(mark);
      fn();
    }
  };
  while (t2 < 100) {
    yield 0.5;
    t2 += 0.5;
    if (bail()) return cleanup();
    at2(35, () => {
      g.run(function* (): Co {
        if (over(g)) return;
        const r = LINKS[g.room.id] ? g.room.id : 'bedroom';
        tenant.mode = 'investigate';
        tenant.speed = 74;
        planTo(r, Math.max(140, Math.min(g.player.x, 760)));
        yield 2.2;
        if (!over(g)) tenant.hyperT = 14;
      }());
    });
    at2(70, () => g.say('And Ellis has gone quiet. That’s worse. That’s so much worse.'));
  }
  if (!over(g)) yield* endingB(g);
}

// ACT FOUR — the night. He never leaves. Neither can you, yet.
export function* actFour(g: Game): Co {
  g.setFlag('act4');
  g.cutscene = true;
  g.hint('');
  g.fade = 1;
  const barricaded = g.flag('chose_barricade');
  saveCheckpoint(barricaded ? 'act4b' : 'act4');

  g.onRoomEnter = (id) => {
    if (id === 'backroom' && !g.flag('a4_backroom')) {
      g.setFlag('a4_backroom');
      g.run(delayedSay(g, 1.0, 'The hatch gapes. He could be right below me.'));
    }
  };

  // he is already in the house, and he stays in it
  tenant.active = true;
  tenant.mode = 'patrol';
  tenant.speed = 55;
  tenant.route = [];
  tenant.burn = false;
  if (barricaded) {
    g.room = g.rooms.main;
    g.player.x = 300;
    tenant.room = 'backroom';
    tenant.x = 400;
    tenant.tx = 400;
    tenant.pauseT = 6;
  } else {
    g.room = g.rooms.backroom;
    g.player.x = 180;
    g.player.facing = -1;
    tenant.room = 'main';
    tenant.x = 900;
    tenant.tx = 400;
    tenant.pauseT = 0;
    planTo('main', 400);
  }
  g.player.flashOn = false;
  g.setAmbience();
  yield 0.8;
  g.fadeToBlack(0, 1.6);
  yield 2.0;
  g.cutscene = false;
  g.run(ellisPings(g, barricaded));

  if (barricaded) {
    g.say('Sit still. “Sit still” isn’t a plan, but it’s mine.');
    yield 3.6;
    g.say('Forty minutes. Keep the flashlight off him. Keep a wall between us.');
    g.hint('hold out — or go for the keys');
    g.run(sheriffTimer(g));
  } else {
    g.say('Out. Out of this room. Now.');
    g.hint('get out of the back room — quietly');
    yield () => g.room.id === 'main' || over(g);
    if (over(g)) return;
    yield 1.2;
    g.say(g.flag('knows_keys')
      ? 'I left them. I left the keys in his bag.'
      : 'The duffel. If my keys are anywhere on this earth, they’re in that bag.');
    yield 3.2;
    g.hint('the pantry — his duffel');

    // the pantry is empty; duffelGoneCo fires from the interactable.
    yield () => g.flag('duffel_gone_seen') || over(g);
    if (over(g)) return;

    // THE INTERCEPTION: when the player commits to the long westward cross,
    // he enters the main room from the hall and cuts the cabin in half.
    // (skipped entirely if they slip under the house first)
    const t0 = g.time;
    yield () => over(g) || g.flag('crawl_entered')
      || ((g.room.id === 'main' && g.player.x < 650) || g.time - t0 > 30) && tenant.room !== 'main';
    if (over(g)) return;
    if (g.flag('crawl_entered')) {
      yield () => over(g);
      return;
    }
    tenant.mode = 'scripted';
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
    tenant.route = [{ walk: 600 }];
    g.hint('hide — the bedroom closet');
    g.run(delayedSay(g, 1.4, 'Move. Move, move—'));

    const tI = g.time;
    yield () => g.player.hidden || over(g) || g.flag('crawl_entered') || g.time - tI > 40;
    if (over(g)) return;
    if (g.flag('crawl_entered')) {
      yield () => over(g);
      return;
    }

    if (g.player.hidden) {
      // THE CLOSET. Hold still. Eight real seconds.
      yield 1.2;
      tenant.room = 'bedroom';
      tenant.x = 95;
      tenant.tx = 645;
      tenant.route = [{ walk: 645 }];
      tenant.speed = 52;
      yield () => Math.abs(tenant.x - 645) < 8 || over(g);
      if (over(g)) return;
      tenant.tx = tenant.x;
      tenant.route = [];
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
      tenant.route = [{ walk: 95 }];
      tenant.speed = 60;
      yield () => tenant.x < 115 || over(g);
      if (over(g)) return;
      tenant.room = 'main';
      tenant.x = 590;
      tenant.tx = 900;
      tenant.route = [{ walk: 900 }];
      yield () => tenant.x > 880 || over(g);
      if (over(g)) return;
      g.say('Still in the house. Both of us. Fine.');
    } else {
      // they never hid; he loses the scent and gives the west back
      tenant.tx = 1000;
      tenant.route = [{ walk: 1000 }];
      yield () => tenant.x > 980 || over(g);
      if (over(g)) return;
    }
    // and from here he simply… keeps the house. forever.
    tenant.mode = 'patrol';
    tenant.speed = 55;
    tenant.route = [];
    tenant.pauseT = 2;
    g.hint('the hatch — under the back room');
  }

  // both branches converge on the crawlspace chain (or the sheriff).
  // the coroutines on the interactables drive it; the endings take it away.
  yield () => over(g);
}
