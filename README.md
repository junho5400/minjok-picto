# Sangmo ribbon

An interactive page built around a pictogram generated with [QuiverAI](https://quiver.ai).

A pungmul dancer is drawn in flat ink monoline. The only colored element is the
_sangmo_ ribbon on the hat, which is simulated as a rope: pinned at the hat,
tipped at your cursor, so all the slack coils into a spin. Leave the pointer
alone and the ribbon keeps orbiting on its own.

Respects `prefers-reduced-motion` (holds a still ribbon) and falls back to the
plain drawing when a canvas context is unavailable.

## Marks

- `public/sangmo-pictogram.svg` — sangmo-spinning dancer, Korean folk monoline (Arrow 2.0).
- `public/swimming-pictogram.svg` — Olympic-style swimming pictogram (Arrow 1.1).

## Run locally

```bash
npm install
npm run dev
```

Opens at [http://127.0.0.1:43123](http://127.0.0.1:43123).
