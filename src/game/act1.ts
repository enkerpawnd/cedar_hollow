import { waitFlag } from './script';
import type { Game } from './game';
import type { Co } from './types';

export function* actOne(g: Game): Co {
  g.cutscene = true;
  g.fade = 1;
  yield 1.0;

  // cold open: the listing texts, on black
  const intro = [
    'ELLIS: code’s 4491. lockbox is on the door.',
    'ELLIS: i live just up the road if you need anything.',
    'ELLIS: enjoy the quiet. nobody comes out here this time of year.',
  ];
  for (const line of intro) {
    g.sound.play('text', { vol: 0.4 });
    g.introLines.push(line);
    yield 2.1;
  }
  yield 1.3;
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
  g.hint('settle in — drop your bag in the bedroom');

  yield waitFlag(g, 'bag_dropped');
  yield 1.0;
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
  yield 2.0;
  g.hint('get some sleep');

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
  g.state = 'end';
}
