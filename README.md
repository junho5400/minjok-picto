# Minjok Picto

An interactive media-art handbook of Korean folk play. Three games — sangmo
spinning, kite flying, and jegichagi — are drawn as living monoline pictograms
and staged like an installation in a modern Korean museum.

Scroll to move between rooms: the figures morph stroke-by-stroke into one
another, backgrounds wipe through taegeuk red, blue, and white, and the taegeuk
mark rolls along the pager, always coming to rest flag-aligned.

## Scenes

- **Sangmo (상모돌리기)** — the sangmo ribbon is a rope pinned at the dancer's
  hat, tipped at your cursor.
- **Yeon (연날리기)** — the bangpae-yeon kite follows the pointer on a taut
  string from the reel.
- **Jegi (제기차기)** — the jegi drops onto the kicker's foot and launches
  toward your cursor; each clean kick adds one stroke of 正 to the tally, and a
  dropped jegi ends the run.

Each scene is annotated in the site's shared stroke language: noemun (雷紋)
marks beside the titles, translucent hanja stamps (舞 · 鳶 · 蹴) behind the
ending typography, and an ink-square cursor that splits its color along the
background boundary mid-scroll.

Respects `prefers-reduced-motion` (still drawings, no morphing) and keeps the
native cursor on touch devices. On touch screens, horizontal drags drive the
interactions and vertical swipes scroll.

## Assets

- `public/sangmo-pictogram.svg`, `public/yeonnalligi-pictogram.svg`,
  `public/jegichagi-pictogram.svg` — the base pictograms (Korean folk monoline,
  QuiverAI Arrow 2.0).
- `public/noemun-sangmo.svg`, `public/noemun-yeon.svg`, `public/noemun-jegi.svg`
  — the per-scene noemun marks, importable into Figma as-is.

## Run locally

```bash
npm install
npm run dev
```

Opens at [http://127.0.0.1:43123](http://127.0.0.1:43123).
