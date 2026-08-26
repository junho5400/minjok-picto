# Sangmo ribbon

Interactive pages built around pictograms generated with [QuiverAI](https://quiver.ai).

Each mark is a two-color Korean folk monoline. The figure is animated as eight
drawn SVG cels. The live prop — ribbon, kite, or jegi — is drawn on a canvas.

- **상모돌리기** — the sangmo ribbon is a rope pinned at the hat, tipped at your cursor.
- **연날리기** — the bangpae-yeon follows the pointer on a taut string from the reel.
- **제기차기** — click or sweep to kick; the jegi flies from the foot at the peak frame.

Respects `prefers-reduced-motion` and falls back to a still drawing when a canvas
context is unavailable.

## Marks

- `public/sangmo-pictogram.svg` — sangmo-spinning dancer, Korean folk monoline (Arrow 2.0).
- `public/yeonnalligi-pictogram.svg` — kite flying (연날리기), Korean folk monoline (Arrow 2.0).
- `public/jegichagi-pictogram.svg` — jegichagi (제기차기), Korean folk monoline (Arrow 2.0).
- `public/swimming-pictogram.svg` — Olympic-style swimming pictogram (Arrow 1.1).

## Run locally

```bash
npm install
npm run dev
```

Opens at [http://127.0.0.1:43123](http://127.0.0.1:43123).
