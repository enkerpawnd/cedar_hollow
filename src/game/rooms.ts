import { drawExterior, drawMain, drawBedroom, drawBackroom, drawBathroom, drawPantry, drawShed, drawLake, drawCrawl } from './world';
import { falseStartCo } from './act1';
import { barricadeCo, searchCo } from './act3';
import { endingA, tenantAt, tenantSawHide, duffelGoneCo, enterCrawlCo, exitCrawlCo, crawlKeysCo, ventKickCo } from './act4';
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
      {
        id: 'car', x: 195, y: 380, label: 'your car',
        enabled: always,
        use(g) {
          if (g.flag('act4')) {
            if (g.flag('has_keys')) g.run(endingA(g));
            else g.remark('Locked. And my keys are under a house.');
          } else if (g.flag('act3')) {
            if (!g.flag('srch_car')) {
              g.setFlag('srch_car');
              g.remark(
                'Locked, obviously. It locks itself. Smart car, useless owner.',
                'And no — the spare-key-in-the-bumper thing is a movie thing.',
                'The keys went INTO the house. Somebody carried them in.',
              );
            } else {
              g.remark('Locked. Doing its one job at the worst possible time.');
            }
          } else if (g.flag('act2')) {
            g.remark('Still here. At least the car waited.');
          } else if (!g.flag('entered')) {
            g.remark('Two hours of dirt road to get here. That was the point.', 'It’ll be fine in the driveway.');
          } else {
            g.remark('It’ll be fine in the driveway.');
          }
        },
      },
      {
        id: 'lake_path', x: 66, y: 400, label: 'path to the lake',
        enabled: always,
        use(g) {
          if (g.flag('act3')) g.remark('Not down that path in the dark. Absolutely not.');
          else if (g.isDay()) g.gotoRoom('lake', 870, -1, { quiet: true });
          else g.remark('The listing said “lake views.” The lake can wait for daylight.');
        },
      },
      {
        id: 'shed_door', x: 470, y: 380, label: 'woodshed',
        enabled: always,
        use(g) {
          if (g.flag('act3')) {
            g.remark('Nothing of mine in the shed. And no light in there either.');
          } else if (g.flag('act2')) {
            g.gotoRoom('shed', 130);
          } else if (!g.flag('shed_seen')) {
            g.setFlag('shed_seen');
            g.remark('Padlocked. Not part of the rental, I guess.', 'New lock, though. Shiny new lock on a falling-down shed.');
          } else {
            g.remark('Not my shed, not my problem.');
          }
        },
      },
      {
        id: 'woodpile', x: 602, y: 420, label: 'woodpile',
        enabled: always,
        use(g) {
          if (!g.flag('act2') && g.flag('bag_dropped') && !g.flag('has_logs')) {
            g.setFlag('has_logs');
            g.sound.play('pickup', { vol: 0.45 });
            g.run(function* (): Co {
              g.remark('Three logs, one armload. Lumberjack stuff.');
              yield 3.8;
              g.sound.play('creak', { vol: 0.32, pan: -0.6, rate: 0.8 });
              yield 1.3;
              g.say('...Wind. Branches. Pick one and don’t think about it.');
            }());
          } else if (!g.flag('act2') && g.flag('has_logs') && !g.flag('logs_dropped')) {
            g.remark('Arms are full.');
          } else if (g.flag('act2')) {
            g.remark('More than a weekend’s worth of wood. More than a winter’s.');
          } else {
            g.remark('Split and stacked. Somebody keeps up with this place.');
          }
        },
      },
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
          if (g.flag('act4')) {
            g.remark('No. The car. The car is the whole plan.');
            return;
          }
          g.setFlag('entered');
          g.gotoRoom('main', 110);
        },
      },
      {
        id: 'footprints', x: 985, y: 440, label: 'the ground',
        enabled: (g) => g.isDay(),
        use(g) {
          if (!g.flag('clue_prints')) {
            g.setFlag('clue_prints');
            g.remark(
              'Boot prints in the mud under the window. Deep.',
              'Standing prints, not walking ones. Two feet, planted.',
              'They face the glass.',
            );
          } else {
            g.remark('They face the glass.');
          }
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
          } else if (!(g.flag('packed_bag') && g.flag('packed_charger') && g.flag('packed_toothbrush'))) {
            g.remark('Pack first. Then keys, car, gone.');
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
            if (g.flag('barricaded')) g.remark('The sofa. And even shoved clear — no keys, no car, no chance on foot.');
            else g.remark('Not on foot. Not into those trees. Keys first.');
          } else if (g.flag('choice_open') || g.flag('chose_barricade') || g.flag('chose_search')) {
            g.remark(g.flag('barricaded') ? 'The sofa stays where it is.' : 'Not out there. Not now.');
          } else if (g.flag('leave_early') && !g.flag('act3')) {
            // act two only: once Sam decides to go, it's keys-then-car.
            // act three needs the door open — the car is a search spot.
            g.remark('Keys first.');
          } else {
            g.gotoRoom('exterior', 1108, -1);
          }
        },
      },
      {
        id: 'main_window', x: 230, y: 300, label: 'window',
        enabled: always,
        use(g) {
          if (!g.flag('act2') && g.flag('sleep_try1') && !g.flag('checked_thump')) {
            g.setFlag('checked_thump');
            g.remark('Nothing. Empty porch, still yard.', 'Just my own reflection, jumping at itself.');
          } else if (g.isDay()) {
            g.remark('Grey light, grey yard. The car, the shed, the trees.');
          } else if (g.flag('act3')) {
            g.remark('My own face over a black yard. Anything could be ten feet past the glass.');
          } else {
            g.remark('Black yard. The car is a shape. The trees are a wall.');
          }
        },
      },
      {
        id: 'coat', x: 300, y: 355, label: 'your jacket',
        enabled: always,
        use(g) {
          g.remark('My jacket, over the sofa arm. Making the place look lived-in.');
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
        enabled: (g) => g.flag('act3') && !g.flag('chose_search') && !g.flag('chose_barricade') && !g.flag('act4'),
        use(g) {
          if (g.flag('choice_open')) {
            g.run(barricadeCo(g));
          } else if (!g.flag('srch_sofa')) {
            g.setFlag('srch_sofa');
            g.remark(
              'Cushions up. Coins, crumbs, a pen that isn’t mine.',
              'And my jacket — every pocket, twice. Receipts and a lighter.',
            );
          } else {
            g.remark('The cushions have given all they have to give.');
          }
        },
      },
      {
        id: 'stove', x: 476, y: 380, label: 'wood stove',
        enabled: always,
        use(g) {
          if (g.flag('act2')) {
            g.remark('Cold. Burned itself out overnight.');
          } else if (g.flag('has_logs') && !g.flag('logs_dropped')) {
            g.setFlag('logs_dropped');
            g.sound.play('thump', { vol: 0.4 });
            g.remark('Stacked. Morning me says thanks.');
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
          } else if (g.flag('beat_guestbook')) {
            g.remark('Today’s date. “sam.” No capital.', 'I’m in the book now.');
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
          if (g.flag('act3') && !g.flag('srch_drawer')) {
            g.setFlag('srch_drawer');
            g.remark('Junk drawer, emptied onto the counter.', 'Rubber bands don’t start cars.');
          } else if (g.flag('bulb_popped') && !g.flag('has_flashlight')) {
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
            if (!g.flag('srch_bed')) {
              g.setFlag('srch_bed');
              g.remark(
                'On my knees, phone light under the bed.',
                'Dust. One sock. Not my sock.',
                'Not thinking about the sock.',
              );
            } else {
              g.remark('Still no keys under there. Still one sock.');
            }
          } else if (g.flag('act2')) {
            g.remark(g.flag('leave_early') ? 'No. I’m done sleeping in this house.' : 'I just got up.');
          } else if (!g.flag('bag_dropped')) {
            g.setFlag('bag_dropped');
            g.sound.play('thump', { vol: 0.5 });
            g.remark('Home for three days.');
          } else if (!g.flag('logs_dropped')) {
            g.remark('Firewood first, or the morning me freezes.');
          } else if (!g.flag('ellis_done')) {
            g.remark('Should let Ellis know I made it, first.');
          } else if (!g.flag('ellisB_done')) {
            g.remark('One more text first. The stove thing is bugging me.');
          } else if (!g.flag('unpacked')) {
            g.remark('Road grime. Wash up first, animal.');
          } else if (!g.flag('sleep_try1')) {
            g.setFlag('sleep_try1');
            g.run(falseStartCo(g));
          } else if (!g.flag('checked_thump')) {
            g.remark('Not until I know that was nothing.');
          } else {
            g.setFlag('slept');
          }
        },
      },
      {
        id: 'bag', x: 331, y: 430, label: 'your bag',
        enabled: (g) => g.flag('bag_dropped') && g.flag('leave_early') && !g.flag('packed_bag') && !g.flag('act3'),
        use(g) {
          g.setFlag('packed_bag');
          g.sound.play('pickup', { vol: 0.45 });
          g.remark('Clothes shoved in. Folding is for people with time.');
        },
      },
      {
        id: 'nightstand', x: 610, y: 400, label: 'nightstand',
        enabled: always,
        use(g) {
          if (g.isDay() && g.flag('leave_early') && !g.flag('packed_charger')) {
            g.setFlag('packed_charger');
            g.sound.play('pickup', { vol: 0.4 });
            g.remark('Charger. The phone stays alive. The phone is the plan.');
          } else if (g.flag('act3') && !g.flag('srch_nightstand')) {
            g.setFlag('srch_nightstand');
            g.remark('Drawer out, turned over on the bed.', 'A bible and a dead moth. No keys.');
          } else {
            g.remark('A lamp, a drawer, a bible with a soft spine.');
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
            g.sound.play('switch', { vol: 0.3 });
            // if he watched you fold yourself in there, it isn't hiding
            tenantSawHide(g);
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
      {
        id: 'hatch', x: 324, y: 445, label: 'crawlspace hatch',
        enabled: (g) => g.flag('hatch_open'),
        use(g) {
          if (g.flag('act4')) {
            if (g.flag('duffel_gone_seen') || g.flag('chose_barricade')) g.run(enterCrawlCo(g));
            else g.remark('Down there is last-resort territory. The duffel first.');
          } else {
            g.remark('Ellis said do not go in the crawlspace.', 'For once, Ellis and I want the same thing.');
          }
        },
      },
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
            if (g.flag('ellisB_done') && !g.flag('unpacked')) {
              g.setFlag('unpacked');
              g.remark('Brushed, washed. The blue one goes in the cup.', 'There. Moved in.');
            } else {
              g.remark('Rough drive. I look it.');
            }
          } else if (g.flag('act3')) {
            if (!g.flag('beat_brush_gone')) {
              g.setFlag('beat_brush_gone');
              g.remark('The cup is empty. Mine’s packed. His is…', 'His is gone too. He’s tidying up.');
            } else {
              g.remark('He’s tidying up.');
            }
          } else if (!g.flag('clue_toothbrush')) {
            g.setFlag('clue_toothbrush');
            g.remark('Two toothbrushes in the cup.', 'Mine’s the blue one.', 'The other one is wet.');
          } else if (g.flag('leave_early') && !g.flag('packed_toothbrush') && !g.flag('act3')) {
            g.setFlag('packed_toothbrush');
            g.sound.play('pickup', { vol: 0.4 });
            g.remark('Mine. Just mine.', 'The wet one stays. For the sheriff, or whoever.');
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
        id: 'duffel_gone', x: 330, y: 420, label: 'where the duffel was',
        enabled: (g) => g.flag('boxes_moved') && g.flag('act4'),
        use(g) {
          g.run(duffelGoneCo(g));
        },
      },
      {
        id: 'duffel', x: 330, y: 400, label: 'duffel bag',
        enabled: (g) => g.flag('boxes_moved') && !g.flag('act4'),
        use(g) {
          if (g.flag('choice_open') && !g.flag('chose_barricade') && !g.flag('act3_done')) {
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

  const shed: Room = {
    id: 'shed',
    w: 520,
    ambient: 0.85,
    ambientDay: 0.5,
    ambientNight: 0.94,
    draw: drawShed,
    lights: [],
    items: [
      {
        id: 'shed_out', x: 80, y: 330, label: 'yard',
        enabled: always,
        use(g) {
          g.gotoRoom('exterior', 470);
        },
      },
      examine(
        'pegboard', 210, 'pegboard',
        'Tools hung in careful rows. Hammer. Saw. Pliers.',
        'One outline is empty. Something with a short handle and a heavy head.',
        320,
      ),
      {
        id: 'tallies', x: 250, y: 435, radius: 48, label: 'marks on the wall',
        enabled: always,
        use(g) {
          if (!g.flag('clue_shed')) {
            g.setFlag('clue_shed');
            g.remark(
              'Scratches, low on the wall. Knee height. Groups of five.',
              'Fourteen groups. Fifteen. I keep losing count.',
              'Somebody sat on this floor and counted days.',
            );
          } else {
            g.remark('Counting days. In a shed that isn’t theirs.');
          }
        },
      },
      examine(
        'bench', 385, 'workbench',
        'Wood shavings, fresh enough to smell. A vise, wiped clean.',
        'Somebody uses this bench. Often.',
        380,
      ),
    ],
  };

  const lake: Room = {
    id: 'lake',
    w: 960,
    ambient: 0.55,
    ambientDay: 0.26,
    ambientNight: 0.9,
    draw: drawLake,
    lights: [],
    items: [
      {
        id: 'lake_back', x: 905, y: 430, label: 'back to the cabin',
        enabled: always,
        use(g) {
          g.gotoRoom('exterior', 120, 1, { quiet: true });
        },
      },
      examine(
        'dock', 200, 'dock',
        'Boards gone soft at the ends. The water doesn’t move at all.',
        'Flat. Cold. Honest, at least.',
        420,
      ),
      {
        id: 'campsite', x: 690, y: 425, radius: 95, label: 'camp',
        enabled: always,
        use(g) {
          if (!g.flag('clue_camp')) {
            g.setFlag('clue_camp');
            g.remark(
              'A fire ring. The ash is packed down — used a lot, and not long ago.',
              'A camp chair. Cigarette ends in the dirt beside it.',
              'The chair doesn’t face the water.',
              'It faces the cabin.',
            );
          } else {
            g.remark('Best view of the house on the whole property.');
          }
        },
      },
    ],
  };

  const crawl: Room = {
    id: 'crawl',
    w: 1100,
    ambient: 0.96,
    draw: drawCrawl,
    lights: [
      { x: 1015, y: 400, r: 150, strength: 0.3, on: (g) => g.flag('hatch_open') && !g.flag('hatch_blocked') },
      { x: 57, y: 442, r: 90, strength: 0.25, on: (g) => g.flag('vent_open') },
    ],
    items: [
      {
        id: 'crawl_vent', x: 60, y: 415, label: 'vent panel',
        enabled: (g) => !g.flag('vent_open'),
        use(g) {
          if (g.flag('has_keys')) g.run(ventKickCo(g));
          else g.remark('Kicked loose once before, by the look of the frame.', 'An exit. If it comes to that.');
        },
      },
      {
        id: 'nest', x: 655, y: 430, label: 'his bed',
        enabled: always,
        use(g) {
          if (!g.flag('nest_seen')) {
            g.setFlag('nest_seen');
            g.remark(
              'A sleeping bag gone shiny with use. Cans, stacked neat. A water jug.',
              'He doesn’t camp down here.',
              'He lives down here. Between guests, he just… waits under the floor.',
            );
          } else {
            g.remark('He lives down here.');
          }
        },
      },
      {
        id: 'papers', x: 748, y: 412, label: 'the papers',
        enabled: always,
        use(g) {
          if (!g.flag('papers_seen')) {
            g.setFlag('papers_seen');
            g.remark(
              'Booking printouts, pinned in rows. Months of them. Mine is on top.',
              'Notes in the margins. “quiet.” “leaves food out.” “stays in mornings.”',
              'One from last spring: “nice. talked to me through the door.”',
              'I’m not a guest to him. I’m the schedule.',
            );
          } else {
            g.remark('“stays in mornings.”');
          }
        },
      },
      {
        id: 'crawl_duffel', x: 880, y: 430, label: 'his duffel',
        enabled: (g) => !g.flag('has_keys'),
        use(g) {
          g.run(crawlKeysCo(g));
        },
      },
      {
        id: 'crawl_up', x: 1015, y: 412, label: 'the hatch above',
        enabled: (g) => !g.flag('has_keys') && !g.flag('crawl_still') && !g.flag('hatch_blocked'),
        use(g) {
          if (tenantAt('backroom')) g.remark('Steps. Right above the hatch. Wait.');
          else g.run(exitCrawlCo(g));
        },
      },
    ],
  };

  return { exterior, main, bedroom, backroom, bathroom, pantry, shed, lake, crawl };
}
