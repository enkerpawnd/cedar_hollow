import { drawExterior, drawMain, drawBedroom, drawBackroom, drawBathroom, drawPantry } from './world';
import { barricadeCo, searchCo } from './act3';
import { endingA, unbarricadeCo } from './act4';
import type { Game } from './game';
import type { Co, Interactable, Room } from './types';

const always = () => true;

// One-line examines that cycle: first look, then a shorter repeat.
function examine(id: string, x: number, label: string, first: string, repeat: string, y?: number, enabled?: (g: Game) => boolean): Interactable {
  let seen = false;
  return {
    id, x, y, label,
    enabled: enabled ?? always,
    use(g) {
      g.remark(seen ? repeat : first);
      seen = true;
    },
  };
}

function door(id: string, x: number, label: string, to: string, spawnX: number, facing: 1 | -1 = 1, enabled?: (g: Game) => boolean): Interactable {
  return {
    id, x, y: 330, label,
    enabled: enabled ?? always,
    use(g) {
      g.gotoRoom(to, spawnX, facing);
    },
  };
}

function* bulbPop(g: Game): Co {
  g.setFlag('bulb_flicking');
  g.sound.play('switch', { vol: 0.4 });
  g.setFlag('bulb_lit');
  yield 0.55;
  g.flags.delete('bulb_lit');
  yield 0.1;
  g.setFlag('bulb_lit');
  yield 0.8;
  g.flags.delete('bulb_lit');
  yield 0.07;
  g.setFlag('bulb_lit');
  yield 0.3;
  g.flags.delete('bulb_lit');
  g.sound.play('pop', { vol: 0.6 });
  g.setFlag('bulb_popped');
  yield 0.9;
  g.say('Great.');
  yield 2.4;
  g.say('There was a flashlight in one of the kitchen drawers. Pretty sure.');
}

// The Act Two closer: the hook is empty, and the act cuts to black on it.
// act2_done hands control back to the act script, which rolls into Act Three.
function* keysGone(g: Game): Co {
  g.cutscene = true;
  g.hint('');
  g.say('They were right here.');
  yield 3.4;
  g.say('I hung them up last night. I remember hanging them up.');
  yield 4.4;
  g.ambienceOff();
  g.fadeToBlack(1, 0.1);
  yield 2.6;
  g.setFlag('act2_done');
}

export function buildRooms(): Record<string, Room> {
  const exterior: Room = {
    id: 'exterior',
    w: 1400,
    ambient: 0.5,
    draw: drawExterior,
    lights: [
      { x: 1023, y: 370, r: 140, warm: true, on: (g) => !g.flag('power_out') },
      { x: 760, y: 415, r: 430, strength: 0.55, on: (g) => g.flag('headlights') },
      { x: 1176, y: 400, r: 210, strength: 0.6, on: (g) => g.flag('tenant_doorway') },
    ],
    items: [
      examine('car', 195, 'your car', 'Two hours of dirt road to get here. That was the point.', "It'll be fine in the driveway.", 380, (g) => !g.flag('entered')),
      {
        id: 'lockbox', x: 1213, y: 360, label: 'lockbox',
        enabled: always,
        use(g) {
          if (!g.flag('lockbox_seen')) {
            g.setFlag('lockbox_seen');
            g.remark(
              'Host said the code was 4-4-9-1. Box is already open. Key’s just... out.',
              'Maybe he swung by to leave the heat on.',
            );
          } else {
            g.remark('4-4-9-1. Not that it mattered.');
          }
        },
      },
      {
        id: 'front_door', x: 1176, y: 330, label: 'front door',
        enabled: (g) => g.flag('lockbox_seen'),
        use(g) {
          g.setFlag('entered');
          g.gotoRoom('main', 110);
        },
      },
    ],
  };

  let stoveSeen = false;
  const main: Room = {
    id: 'main',
    w: 1100,
    ambient: 0.8,
    ambientDay: 0.3,
    draw: drawMain,
    lights: [
      { x: 476, y: 428, r: 110, warm: true, flicker: true, on: (g) => !g.flag('act2') },
      { x: 350, y: 200, r: 250, warm: true, on: (g) => g.flag('lights_main') && !g.flag('power_out') },
      { x: 840, y: 195, r: 230, warm: true, on: (g) => g.flag('lights_main') && !g.flag('power_out') },
      { x: 230, y: 220, r: 90, strength: 0.35, on: (g) => !g.isDay() },
      { x: 230, y: 230, r: 320, strength: 0.5, on: (g) => g.isDay() },
    ],
    items: [
      {
        id: 'hook', x: 34, y: 350, label: 'key hook',
        enabled: always,
        use(g) {
          if (g.flag('act3')) {
            g.remark('Still empty.');
          } else if (!g.flag('act2')) {
            g.remark('My keys. Right where I can’t forget them.');
          } else if (!g.flag('leave_early')) {
            g.remark('Hm. Thought I hung my keys there.');
          } else if (!g.flag('keys_gone')) {
            g.setFlag('keys_gone');
            g.run(keysGone(g));
          }
        },
      },
      {
        id: 'door_out', x: 70, y: 330, label: 'front door',
        enabled: always,
        use(g) {
          if (g.flag('act4')) {
            if (g.flag('barricaded')) g.run(unbarricadeCo(g));
            else if (g.flag('has_keys')) g.run(endingA(g));
            else g.remark('Not on foot. Not into those trees. Keys.');
          } else if (g.flag('barricaded')) g.remark('The sofa stays where it is.');
          else if (g.flag('act3')) g.remark('Two hours of dark road, on foot, with him out here? No.');
          else if (!g.flag('act2')) g.remark('I just got here. The quiet can wait until Monday.');
          else if (g.flag('leave_early')) g.remark('Keys first.');
          else g.remark('Coffee, pack, lake loop. That was the plan, anyway.');
        },
      },
      {
        id: 'switch_main', x: 140, y: 340, label: 'light switch',
        enabled: always,
        use(g) {
          if (!g.flag('lights_main')) {
            g.setFlag('lights_main');
            g.sound.play('switch', { vol: 0.4 });
          } else {
            g.remark('Nothing else on the panel.');
          }
        },
      },
      {
        id: 'sofa', x: 345, y: 380, label: 'sofa',
        enabled: (g) => g.flag('choice_open') && !g.flag('chose_search') && !g.flag('chose_barricade'),
        use(g) {
          g.run(barricadeCo(g));
        },
      },
      {
        id: 'stove', x: 476, y: 380, label: 'wood stove',
        enabled: always,
        use(g) {
          if (g.flag('act2')) {
            g.remark('Cold. Burned itself out overnight.');
          } else {
            g.remark(stoveSeen ? 'Warm.' : 'Still going. Somebody fed it recently.');
            stoveSeen = true;
          }
        },
      },
      {
        id: 'guestbook', x: 646, y: 385, label: 'guestbook',
        enabled: always,
        use(g) {
          if (!g.flag('act2')) {
            g.remark('Guestbook. I’ll sign it on the way out.');
          } else if (!g.flag('clue_guestbook')) {
            g.setFlag('clue_guestbook');
            g.remark(
              'Guestbook. “Perfect week. So peaceful — Dana & Mike.”',
              '“Lovely cabin, but we decided to leave earl—” It just stops.',
              'The last three entries all left early.',
              'The newest one is four words. “don’t use the back room.”',
            );
          } else {
            g.remark('“don’t use the back room.”');
          }
        },
      },
      {
        id: 'mug', x: 852, y: 375, label: 'coffee mug',
        enabled: always,
        use(g) {
          if (g.flag('act2')) {
            g.remark(g.flag('mug_rinsed') ? 'Put back like nothing happened.' : 'It’s been rinsed. And put back on the counter.');
            g.setFlag('mug_rinsed');
          } else if (!g.flag('mug_seen')) {
            g.setFlag('mug_seen');
            g.remark('Still warm. Okay. He was just here. That’s fine. That’s normal.');
          } else {
            g.remark('Half a cup. Not mine.');
          }
        },
      },
      {
        id: 'drawer', x: 794, y: 400, label: 'kitchen drawer',
        enabled: always,
        use(g) {
          if (g.flag('bulb_popped') && !g.flag('has_flashlight')) {
            g.setFlag('has_flashlight');
            g.sound.play('pickup', { vol: 0.5 });
            g.remark('Flashlight. Batteries work. Good.', 'F to switch it on.');
          } else if (g.flag('has_flashlight')) {
            g.remark('Just the junk now.');
          } else {
            g.remark('Rubber bands. A dead lighter. Takeout menus.');
          }
        },
      },
      door('door_bedroom', 560, 'bedroom', 'bedroom', 120),
      door('door_pantry', 950, 'pantry', 'pantry', 120),
      door('door_back', 1020, 'back room', 'backroom', 120),
    ],
  };

  const bedroom: Room = {
    id: 'bedroom',
    w: 900,
    ambient: 0.72,
    ambientDay: 0.3,
    draw: drawBedroom,
    lights: [
      { x: 610, y: 388, r: 210, warm: true, on: (g) => !g.flag('power_out') },
      { x: 245, y: 220, r: 80, strength: 0.3, on: (g) => !g.isDay() },
      { x: 245, y: 230, r: 280, strength: 0.5, on: (g) => g.isDay() },
    ],
    items: [
      door('bedroom_out', 80, 'main room', 'main', 560),
      {
        id: 'bd_window', x: 245, y: 330, label: 'window',
        enabled: always,
        use(g) {
          if (g.isDay()) g.remark('Grey sky. Flat lake. Nobody for miles. That used to be the good part.');
          else if (g.flag('act3')) g.remark('Black glass again. Anything could be standing out there.');
          else g.remark(g.flag('bd_window_seen') ? 'Just my reflection. Pines behind it.' : 'Black glass. The lake’s out there somewhere.');
          g.setFlag('bd_window_seen');
        },
      },
      {
        id: 'bed', x: 470, y: 380, label: 'bed',
        enabled: always,
        use(g) {
          if (g.flag('act4')) {
            g.remark('No time. No chance.');
          } else if (g.flag('act3')) {
            g.remark('Not even as a joke.');
          } else if (g.flag('act2')) {
            g.remark(g.flag('leave_early') ? 'No. I’m done sleeping in this house.' : 'I just got up.');
          } else if (!g.flag('bag_dropped')) {
            g.setFlag('bag_dropped');
            g.sound.play('thump', { vol: 0.5 });
            g.remark('Home for three days.');
          } else if (!g.flag('ellis_done')) {
            g.remark('Should let Ellis know I made it, first.');
          } else {
            g.setFlag('slept');
          }
        },
      },
      {
        id: 'closet', x: 720, y: 340, label: 'closet',
        enabled: (g) => !g.flag('setpiece_active') && !g.flag('ending'),
        use(g) {
          if (!g.flag('act4')) {
            if (g.flag('act3')) g.remark('If I fold myself in there, I’m never coming back out. Not yet.');
            else g.remark('Spare blankets. Wire hangers. An empty flashlight box.');
            return;
          }
          if (!g.player.hidden) {
            g.player.hidden = true;
            g.player.x = 720;
            g.player.flashOn = false;
            g.setFlag('player_hidden');
            g.sound.play('switch', { vol: 0.3 });
          } else {
            g.player.hidden = false;
            g.sound.play('switch', { vol: 0.3 });
          }
        },
      },
      door('door_bath', 850, 'bathroom', 'bathroom', 140),
    ],
  };

  const backroom: Room = {
    id: 'backroom',
    w: 640,
    ambient: 0.94,
    ambientDay: 0.9,
    draw: drawBackroom,
    lights: [
      { x: 320, y: 190, r: 240, warm: true, on: (g) => g.flag('bulb_lit') },
    ],
    items: [
      door('backroom_out', 80, 'main room', 'main', 1000, -1),
      {
        id: 'switch_back', x: 140, y: 340, label: 'light switch',
        enabled: always,
        use(g) {
          if (g.flag('bulb_popped')) {
            g.remark('Nothing. Bulb’s dead.');
          } else if (!g.flag('bulb_flicking')) {
            g.run(bulbPop(g));
          }
        },
      },
      {
        id: 'mattress', x: 470, y: 400, label: 'mattress',
        enabled: (g) => g.flag('has_flashlight') && g.player.flashOn,
        use(g) {
          if (g.flag('act2')) {
            if (!g.flag('clue_backroom')) {
              g.setFlag('clue_backroom');
              g.remark('Someone’s been sleeping on this. Recently.', '...why is the mattress warm.');
            } else {
              g.remark('Why is it warm.');
            }
          } else {
            g.remark(g.flag('mattress_seen') ? 'Storage. Sure.' : 'A mattress. No frame. ...Storage, I guess.');
            g.setFlag('mattress_seen');
          }
        },
      },
      examine(
        'can', 585, 'crushed can',
        'Energy drink, crushed flat. There’s another one under the shelf.',
        'Not mine either.',
        420,
        (g) => g.flag('has_flashlight') && g.player.flashOn,
      ),
      examine(
        'shelf', 226, 'shelf',
        'Paint cans. A tarp. Boxes that aren’t mine to open.',
        'Not my stuff.',
        330,
        (g) => g.flag('has_flashlight') && g.player.flashOn,
      ),
    ],
  };

  const bathroom: Room = {
    id: 'bathroom',
    w: 480,
    ambient: 0.75,
    ambientDay: 0.35,
    draw: drawBathroom,
    lights: [
      { x: 302, y: 250, r: 170, warm: true, strength: 0.55, on: (g) => !g.flag('power_out') },
      { x: 113, y: 170, r: 160, strength: 0.5, on: (g) => g.isDay() },
    ],
    items: [
      door('bathroom_out', 80, 'bedroom', 'bedroom', 850, -1),
      {
        id: 'mirror', x: 302, y: 330, label: 'mirror',
        enabled: always,
        use(g) {
          if (!g.flag('act2')) {
            g.remark('Rough drive. I look it.');
          } else if (!g.flag('clue_toothbrush')) {
            g.setFlag('clue_toothbrush');
            g.remark('Two toothbrushes in the cup.', 'Mine’s the blue one.', 'The other one is wet.');
          } else {
            g.remark('The other one is wet.');
          }
        },
      },
    ],
  };

  const pantry: Room = {
    id: 'pantry',
    w: 460,
    ambient: 0.88,
    ambientDay: 0.8,
    draw: drawPantry,
    lights: [
      { x: 230, y: 205, r: 150, warm: true, strength: 0.6, on: (g) => !g.flag('power_out') },
    ],
    items: [
      door('pantry_out', 80, 'main room', 'main', 950, -1),
      {
        id: 'boxes', x: 320, y: 380, label: 'boxes',
        enabled: (g) => !g.flag('boxes_moved'),
        use(g) {
          if (!g.flag('act2')) {
            g.remark('Rice, batteries, motor oil. Stocked better than my apartment.');
          } else {
            g.setFlag('boxes_moved');
            g.sound.play('thump', { vol: 0.35 });
            g.remark('Bulk rice. Batteries. And something soft shoved in behind, where the light doesn’t reach.');
          }
        },
      },
      {
        id: 'duffel', x: 330, y: 400, label: 'duffel bag',
        enabled: (g) => g.flag('boxes_moved'),
        use(g) {
          if (g.flag('act4')) {
            if (!g.flag('has_keys')) {
              g.setFlag('has_keys');
              g.sound.play('pickup', { vol: 0.5 });
              g.remark(g.flag('knows_keys') ? 'Side pocket. Keys. Go.' : 'His bag— keys. My keys. Go.');
            } else {
              g.remark('Go. Go, go.');
            }
          } else if (g.flag('choice_open') && !g.flag('chose_barricade') && !g.flag('act3_done')) {
            if (!g.flag('chose_search')) {
              g.setFlag('chose_search');
              g.run(searchCo(g));
            }
          } else if (!g.flag('clue_duffel')) {
            g.setFlag('clue_duffel');
            g.sound.play('pickup', { vol: 0.4 });
            g.remark(
              'A duffel. Men’s clothes, worn soft. A phone charger.',
              'And a printed sheet, folded and refolded until the creases went white.',
              'My booking dates. Highlighted.',
            );
          } else {
            g.remark('My dates. Highlighted.');
          }
        },
      },
    ],
  };

  return { exterior, main, bedroom, backroom, bathroom, pantry };
}
