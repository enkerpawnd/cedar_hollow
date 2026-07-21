import { waitFlag, delayedSay } from './script';
import type { Game } from './game';
import type { Co } from './types';

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
  g.say('Under the floor. That’s under the floor.');
  yield 4.0;
  g.sound.play('drag', { vol: 0.4, pan: 0.25 });
  yield 3.2;
  g.say('Forty minutes. Okay. Forty minutes.');
  yield 3.8;
  g.fadeToBlack(1, 2.5);
  g.ambienceOff();
  yield 3.0;
  g.setFlag('act3_done');
  g.state = 'end';
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
    g.hint('F — flashlight');
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
  g.say('I walked past that thing twice.');
  yield 3.2;
  g.sound.play('drag', { vol: 0.6, pan: -0.2 });
  yield 2.8;
  g.sound.play('creak', { vol: 0.5, pan: 0.2 });
  yield 2.6;
  g.fadeToBlack(1, 2.2);
  g.ambienceOff();
  yield 2.8;
  g.setFlag('act3_done');
  g.state = 'end';
}

// ACT THREE — contact. The house answers back, the call breathes, Ellis
// finally tells the truth by text, and the player picks their act four.
export function* actThree(g: Game): Co {
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
  let mainVisits = 0;
  g.onRoomEnter = (id) => {
    if (id === 'main') {
      mainVisits++;
      if (mainVisits === 1 && !g.flag('chair_moved')) {
        g.setFlag('chair_moved');
        g.run(delayedSay(g, 1.2, 'The chair’s pulled out.'));
        g.run(delayedSay(g, 4.6, 'I push chairs in. It’s a whole thing. I didn’t leave it like that.'));
      } else if (mainVisits === 2 && !g.flag('pantry_ajar')) {
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
  g.say('Dark already. I spent the whole afternoon tearing this place apart for the keys.');
  yield 5.2;
  g.say('They’re not lost. Lost is when you did it.');
  yield 2.0;
  g.hint('keep searching the cabin');

  yield () => g.flag('chair_moved') && g.flag('pantry_ajar');
  yield 6.0;

  // the call
  g.phone.startCall(g);
  g.hint('answer it');
  yield waitFlag(g, 'call_answered');
  g.hint('');
  yield 1.0;
  g.say('Hello?');
  yield 1.8;
  g.sound.play('breath', { vol: 0.55 });
  yield 5.8;
  g.phone.endCall(g);
  yield 1.0;
  g.say('Breathing. That was breathing.');
  yield 3.2;

  // the reveal lands as text, cold and specific
  g.phone.receive('i called the sheriff. stay in a locked room. do NOT go in the crawlspace', g);
  yield 3.8;
  g.phone.receive('he lives out there. between bookings. we’ve had complaints', g);
  yield 4.0;
  g.phone.receive('i’m 40 min out. lock the door', g);
  yield 4.5;
  g.hint('barricade the door — or go back for those keys');
  g.setFlag('choice_open');

  // the branch coroutines end the act from here
  yield waitFlag(g, 'act3_done');
}
