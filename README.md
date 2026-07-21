# CEDAR HOLLOW

A 2-D side-scrolling horror game. You booked a cheap off-season cabin to be
alone for a weekend. Someone has been living in it between guests. They never
left.

No engine — TypeScript, canvas 2D, and WebAudio, built with Vite. Minimal
silhouette art rendered in code. No voice lines; the phone does the talking.

## Run it

```sh
npm install
npm run dev      # opens a local server; play in the browser
npm run build    # typecheck + production build in dist/
```

Click the title screen to start (the click also unlocks browser audio).

**Controls:** `A/D` or `←/→` walk · `E` interact · `F` flashlight (once you
have it) · `TAB` phone.

## Current state: Acts One and Two

**Act One** — the cold-open texts from Ellis, arrival at dusk, the
already-open lockbox, the warm coffee mug, chimney smoke that shouldn't be
there, the back-room bulb dying (get the flashlight from the kitchen drawer),
dropping the bag, the "wasn't me" text exchange, and the sleep cut with a
floorboard creak from a room Sam isn't in.

**Act Two** — grey morning, and the house is wrong. Four clues to find at
your own pace: the guestbook ("don't use the back room"), the warm mattress
in the back room, the duffel behind the pantry boxes with your booking dates
highlighted, and the second toothbrush. The duffel triggers the midpoint
text ("why, is someone there?"), Sam decides to leave a day early, and the
car keys are gone from the hook. Small continuity details reward a second
look: the rinsed mug, the dead stove, the hook that had keys on it the
night before.

Dev shortcut: open the game with `?act=2` in the URL to start on the second
morning with Act One resolved.

## Sound

The game looks for files in `public/audio/` (see `docs/AUDIO.md` for the
exact list). Any sound that's missing is synthesized as a rough placeholder,
so the slice is fully audible with zero assets. Drop in files from your sound
pack to replace the placeholders one by one — no code changes needed.

## Code map

- `src/engine/` — screen scaling, input, audio manager (+ synth fallbacks)
- `src/game/world.ts` — silhouette scenery for each room
- `src/game/lighting.ts` — darkness layer, lamp pools, flashlight cone
- `src/game/act1.ts` — rooms, interactables, and the Act One script as a
  coroutine (this is where the screenplay lives)
- `src/game/game.ts` — orchestration, coroutine runner, UI drawing
- `src/game/phone.ts`, `narration.ts`, `player.ts`

## Roadmap (from the script)

- **Act Three** — moved objects, the phone call, Ellis's warning texts,
  barricade/search choice, power dies, open hatch.
- **Act Four** — the Tenant AI (footstep-driven stealth, flashlight
  discipline), the closet set-piece, run button.
- **Endings** — Drive (with the "you were texting him the whole time" text),
  Wait (empty crawlspace), Caught (dropped flashlight, dark title card).
