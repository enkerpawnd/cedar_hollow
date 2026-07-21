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
have it) · `TAB` phone · `SHIFT` run (final act only).

## Current state: the full game, Acts One through Four

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

**Act Three** — nightfall, and the house answers back. The chair is pulled
out, the pantry door stands open — always while you were in another room.
Then the call: unknown number, breathing, cut. Ellis finally tells the truth
by text ("he lives out there. between bookings.") and the player chooses:
barricade the front door with the sofa, or go back into the pantry for the
keys. Either way the power dies, the crawlspace hatch is open, and something
drags itself across the wood below. The choice (and whether you know where
the keys are) carries into Act Four.

**Act Four** — the night. The Tenant moves through the cabin; his footsteps
are the warning system. Kill the flashlight when he's near (light on him for
more than a beat = caught), don't run close to him, don't touch him. The
closet set-piece: his hand rests flat on the slats and you hold still — any
input at all, for eight real seconds, is a hard end. Then the keys from his
duffel, the front door (shove the sofa back first if you barricaded — it's
loud, and he hears it), and the car.

**Endings.** *Drive:* the engine stalls once, catches twice; the headlights
find him standing in the doorway, watching; two miles later the last two
texts load. *Wait* (barricade branch only): hold out until the red-and-blue
lights and the knock — the duffel is gone and the crawlspace is empty.
*Caught:* the flashlight drops and rolls, the beam settles on the far wall,
a shadow grows across it, and the title card comes back with the lit window
dark. Being caught restarts the night, not the weekend.

Dev shortcuts: open the game with `?act=2` (second morning), `?act=3`
(nightfall, keys missing), `?act=4` (the night, search branch), or `?act=4b`
(the night, barricaded) to skip ahead with earlier acts resolved.

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

## Roadmap

The script is fully playable. What's left is polish:

- Replace the synth placeholder audio with the real sound pack (see
  `docs/AUDIO.md` — `creak` and `drag` matter most).
- Playtesting passes on walk speed, darkness levels, Tenant timings, and the
  interception difficulty.
- Save points / act select on the title screen (the `?act=` URLs already
  exist as the mechanism).
- Optional: film grain, a pause menu, gamepad support, itch.io publishing.
