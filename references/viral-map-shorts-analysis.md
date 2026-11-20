# GeoGlobeTales map Shorts: frame-by-frame breakdown

Channel: GeoGlobeTales, 2.09M subscribers. Three references (downloaded 2026-11-15; frames, 10 fps strips and
contact sheets are in this folder):

| id | title | length | views | posted |
|---|---|---|---|---|
| mtXDt-TJht4 | 27 Years to Walk Around the World | 1:43 | 61.2M | 2025-09-06 |
| ulmKClgP85g | The Darien Gap, The Most Dangerous Places on Earth | 1:00 | 48.3M | 2024-10-05 |
| X4xOSvcREyI | Is the UK a Country? | 1:23 | 445K (3 days old) | 2026-11-12 |

## 1. The scripts

**Measured.** All three read at **3.0–3.1 words per second**, with almost no pauses (UK: 0 pauses over 0.3 s in 83 s).
That is about 25 % faster than our Arabic demo (2.06 w/s). Sentences are short, joined by "and", "but" and "so".

**One shape, three times:**
1. **Hook (0–5 s): a "did you know" paradox.** It opens on two facts that don't fit together.
   - UK: one king, one passport, one army, *but* four countries.
   - Darien: it's *impossible* to drive between the Americas.
   - Bushby: one man, 27 years, on foot.
2. **The question out loud (10–16 s).** "So is it one country or four?" or "But what's the reason behind it?". This opens a loop the
   viewer stays for.
3. **Story in steps.** It's chronological (UK, Bushby) or cause by cause (Darien). Every clause is one map action:
   "England conquered it" means the region turns red, "surrounded it with castles" means castle icons pop in a ring.
4. **A number every few seconds**, said as words and shown big: 13th century, 1603, 1801, 160 km, 50 days, 18 days,
   80 km, minus 50, 47,000 km. Bushby has 12 numbers in 100 s.
5. **Humour by personifying the map.** "Well, sort of." "Wait, that was an option? Wales thought." Countries get eyes,
   eyebrows, thought bubbles and swords.
6. **Payoff line** that answers the hook in one sentence: "Four countries, but only one sovereign state."

Topics that won (61M, 48M) are **extreme places and extreme journeys**. Politics explainers do well, but less.

## 2. The picture (what happens, frame by frame)

**Basemap.** A bright, natural satellite map. The ocean is *teal* with the sea-floor relief visible, not dark.
There's no space or globe-in-space shot: the camera starts close on the subject at 0 s. Wide shots use a flat world map, and once
(Bushby, 8–10 s) the map becomes a **tilted 3D card** over a blue grid.

**Camera.**
- Never still: a slow push of about 2–5 % a second, plus slow pans.
- **Fast zooms (about 0.5 s) on reveals.** Darien 5.6–6.2 s goes from continent to region. The overlay X is anchored to the map, so the zoom blows it apart
  past the lens.
- Almost no hard cuts. The UK video has zero; Darien cuts only to stock footage, entered with a **zoom-through**
  (21.4–21.7 s: the camera dives into the map, then cuts to aerial footage).

**Region reveal: flash, then colour** (UK 5.2–6.3 s, 10 fps strip):
- 5.2: the regions go *white-hot* (a pale fill), staggered by about 0.1 s each (N. Ireland, Scotland, Wales, England).
- 5.6–6.2: each one cools into its saturated colour (red, blue, green, orange).
- The fill is semi-opaque, so the terrain texture shows through, and it sits *raised* with a soft dark edge shadow.

**Neon zones.** For danger: a bright green fill with a glowing outline (Darien), or a red neon glow with a skull.
Each grows from its centre in about 0.3 s.

**Icons.**
- **Style:** 3D emoji-like (crown, flags with crowns and googly eyes, castles, skulls, jail cage, passport, bandits),
  or flat icons in **glowing hexagon badges** (crown, passport, army).
- **Motion:** they pop in with overshoot. They leave by **shrinking into the country** (UK 4.6–5.0 s), never by fading.

**Text on the map.**
- **Serif place names laid along the land**, rotated to its shape ("United Kingdom", "Ireland").
- **Big serif years** ("1603", "1801", "XIII").
- **Slam-in neon titles** that start huge and land in about 0.3 s ("Darién Gap").
- **Tilted tags** ("27 years walking" on a red box).

**Measurements.** A double-headed arrow grows along the feature while the label **counts up**
(83 → 102 → 120 → ... → 160 km, 20.0–20.6 s), rotated to the arrow.

**Routes.**
- **Lines:** thick yellow, drawn with the head leading. Dashed yellow for roads. A dashed white arrow for "return home".
- **Red neon X:** shows a route is blocked.

**People.** A real photo in a hexagon or circle frame rides along the route as a token, with a speech bubble.

**Captions.** Tiny white sans-serif text, 1–3 words, lower middle (about 70 % of the height), soft shadow, no box.
The map is the star; the captions only support it.

**Pace.** A new visual event about every **1.0–1.5 s**: a highlight, an icon, a number or a camera move.

## 3. What Maven Map v2 takes from this
- A bright **"atlas" look**: a teal ocean that keeps the sea-floor relief, no dimming. The night/space look stays as an option.
- The **flash-then-colour** region reveal with a stagger, a raised shadow and an inner edge. Neon zones.
- **Real rivers** (Natural Earth river data) that draw on and *flow*.
- Arabic calligraphic **atlas names** laid on the land, and **slam-in titles**.
- **Icons in glowing hex badges**, popping in and shrinking out. An **X** mark.
- A **double arrow with a count-up**, rotated to the line.
- **Small clean captions** (1–3 words) as an option, next to our big Lalezar ones.
- Faster narration (about 2.5–2.8 words/s in Arabic) and the **hook → question → steps → payoff** script shape.
