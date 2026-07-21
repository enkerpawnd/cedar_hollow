import { drawExterior, drawMain, drawBedroom, drawBackroom } from './world';
import { delayedSay } from './script';
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
      g.say(seen ? repeat : first);
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

export function buildRooms(): Record<string, Room> {
  const exterior: Room = {
    id: 'exterior',
    w: 1400,
    ambient: 0.5,
    draw: drawExterior,
    lights: [
      { x: 1023, y: 370, r: 140, warm: true, on: always },
    ],
    items: [
      examine('car', 195, 'your car', 'Two hours of dirt road to get here. That was the point.', "It'll be fine in the driveway.", 380, (g) => !g.flag('entered')),
      {
        id: 'lockbox', x: 1213, y: 360, label: 'lockbox',
        enabled: always,
        use(g) {
          if (!g.flag('lockbox_seen')) {
            g.setFlag('lockbox_seen');
            g.say('Host said the code was 4-4-9-1. Box is already open. Key’s just... out.');
            g.run(delayedSay(g, 4.5, 'Maybe he swung by to leave the heat on.'));
          } else {
            g.say('4-4-9-1. Not that it mattered.');
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

  const main: Room = {
    id: 'main',
    w: 1100,
    ambient: 0.8,
    draw: drawMain,
    lights: [
      { x: 476, y: 428, r: 110, warm: true, flicker: true, on: always },
      { x: 350, y: 200, r: 250, warm: true, on: (g) => g.flag('lights_main') },
      { x: 840, y: 195, r: 230, warm: true, on: (g) => g.flag('lights_main') },
      { x: 230, y: 220, r: 90, strength: 0.35, on: always },
    ],
    items: [
      {
        id: 'door_out', x: 70, y: 330, label: 'front door',
        enabled: always,
        use(g) {
          g.say('I just got here. The quiet can wait until Monday.');
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
            g.say('Nothing else on the panel.');
          }
        },
      },
      examine('stove', 476, 'wood stove', 'Still going. Somebody fed it recently.', 'Warm.', 380),
      {
        id: 'mug', x: 852, y: 375, label: 'coffee mug',
        enabled: always,
        use(g) {
          if (!g.flag('mug_seen')) {
            g.setFlag('mug_seen');
            g.say('Still warm. Okay. He was just here. That’s fine. That’s normal.');
          } else {
            g.say('Half a cup. Not mine.');
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
            g.say('Flashlight. Batteries work. Good.');
            g.run(delayedSay(g, 3.5, 'F to switch it on.'));
          } else if (g.flag('has_flashlight')) {
            g.say('Just the junk now.');
          } else {
            g.say('Rubber bands. A dead lighter. Takeout menus.');
          }
        },
      },
      door('door_bedroom', 560, 'bedroom', 'bedroom', 120),
      door('door_back', 1020, 'back room', 'backroom', 120),
    ],
  };

  const bedroom: Room = {
    id: 'bedroom',
    w: 700,
    ambient: 0.72,
    draw: drawBedroom,
    lights: [
      { x: 610, y: 388, r: 210, warm: true, on: always },
      { x: 245, y: 220, r: 80, strength: 0.3, on: always },
    ],
    items: [
      door('bedroom_out', 80, 'main room', 'main', 560),
      examine('bd_window', 245, 'window', 'Black glass. The lake’s out there somewhere.', 'Just my reflection. Pines behind it.', 330),
      {
        id: 'bed', x: 470, y: 380, label: 'bed',
        enabled: always,
        use(g) {
          if (!g.flag('bag_dropped')) {
            g.setFlag('bag_dropped');
            g.sound.play('thump', { vol: 0.5 });
            g.say('Home for three days.');
          } else if (!g.flag('ellis_done')) {
            g.say('Should let Ellis know I made it, first.');
          } else {
            g.setFlag('slept');
          }
        },
      },
    ],
  };

  const backroom: Room = {
    id: 'backroom',
    w: 640,
    ambient: 0.94,
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
            g.say('Nothing. Bulb’s dead.');
          } else if (!g.flag('bulb_flicking')) {
            g.run(bulbPop(g));
          }
        },
      },
      examine(
        'mattress', 470, 'mattress',
        'A mattress. No frame. ...Storage, I guess.',
        'It’s warm. Why is it warm.',
        400,
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

  return { exterior, main, bedroom, backroom };
}
