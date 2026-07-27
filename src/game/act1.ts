import { waitFlag, waitTap } from './script';
import { actTwo } from './act2';
import type { Game } from './game';
import type { Co } from './types';

export function* actOne(g: Game): Co {
  g.cutscene = true;
  g.fade = 1;
  yield 1.0;

  // cold open: the listing texts, on black — paged at the reader's pace so
  // the premise never scrolls off before it's read
  const intro = [
    'ELLIS: code’s 4491. lockbox is on the door.',
    'ELLIS: water heater knocks at night. ignore it, place is old.',
    'ELLIS: i live just up the road if you need anything.',
    'ELLIS: nobody comes out here this time of year. enjoy the quiet.',
  ];
  g.takeAdvance(); // clear the click that started the game
  // let all the texts arrive at a readable pace, building up on screen…
  for (const line of intro) {
    g.sound.play('text', { vol: 0.4 });
    g.introLines.push(line);
    yield 2.0;
  }
  // …then hold on the full exchange until the player is ready to move on
  yield 0.6;
  g.introAdvance = true;
  yield waitTap(g);
  g.introAdvance = false;
  yield 0.4;
  g.introLines = [];

  g.setAmbience();
  g.fadeToBlack(0, 3);
  yield 3.4;
  g.cutscene = false;
  g.say('That was the part I paid for. The quiet.');
  yield 3.5;
  g.hint('check the lockbox');

  yield waitFlag(g, 'lockbox_seen');
  g.hint('head inside');

  yield waitFlag(g, 'entered');
  yield 1.4;
  g.say('Smaller than the photos. Cleaner, too.');
  yield 2.6;
  g.hint('hang your car keys on the hook by the door');

  yield waitFlag(g, 'keys_hung');
  yield 1.2;
  g.hint('settle in — drop your bag near the bed');

  yield waitFlag(g, 'bag_dropped');
  yield 1.6;
  g.say('Stove’s going, but it’ll want feeding by morning.');
  yield 2.6;
  g.hint('bring in firewood — the pile is out front');

  yield waitFlag(g, 'has_logs');
  g.hint('stack the wood by the stove');

  yield waitFlag(g, 'logs_dropped');
  yield 1.2;
  g.hint('text Ellis you arrived — TAB');
  g.phone.draft = {
    text: 'hey just got in, thanks for leaving the heat on',
    onSent: (m) => {
      g.run(function* (): Co {
        yield 3.4;
        m.status = 'delivered';
        yield 4.2;
        g.phone.receive('wasn’t me. haven’t been out there in a week', g);
        yield 2.8;
        g.phone.receive('cleaner mustve left it. enjoy your stay', g);
        yield 1.2;
        g.setFlag('ellis_done');
      }());
    },
  };

  yield waitFlag(g, 'ellis_done');
  yield 3.0;
  g.say('“Wasn’t me.” Then who left the heat on?');
  yield 3.6;
  g.hint('ask about the stove — TAB');
  g.phone.draft = {
    text: 'quick q — the wood stove was already lit when i got in. cleaner does that too?',
    onSent: (m) => {
      g.run(function* (): Co {
        yield 3.2;
        m.status = 'delivered';
        // the long pause of somebody choosing their words
        yield 7.0;
        g.phone.receive('…the cleaner doesn’t light fires', g);
        yield 5.2;
        g.phone.receive('old embers mustve caught. happens with these stoves', g);
        yield 3.4;
        g.phone.receive('anyway. sleep well', g);
        yield 2.2;
        g.setFlag('ellisB_done');
      }());
    },
  };

  yield waitFlag(g, 'ellisB_done');
  yield 1.8;
  g.say('Embers that caught themselves and then fed themselves all afternoon. Sure.');
  yield 4.4;
  g.hint('wash up — the bathroom is off the bedroom');

  yield waitFlag(g, 'unpacked');
  yield 1.6;
  g.hint('get some sleep');

  // the bed starts falseStartCo; the porch interrupts
  yield waitFlag(g, 'sleep_try1');
  yield waitFlag(g, 'checked_thump');
  yield 4.5;
  g.phone.receive('forgot to say — if you hear scratching at night it’s raccoons. they get under the porch', g);
  yield 3.8;
  g.say('Under the porch. Great. Roommates.');
  yield 2.6;
  g.hint('okay. sleep. actually sleep this time.');

  yield waitFlag(g, 'slept');
  g.cutscene = true;
  g.hint('');
  g.player.flashOn = false;
  g.fadeToBlack(1, 3.2);
  g.ambienceOff();
  yield 4.8;
  // a floorboard, from a room Sam isn't in
  g.sound.play('creak', { vol: 0.5, pan: -0.5 });
  yield 3.2;

  yield* actTwo(g);
}

// The first try at sleep. The porch has other ideas.
export function* falseStartCo(g: Game): Co {
  g.cutscene = true;
  g.hint('');
  g.fadeToBlack(0.85, 2.4);
  yield 3.0;
  // the porch: a sharp thump out of the dark that jolts Sam awake
  g.sound.play('thump', { vol: 0.62, pan: -0.45 });
  yield 0.5;
  g.sound.play('thump', { vol: 0.42, pan: -0.35 });
  yield 1.1;
  g.fadeToBlack(0, 0.7);
  // the wake itself: a sharp inhale and a slamming heart
  g.sound.play('breath', { vol: 0.55, rate: 1.6 });
  g.sound.play('thump', { vol: 0.3 });
  yield 0.9;
  g.cutscene = false;
  g.say('The porch. That was the porch.');
  yield 2.6;
  g.hint('check the front window');
}
