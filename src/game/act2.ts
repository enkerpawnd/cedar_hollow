import { waitFlag, delayedSay } from './script';
import type { Game } from './game';
import type { Co } from './types';

// ACT TWO — the house is wrong. Daylight, four clues, the midpoint text,
// and the empty key hook.
export function* actTwo(g: Game): Co {
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
  };

  yield 1.0;
  g.fadeToBlack(0, 2.8);
  yield 3.2;
  g.cutscene = false;
  g.say('Morning. Grey out. The quiet held up its end.');
  yield 4.0;
  g.hint('look around the cabin');

  // the pantry duffel is the clue that breaks the denial
  yield waitFlag(g, 'clue_duffel');
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
        g.setFlag('ellis2_done');
      }());
    },
  };

  yield waitFlag(g, 'ellis2_done');
  yield 1.5;
  g.say('Okay. New plan.');
  yield 3.0;
  g.say('I can be packed in ten minutes. It’s not leaving early, it’s beating traffic.');
  g.setFlag('leave_early');
  yield 2.0;
  g.hint('grab the car keys from the hook by the door');

  // the ending lives in the key hook interactable; it cuts to black there
  yield waitFlag(g, 'act2_done');
}
