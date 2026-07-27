import { waitFlag, delayedSay } from './script';
import { saveCheckpoint } from './save';
import { actThree } from './act3';
import type { Game } from './game';
import type { Co } from './types';

// Everything wrong with the house, findable in any order.
const CLUES = [
  'clue_guestbook', 'clue_backroom', 'clue_toothbrush', 'clue_duffel',
  'clue_shed', 'clue_camp', 'clue_prints',
];

function clueCount(g: Game): number {
  return CLUES.filter((f) => g.flag(f)).length;
}

// Keeps the hint honest while the player sweeps the property.
function* clueHints(g: Game): Co {
  let last = -1;
  while (!g.flag('ellis2_started') && !g.flag('act2_done')) {
    const n = clueCount(g);
    if (n !== last) {
      last = n;
      if (n === 0) g.hint('something is off — look around, inside and out');
      else g.hint(`something is wrong with this place — keep looking (${n})`);
    }
    yield 0.4;
  }
}

// ACT TWO — the house is wrong. Daylight, seven clues, the midpoint texts,
// packing, and the empty key hook.
export function* actTwo(g: Game): Co {
  saveCheckpoint('act2');
  g.setFlag('act2');
  g.endText = 'end of act two — vertical slice';
  g.cutscene = true;
  g.hint('');
  g.introLines = [];
  g.room = g.rooms.bedroom;
  g.player.x = 470;
  g.player.facing = -1;
  g.player.flashOn = false;
  g.fade = 1;
  g.setAmbience();

  g.onRoomEnter = (id) => {
    if (id === 'backroom' && !g.flag('warm_noticed')) {
      g.setFlag('warm_noticed');
      g.run(delayedSay(g, 1.4, 'It’s warm in here.'));
      g.run(delayedSay(g, 5.0, 'The stove is at the other end of the cabin. And it’s dead.'));
    }
    if (id === 'exterior' && !g.flag('a2_outside')) {
      g.setFlag('a2_outside');
      g.run(delayedSay(g, 1.2, 'Grey morning. The lake’s down that path somewhere.'));
      g.run(delayedSay(g, 4.8, 'Daylight makes everything look ordinary. Almost.'));
    }
  };

  yield 1.0;
  g.fadeToBlack(0, 2.8);
  yield 3.2;
  g.cutscene = false;
  g.say('Morning. Grey out. The quiet held up its end.');
  yield 4.0;
  g.run(clueHints(g));

  // milestone reactions as the picture assembles
  yield () => clueCount(g) >= 2;
  yield 1.2;
  g.say('Two things. Two things is a coincidence.');

  yield () => clueCount(g) >= 3;
  yield 3.0;
  g.phone.receive('hows the stay going? quiet enough for you?', g);
  yield 4.2;
  g.say('I haven’t texted him since last night. Why’s he checking in now?');

  // the duffel plus enough of the rest breaks the denial
  yield () => g.flag('clue_duffel') && clueCount(g) >= 5;
  g.setFlag('ellis2_started');
  yield 2.5;
  g.hint('text Ellis — TAB');
  g.phone.draft = {
    text: 'hey weird q, does anyone else stay at cedar hollow between guests? found some clothes and stuff',
    onSent: (m) => {
      g.run(function* (): Co {
        // one bar, then none: the send just hangs
        g.phone.forceSignal(1, 5);
        yield 4.5;
        g.phone.forceSignal(0, 4.5);
        yield 4.5;
        g.phone.forceSignal(1, 10);
        yield 3.5;
        m.status = 'delivered';
        yield 3.6;
        g.phone.receive('no. just you this weekend', g);
        yield 3.4;
        g.phone.receive('why, is someone there?', g);
        // let that question sit on the screen
        yield 6.0;
        g.setFlag('ellis2_mid');
      }());
    },
  };

  yield waitFlag(g, 'ellis2_mid');
  yield 2.0;
  g.hint('answer him — TAB');
  g.phone.draft = {
    text: 'probably nothing. theres a duffel in the pantry with a printout of MY booking dates in it',
    onSent: (m) => {
      g.run(function* (): Co {
        yield 3.0;
        m.status = 'delivered';
        // the longest pause yet
        yield 8.5;
        g.phone.receive('thats the cleaners husbands. he does repairs, leaves gear around', g);
        yield 4.5;
        g.phone.receive('the printout is probably her checklist', g);
        yield 5.5;
        g.phone.receive('you booked through sunday right?', g);
        yield 5.5;
        g.setFlag('ellis2_done');
      }());
    },
  };

  yield waitFlag(g, 'ellis2_done');
  yield 1.5;
  g.say('“You booked through Sunday, right.”');
  yield 3.6;
  g.say('Why does that feel like a question about the house’s schedule and not mine?');
  yield 4.2;
  g.say('Okay. New plan. Packed in ten minutes — I’m not leaving early, I’m beating traffic.');
  g.setFlag('leave_early');
  yield 2.4;
  g.hint('pack — bag, charger, toothbrush');

  yield () => g.flag('packed_bag') && g.flag('packed_charger') && g.flag('packed_toothbrush');
  yield 1.2;
  g.say('Everything I own in one bag. Again.');
  yield 2.2;
  g.hint('grab the car keys from the hook by the door');

  // the key hook interactable cuts to black and raises act2_done
  yield waitFlag(g, 'act2_done');

  yield* actThree(g);
}
