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

A full run is in the 60–90 minute range: the cabin sits on real grounds
now (a woodshed, a lakefront, and the crawlspace itself), every act is
gated on things you do rather than things you watch, and the final act
is a persistent stealth game.

**Act One — the settling-in night.** The cold-open texts, arrival at dusk,
the already-open lockbox, the warm mug, chimney smoke that shouldn't be
there. Settling in takes a real evening: drop the bag, bring in firewood
from the pile out front (the shed beside it has a shiny new padlock), the
back-room bulb dies (flashlight's in the kitchen drawer), and two text
exchanges with Ellis — including his first cover story, after a pause long
enough to feel like someone choosing words: "old embers mustve caught."
Sleep false-starts on a porch thump; the raccoon text lands right after
you've checked. Then the cut, and a floorboard creak from a room Sam
isn't in.

**Act Two — the grey morning.** Seven clues across the whole property,
found in any order with a live counter: the guestbook ("don't use the back
room"), the warm mattress, the wet second toothbrush, the duffel with your
booking dates highlighted, the shed's tally marks (knee height, groups of
five — the padlock is gone now), the lakefront camp whose chair faces the
cabin instead of the water, and the standing boot prints under the window.
At three clues Ellis texts first — "hows the stay going?" — and Sam notices
she never texted him. The midpoint needs the duffel plus five: the send
hangs at zero bars, "why, is someone there?", the cleaner's-husband story,
and "you booked through sunday right?" Then pack — bag, charger,
toothbrush — and find the hook empty.

**Act Three — nightfall.** The key search is playable: five spots (sofa
cushions, junk drawer, under the bed, the nightstand, the car outside in
the true dark), while the house answers back behind you — the pulled-out
chair, the open pantry door, the emptied toothbrush cup, and the guestbook
open to a new line: today's date and "sam", no capital. Then the breathing
call, and the whole history by text: the father's arrangement, the changed
locks, the bedding the cleaner found under the house in March. Choose:
barricade the door, or go back for the keys. Either way the power dies and
the hatch is open.

**Act Four — the night.** The Tenant is in the house from the first frame
and never leaves. He patrols room to room; footsteps pan and fade with
distance, he breathes when he shares your room, and doorways creak when he
crosses them. He hears running through walls — and the click of your phone.
Hiding only works if he didn't watch you do it. The duffel is gone from the
pantry ("He knows I found it"), so the night runs through the one place
Ellis said never to go: down the hatch, past his nest and his wall of
booking printouts with notes in the margins, to the keys — and the loudest
zipper in the world. Hold still while his legs hang through the hatch, then
he drops in after you, and the crawl-chase runs for the loose vent panel,
out under the porch, and across the yard to the car. The barricade branch
instead is four-plus minutes of cat-and-mouse on a schedule — status texts
from the road (answering one is a noise), a listening freeze, him waiting
by the hatch — until the red-and-blues, unless you go for the keys anyway.

**Endings.** *Drive:* the engine stalls once, catches twice; the headlights
find him standing still — in the doorway, or mid-yard where he stopped
chasing the moment the engine caught. Two miles later the last two texts
load. *Wait* (barricade branch): hold out for the knock — the crawlspace
is empty and the sleeping bag is still warm. *Caught:* the flashlight
drops and rolls, a shadow grows across the beam, and the title card comes
back with the lit window dark. Being caught restarts the night, not the
weekend.

**Saving.** The game autosaves a checkpoint at the start of each act
(branch-aware in Act Four) to the browser's localStorage — no server or
database involved, so it deploys as a plain static site. The title screen
offers "continue" from the last checkpoint or `N` for a new game, and `R`
after being caught lands back on the night, not the whole weekend. Saves
are per-browser/per-device; clearing site data clears them.

Dev shortcuts: open the game with `?act=2` (second morning), `?act=3`
(nightfall, keys missing), `?act=4` (the night, search branch), or `?act=4b`
(the night, barricaded). The URL overrides the saved checkpoint.

## Sound

The game looks for files in `public/audio/` (see `docs/AUDIO.md` for the
exact list). Any sound that's missing is synthesized as a rough placeholder,
so the slice is fully audible with zero assets. Drop in files from your sound
pack to replace the placeholders one by one — no code changes needed.

## Code map

- `src/engine/` — screen scaling, input, audio manager (+ synth fallbacks)
- `src/game/world.ts` — silhouette scenery: cabin rooms plus the exterior,
  woodshed, lakefront, and crawlspace
- `src/game/lighting.ts` — darkness layer, lamp pools, flashlight cone
- `src/game/act1.ts` … `act4.ts` — the screenplay as coroutines; `act4.ts`
  also holds the Tenant's patrol/hearing/investigation AI
- `src/game/rooms.ts` — every interactable, act-aware
- `src/game/game.ts` — orchestration, coroutine runner, UI drawing
- `src/game/phone.ts`, `narration.ts`, `player.ts`

## Roadmap

The script is fully playable at target length. What's left is polish:

- Replace the synth placeholder audio with the real sound pack (see
  `docs/AUDIO.md` — `creak` and `drag` matter most).
- Playtesting passes on the Act Four patrol: pantry dead-end pressure,
  hearing radii, chase speeds, and darkness levels.
- Optional: film grain, a pause menu, gamepad support, itch.io publishing.
