import { waitFlag, delayedSay } from './script';
import { saveCheckpoint } from './save';
import { actFour } from './act4';
import type { Game } from './game';
import type { Co } from './types';

// Everywhere the keys could plausibly be. They're in none of them.
const SEARCHES = ['srch_sofa', 'srch_drawer', 'srch_bed', 'srch_nightstand', 'srch_car'];

export function searchCount(g: Game): number {
  return SEARCHES.filter((f) => g.flag(f)).length;
}

function* searchHints(g: Game): Co {
  let last = -1;
  while (!g.flag('a3_finale')) {
    const n = searchCount(g);
    if (n !== last) {
      last = n;
      g.hint(n === 0 ? 'the keys — tear the place apart' : `the keys — keep tearing (${n}/5)`);
    }
    yield 0.4;
  }
}

// Shared beat: the lights cut out and the hatch is suddenly a fact.
function* powerDies(g: Game): Co {
  yield 0.4;
  g.sound.play('pop', { vol: 0.45 });
  g.sound.play('thump', { vol: 0.55 });
  g.setFlag('power_out');
  g.setFlag('hatch_open');
  yield 1.5;
  g.say('No. No, no—');
  yield 1.8;
}

// Choice A: sofa against the door, wait for the sheriff. You hear the
// crawlspace; you never see it.
export function* barricadeCo(g: Game): Co {
  g.setFlag('chose_barricade');
  g.cutscene = true;
  g.hint('');
  g.sound.play('thump', { vol: 0.5 });
  yield 1.0;
  g.sound.play('thump', { vol: 0.7 });
  yield 1.3;
  g.setFlag('barricaded');
  g.sound.play('door', { vol: 0.5 });
  yield 1.0;
  g.say('Sofa against the door. Very normal weekend.');
  yield 4.2;
  yield* powerDies(g);
  yield 2.2;
  g.sound.play('drag', { vol: 0.55, pan: 0.55 });
  yield 2.8;
  g.say('Under the floor. That sound is coming from under the floor.');
  yield 4.0;
  g.sound.play('drag', { vol: 0.4, pan: 0.25 });
  yield 3.2;
  g.say('Forty minutes. Okay. Forty minutes.');
  yield 3.8;
  g.fadeToBlack(1, 2.5);
  g.ambienceOff();
  yield 3.0;
  g.setFlag('act3_done');
}

// Choice B: go back for the keys. You find them — and the power dies with
// your hand an inch away.
export function* searchCo(g: Game): Co {
  g.cutscene = true;
  g.hint('');
  g.say('His bag. Again. Side pocket, side pocket—');
  yield 3.4;
  g.setFlag('knows_keys');
  g.say('Keys. My keys, zipped in like they live there.');
  yield 3.2;
  yield* powerDies(g);
  g.sound.play('drag', { vol: 0.6, pan: 0 });
  yield 2.4;
  g.say('Under me. It’s moving under me.');
  yield 2.6;
  g.cutscene = false;
  if (!g.player.flashOn) {
    g.flashPrompt = 'press F to turn on the flashlight';
    yield () => g.player.flashOn;
  }
  g.hint('get out of the pantry');
  yield () => g.room.id === 'main';
  yield 1.2;
  g.sound.play('drag', { vol: 0.5, pan: 0.6 });
  yield 1.8;
  g.say('The back room. It came up in the back room.');
  yield 2.0;
  g.hint('the back room');
  // hatchReveal fires on entering the back room and ends the act
}

export function* hatchReveal(g: Game): Co {
  g.cutscene = true;
  g.hint('');
  yield 1.8;
  g.say('The hatch.');
  yield 2.6;
  g.say('That padlock was on it this morning. I know it was.');
  yield 3.2;
  g.sound.play('drag', { vol: 0.6, pan: -0.2 });
  yield 2.8;
  g.sound.play('creak', { vol: 0.5, pan: 0.2 });
  yield 2.6;
  g.fadeToBlack(1, 2.2);
  g.ambienceOff();
  yield 2.8;
  g.setFlag('act3_done');
}

// ACT THREE — contact. A playable search for the keys, the house answering
// back while your back is turned, the call, and the truth by text.
export function* actThree(g: Game): Co {
  saveCheckpoint('act3');
  g.setFlag('act3');
  g.endText = 'end of act three — vertical slice';
  g.cutscene = true;
  g.hint('');
  g.room = g.rooms.main;
  g.player.x = 620;
  g.player.facing = -1;
  g.player.flashOn = false;
  g.fade = 1;
  g.setAmbience();

  // the house changes only while you're in another room
  g.onRoomEnter = (id) => {
    if (id === 'main') {
      const n = searchCount(g);
      if (n >= 2 && !g.flag('chair_moved')) {
        g.setFlag('chair_moved');
        g.run(delayedSay(g, 1.2, 'The chair’s pulled out.'));
        g.run(delayedSay(g, 4.6, 'I push chairs in. It’s a whole thing. I didn’t leave it like that.'));
      } else if (n >= 3 && g.flag('chair_moved') && !g.flag('pantry_ajar')) {
        g.setFlag('pantry_ajar');
        g.run(delayedSay(g, 1.2, 'The pantry door is open.'));
        g.run(delayedSay(g, 4.2, 'I closed it. I know I closed it.'));
      }
    }
    if (id === 'backroom' && g.flag('power_out') && !g.flag('hatch_seen')) {
      g.setFlag('hatch_seen');
      g.run(hatchReveal(g));
    }
  };

  yield 1.0;
  g.fadeToBlack(0, 2.6);
  yield 3.0;
  g.cutscene = false;
  g.say('Dark already. And the keys are still just… not.');
  yield 4.6;
  g.say('They’re not lost. Lost is when you did it.');
  yield 2.0;
  g.run(searchHints(g));

  // five empty hiding places later, the house has run out of excuses
  yield () => searchCount(g) >= 5;
  g.setFlag('a3_finale');
  g.hint('');
  yield 1.5;
  g.say('Five places keys live. Zero keys.');
  yield 3.5;
  yield () => g.room.id === 'main' && !g.cutscene;

  // mop up any beat the player's route skipped, then the guestbook
  if (!g.flag('chair_moved')) {
    g.setFlag('chair_moved');
    g.say('The chair’s pulled out. I didn’t leave it like that.');
    yield 5.0;
  }
  if (!g.flag('pantry_ajar')) {
    g.setFlag('pantry_ajar');
    g.say('And the pantry door is open. I closed it. I know I closed it.');
    yield 5.0;
  }
  yield 1.5;
  g.setFlag('beat_guestbook');
  g.say('The guestbook is open. I left it closed.');
  yield 4.2;
  g.say('There’s a new line under Dana and Mike. Today’s date.');
  yield 4.4;
  g.say('One word. “sam.” No capital.');
  yield 3.6;
  g.say('Like a note to self.');
  yield 4.5;

  // the call
  g.phone.startCall(g);
  g.hint('answer it');
  yield waitFlag(g, 'call_answered');
  g.hint('');
  yield 1.0;
  g.say('Hello?');
  yield 1.8;
  g.sound.play('breath', { vol: 0.55 });
  yield 3.4;
  g.sound.play('breath', { vol: 0.4 });
  yield 3.0;
  g.phone.endCall(g);
  yield 1.0;
  g.say('Breathing. That was breathing.');
  yield 3.0;
  g.say('Whoever it was didn’t want anything. They just wanted me to hear it.');
  yield 3.6;

  // Sam pushes; Ellis finally opens the whole ugly file
  g.hint('text Ellis — TAB');
  g.phone.draft = {
    text: 'someone just called and breathed into the phone. what is going on out there',
    onSent: (m) => {
      g.run(function* (): Co {
        yield 3.0;
        m.status = 'delivered';
        yield 6.0;
        g.phone.receive('ok. i need you to stay calm', g);
        yield 4.2;
        g.phone.receive('my dad used to let a man called Raymond stay at the cabin. a handyman. an arrangement', g);
        yield 5.2;
        g.phone.receive('i ended it when i took over. changed the locks. he kept coming back', g);
        yield 5.2;
        g.phone.receive('he doesnt break in. he waits for the bookings to end. the cleaner found bedding under the house in march', g);
        yield 6.0;
        g.setFlag('ellis3_mid');
      }());
    },
  };
  yield waitFlag(g, 'ellis3_mid');
  yield 1.5;
  g.hint('answer — TAB');
  g.phone.draft = {
    text: 'UNDER THE HOUSE??',
    onSent: (m) => {
      g.run(function* (): Co {
        yield 2.5;
        m.status = 'delivered';
        yield 5.0;
        g.phone.receive('i called the sheriff. stay in a locked room. do NOT go in the crawlspace', g);
        yield 4.0;
        g.phone.receive('he lives out there sam. between bookings. im 40 min away', g);
        yield 3.6;
        g.phone.receive('lock the door', g);
        yield 2.2;
        g.setFlag('ellis3_done');
      }());
    },
  };
  yield waitFlag(g, 'ellis3_done');
  yield 2.2;
  g.hint('shove the sofa against the front door — or go back for the keys');
  g.setFlag('choice_open');

  // the branch coroutines fade to black and raise act3_done
  yield waitFlag(g, 'act3_done');

  yield* actFour(g);
}
