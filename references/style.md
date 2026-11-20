# Maven Map style

## Story (30-60 s Short; the demo is 12 s)
1. **Hook (0-3 s)** - the globe in space and one bold claim: "هذا أخطر ممر بحري بالعالم". The camera dives in on the claim.
2. **Where (3-6 s)** - name the place and its neighbours; each lights up on its word.
3. **The number (6-12 s)** - push in close, one measurement on screen (ruler, count-up). One number at a time.
4. **The mechanism (12-45 s)** - routes, ships, comparisons A vs B, what happens if it closes.
5. **Payoff (last 5 s)** - the twist or the open question; pull back to show the whole picture.

Niches that work: straits and chokepoints, weird borders and exclaves, rivers and water fights, "why nobody lives
here", empires and old routes, disasters and climate. For Iraqi / Arab viewers: Tigris and Euphrates, the Gulf,
Shatt al-Arab, Bab el-Mandeb, Suez, old trade routes through Baghdad and Basra.

## Pacing
- Something changes every 1-2 s: a highlight, a number, a camera move. A camera move alone can carry a beat.
- One continuous camera where possible (the globe never cuts); `flash` only on the big push-ins.
- Text on screen: the captions, place names and the one number of the moment. Nothing else.

## Look
- The satellite picture is the stage, slightly dimmed (`dim` in config, default 0.9); the sea is evened out to one
  deep blue by the land mask, shallows stay turquoise.
- Highlights recolour the land (`tint` blue, `solid` orange) with white borders; fade them back when the camera pushes in.
- Lalezar for captions, names and numbers; yellow for numbers and the spoken word; pills (dark navy) for things with
  no border (a strait, a sea).
- Keep the subject between 25 % and 65 % of the height; captions sit at 79 %.

## Sound
Real recordings, subtle: a long air whoosh on the dive, a soft pop or swoosh per highlight, one whoosh on a push-in,
a low hit under the big number, a quiet sea or wind bed under traffic scenes. Never two accents closer than about
0.5 s, nothing used more than twice, voice always on top (mix.py prints the margin; aim for a worst case of 15 dB+).
No music unless asked.
