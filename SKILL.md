---
name: maven-map
description: Maven Map, by Maven (@maven.iqq). Turns a script or voiceover into a vertical map-explainer Short (geopolitics, borders, straits, history, disasters) on REAL satellite imagery - a 3D globe that dives from space to a street with no hard cut, countries recoloured in place (relief stays visible), glowing routes, moving ships, rulers, pins, count-up numbers and Arabic right-to-left captions timed word by word, with real recorded sound effects and a -14 LUFS master. Arabic first, English too. Use it when the user asks for a map animation, a geography / politics / history map Short, a Maven Map video, or wants a map video like the viral map channels.
---

# Maven Map

A story file (`web/story.js`) declares a camera path and map graphics against the words of the voice; the engine
draws every frame on the GPU in headless Chromium (about 35 ms a frame on an RTX card), and the build step mixes real
sound effects under the voice and masters to -14 LUFS / -1.5 dBTP.

Why it beats image-based map skills: no AI-made or screenshot maps and no hand alignment. The imagery is real
Sentinel-2 satellite data fetched for exactly the views the camera passes through, so every border lands on the right
coast at any zoom, from the whole globe down to a strait or a city.

## Python and paths on this PC
- Run every script with the earshot venv: `D:\reels\earshot\.venv\Scripts\python.exe -P <script>` (numpy, scipy,
  soundfile, PIL). `node` runs `scripts/render.mjs`. Edge TTS runs through `py -3.12`.
- `S = <this skill>/scripts`. A project is any folder; the shared SFX library is `D:/reels/assets-shared/sfx/` (`LIB:` in cues).

## Workflow
1. **New project** - `python S/new.py <folder> --lang ar` (or `--from hormuz-ar` to start from the example).
2. **Script** - `script.txt`. Short sentences, one map idea each (formula in `references/style.md`). Check every
   number against a source before it goes in (distances, barrels, dates) and say where it came from.
3. **Voice + timing** - `python S/voice.py <folder>`. Arabic default: Edge TTS `ar-SA-HamedNeural` at +6% (Maven
   pace, about 2.1-2.4 words/s); English: Kokoro `am_liam` 1.18. For a real ElevenLabs voice set `"engine": "file"`
   and put the recording at `vo/raw.wav`. Writes `vo/voice.wav` + `web/timing.json` (script spelling, whisper times).
4. **Story** - edit `web/story.js` (API in `references/story-api.md`). Key everything to words: `T('هرمز')`.
   Find coordinates yourself (lon, lat) and keep them in named constants.
5. **Imagery** - `python S/build.py <folder> prep`. Downloads the globe once per computer (cache/), then the detail
   patches the camera needs into `web/img/`. Re-run after every camera change.
6. **Check** - `python S/build.py <folder> stills 0.5,2,4,...` -> `check/sheet.jpg`. Look at it: every place the
   voice names is lit on its word, labels clear of the caption band (y ~ 1500), numbers readable, nothing cropped.
7. **Sound** - `cues.json` (format at the top of `scripts/mix.py`): real recordings only (transitions/, pops/,
   impacts/, water/ ... not cinematic/ or synth/), one accent per real event, nothing used more than twice, subtle.
8. **Build** - `python S/build.py <folder> frames` then `final` (or `all`). 120 fps blended to 60 fps for motion
   blur on the dive. Prints loudness, true peak, voice-vs-effects margin and the imagery credit.
9. **Listen check** - `earshot timeline <video>`; report what was measured and what still needs a human listen.
10. **Credit** - put the printed CREDIT line in the description (CC BY 4.0 requires it).

## Ideas, niche and script (when the user starts from nothing)
1. "Help me pick a niche" -> 10 niches that suit maps, each with 2-3 angles: weird borders and exclaves, rivers and water fights,
   the most dangerous places, straits and chokepoints, empires and old routes, "why nobody lives here", journeys and records,
   disasters and climate, size comparisons, Arab history on the map. Prefer angles with a paradox.
2. The niche -> 10 video ideas, each one line with its hook. Prefer real, checkable facts; mark anything that needs a source.
3. Ask the length (15-60 s Short, or longer) and the language (Arabic or English).
4. Write the script in the shape of `references/style.md`: paradox hook -> the question out loud -> one map action per clause
   -> one number at a time -> one-line payoff. Check every number against a source and list the sources under the script.

## The highlight rule
Whenever the voice names a place, it lights up on that word:
- the subject country -> `style:'tint'` (blue), a place the story is about -> `'solid'` (orange); compare with
  `'red'`/`'green'`; one hero feature -> `'glow'`. These recolour the satellite picture, so relief stays visible.
- borderless things (a strait, a sea lane, a mountain range) -> `label` pill + `ping`, a `path`, or a `ruler`.
- keep earlier highlights on screen (fade them with `fade:[time, .4]` when the camera pushes in) so the viewer sees
  how the parts relate. At most two highlight colours per shot.

## v2 (from the GeoGlobeTales breakdown, references/viral-map-shorts-analysis.md)
- Script shape: paradox hook ("هل تعرف إن...") -> the question out loud ("لعد منين؟") -> one map action per clause -> one-line payoff. Numbers every few seconds. Refs read 3 words/s; Arabic at Edge +15% gives about 2.2.
- Look `atlas` (default): bright satellite, teal sea. Regions flash white-hot then cool into a raised, textured colour; neon zones grow from the centre.
- Real rivers (`river`), calligraphic atlas names, slam-in titles, hex-badge icons, an anchored X, count-up measure arrows, `captions({style:'clean'})`.
- The camera never sits still: a slow push on holds, about 0.5 s zooms on reveals; almost no hard cuts.

## Calm by default (2026-11-15)
The user found the flashy v2 "too much light". Keep reveals soft (colour fades up, border draws on), glows low, the desert grade calm, eases smooth (`io`/`sine`), one accent at a time. Use `flash`/neon/slam only when the user asks for punch.
English: Kokoro am_liam at speed 1.0 (about 3.6 words/s) read calmer than 1.12 for map Shorts.

## Files
`engine/map.js` engine (camera, globe shader, land mask, elements, captions) - `engine/index.html` page -
`data/world.json` Natural Earth countries with Arabic names (`scripts/make_world.py` rebuilds it) -
`scripts/` new, voice, prep, render.mjs, build, mix, sheet - `examples/hormuz-ar/` (night look, 12 s), `examples/rivers-ar/` (atlas, 15 s, Arabic) and `examples/nile-en/` (calm atlas, 15 s, English: France laid on Egypt, the valley, the squeeze) -
`references/` style.md, story-api.md, viral-map-shorts-analysis.md (frame-by-frame breakdown of 3 viral map Shorts) - `rights/THIRD_PARTY.md` licences.

## Limits (today)
Country borders and rivers (no provinces/states yet; add Natural Earth admin-1 the same way as world.json). No photo tokens or stock-footage zoom-through yet. Patches do not
cross the date line. Imagery is 2016 (cloud-free mosaic): fine for geography, not for "what it looks like this week".

## Ownership
Maven Map belongs to Maven (Instagram @maven.iqq, YouTube maveniqq). Free to use for videos, including paid ones; not to be sold or re-shared except by Maven's own link. Read `rights/MAVEN-RIGHTS.txt` and keep the `rights/` folder in every copy. Every video needs the EOxCloudless 2016 credit line in its description.

## Set-up on a new computer
`powershell -ExecutionPolicy Bypass -File setup.ps1` (Windows) or `bash setup.sh`: installs Playwright + Chromium and the Python parts, downloads the globe, renders a first test from `examples/nile-en`. Voice: Edge TTS (Arabic or English) or your own recording at `vo/raw.wav` with `"engine": "file"`; timing falls back to faster-whisper when whisper.cpp is not there. Sound cues point at your own library (`MAVEN_SFX_LIB`); missing files are skipped.
