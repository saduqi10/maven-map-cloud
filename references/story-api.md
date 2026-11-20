# story.js API

```js
import { cam, region, ghost, river, riverLine, shade, swarm, atlasName, title, icon, measure, path, ships, ruler, pin, ping, label, number, flash, dim, captions, cut, end, T, start } from './map.js';
// ... declare everything ...
start();   // always last
```

**Time** - every `at` / `until` / camera time takes seconds or a word: `T('هرمز')` (start of the word),
`T('هرمز#2')` (2nd time it is said), `T('هرمز.end')` (end of the word), `T('هرمز+0.2')`. Diacritics and
punctuation are ignored; a prefix match is the fallback.

**Places** are `[lon, lat]`. Countries are ISO3 codes (`'IRN'`, `'OMN'`, `'IRQ'`) or English / Arabic names.

| call | what | main options |
|---|---|---|
| `cam(t, {lon, lat, span, cy, ease, dive})` | camera key. `span` = degrees of arc across the frame width (190 = globe in space, 120 = globe filling the frame, 8 = a region, 1.4 = a strait, 0.2 = a city). Span moves on a log scale, so space-to-street is smooth. `dive:true` turns to the target first, then falls in. `cy` = where the centre sits (0.42 default). | `ease: 'io' \| 'sine' \| 'out' \| 'linear'` |
| `region(codes, o)` | the highlight | `style:` atlas colours `red blue green orange purple yellow teal pink` (raised, textured, reveal `flash` = white-hot then colour), neon zones `neon neonRed neonBlue` (or `neon` + `color`, reveal `grow`), and `tint solid glow outline zone flat`; `reveal: wipe` (right-to-left in Arabic) `\| pop \| fade \| draw`, `label: true \| 'text'`, `labelAt`, `labelSize`, `labelPill: colour`, `labelUntil`, `fade: [time, keep]`, `spotlight: 0..1`, `pulse` |
| `river(names, o)` | a real river from Natural Earth that draws on from its source and then flows (light pulses downstream). Names are Natural Earth's local names, chained: `['Firat','Al Furat','Euphrates']`, `['Dicle','Tigris']`, `['Shatt al Arab']`, `['Nile']`... | `from` / `to` [lon,lat] to cut a stretch, `color`, `width`, `dur`, `flow:false`, `reverse` |
| `ghost(code, o)` | a country's real shape picked up and laid somewhere else for a size comparison (France on Egypt); east-west is rescaled by latitude so it keeps its true size | `to: [lon,lat]`, `only: [w,s,e,n]` (keep only the mainland, e.g. France without its overseas parts), `style` (atlas colour), `label` |
| `shade(line, o)` | darkens everything except a band along a line ("step outside the river and it's desert") | `width` (km), `k` (darkness 0..1) |
| `swarm(line, o)` | little people popping up one after another along a line (crowds, population) | `count`, `spread` (km), `size`, `color`, `dur` |
| `riverLine(names, tol)` | the joined river as [[lon,lat],...] to cut, reuse for `path`/`shade`/`swarm` | |
| `atlasName(pt, text, o)` | place name written onto the land: Aref Ruqaa calligraphy in Arabic, DM Serif italic in English, wipes in right to left | `rotate` (deg, lay it along the land or river), `size`, `color` |
| `title(text, o)` | slam-in title: lands from 2.8x in 0.32 s, glowing | `x, y` or `pt`, `size`, `color`, `from`, `rotate` |
| `icon(pt or {x,y}, kind, o)` | code-drawn icon: `x` (neon red), `mountain`, `drop`, `city`, `question`, `check`, `star`; pops with overshoot, leaves by shrinking | `badge: 'hex' \| 'circle'` (glowing badge, white icon), `color`, `size`, `label`, `anchor` (grows with the map, so a fast zoom blows it past the lens) |
| `measure(a, b, o)` | double arrow that grows from the middle while its label counts up, laid along the line | `to`, `from`, `unit` ('كم'), `text`, `color` |
| `path(pts, o)` | a route that draws on (Catmull-Rom smoothed) | `color` (`sand`, `yellow`, `fire`...), `width`, `dash: [on, off]`, `flow` (dash speed, sign = direction), `arrow`, `dur` |
| `ships(pts, o)` | tankers moving along a route with wakes | `count`, `speed` (route lengths per second), `size`, `color`, `phase` |
| `ruler(a, b, o)` | measured line with ticks + end dots | `text` (pill label), `color`, `textOffset` |
| `pin(pt, o)` / `ping(pt, o)` | drop pin / radar ping | `label`, `color` |
| `label(pt or {x,y}, text, o)` | a word on the map or the screen | `pill: colour`, `color`, `size`, `dy` |
| `number({x,y} or pt, text, o)` | big pop number | `size`, `color`, `sub` (line under it), `count: {from, to, dur}` with `#` in text |
| `flash(t, k)` | exposure pop on a beat (not a white frame) | |
| `dim(t0, v, t1)` | darken the globe under the graphics | |
| `captions({max, y, size, style})` | the script on screen. Default: big Lalezar, `max` 4 words, spoken word in yellow. `style:'clean'`: small white IBM Plex, 3 words, soft shadow (the viral map-Shorts way) | |
| `cut(t)` | marks a shot start for `cut:N` in cues.json and the contact sheets | |
| `end(t)` | film length (default: voice + 0.6 s) | |

Every element takes `at`, `until`, `z` (draw order). Colours: `blue orange red green yellow purple teal pink white
sand fire` or any CSS colour.

Defaults are calm (the user found v2 "too much light, flashy"): atlas regions fade up over 0.9 s while the border draws on (`reveal:'flash'` gives the white-hot version), titles settle from 1.25x without glow (`glow:true`, `from:2.8` for a slam), rivers and icons have little glow.

Config `look`: `'atlas'` (default; bright satellite, teal sea that keeps the sea-floor relief) or `'night'` (dark sea, dimmed, globe in space).
