# Audio manifest

Put files in `public/audio/` named exactly as below, in `.ogg`, `.mp3`, or
`.wav` (checked in that order). Anything missing falls back to a synthesized
placeholder, so you can replace sounds one at a time and hear the difference
immediately.

| File name | Used for | What to look for in a pack |
|---|---|---|
| `wind` | Outdoor ambience loop (ducked indoors) | Cold pine-forest wind bed, loopable, no birds |
| `fire` | Wood-stove loop indoors | Low fireplace crackle, loopable, gentle |
| `step_wood` | One footstep on cabin floor (pitch-varied per step) | Single soft sock/boot step on old wood |
| `step_gravel` | One footstep outside | Single step on gravel/dirt |
| `door` | Any door open/close on room change | Heavy wooden door thunk, short |
| `switch` | Light switch, flashlight toggle, phone open | Small dry click |
| `pop` | The back-room bulb dying | Bulb filament pop / small electrical snap |
| `buzz` | Phone vibrating on a received text | Short phone vibration on a table, 2 pulses |
| `text` | Sent-message tone and the cold-open notifications | Soft two-note notification blip |
| `creak` | The floorboard beat after Sam falls asleep (also Acts 3–4) | Slow wooden floor creak under weight — the most important file here |
| `pickup` | Taking the flashlight | Small object pickup / cloth-and-metal rustle |
| `thump` | Bag dropped on the floor; barricading; the power cutting out | Soft heavy fabric thump |
| `breath` | The Act Three phone call; the closet set-piece | Slow breathing, close to a mic, ~5 seconds, no voice |
| `drag` | Weight moving across wood in the crawlspace (Acts 3–4) | Slow heavy drag/scrape on boards — second most important file after `creak` |
| `knock` | The sheriff at the door (Ending B) | Three firm knocks on a wooden door |
| `engine_fail` | The car stalling on the first turn (Ending A) | Starter motor cranking, engine failing to turn over, ~1.5s |
| `engine_start` | The second turn, when it catches | Engine turning over and settling into idle |

Every sound in the game is listed above — nothing else is planned.

Tips: keep footsteps and clicks dry (no reverb baked in), keep loops at
consistent volume so the crossfades stay smooth, and prefer `.ogg` for size.
