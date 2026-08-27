import { type Vec } from "./play";

export type KiteState = {
  reel: Vec;
  pos: Vec;
  vel: Vec;
  phase: number;
};

const TAIL = 18;

export function steerKite(s: KiteState, target: Vec, maxLen: number, dt: number) {
  const dx = target.x - s.reel.x;
  const dy = target.y - s.reel.y;
  const reach = Math.hypot(dx, dy) || 1;
  const len = Math.max(maxLen * 0.22, Math.min(reach, maxLen));
  const wantX = s.reel.x + (dx / reach) * len;
  const wantY = s.reel.y + (dy / reach) * len;

  s.vel.x += (wantX - s.pos.x) * 18 * dt;
  s.vel.y += (wantY - s.pos.y) * 18 * dt;
  s.vel.x *= Math.pow(0.08, dt);
  s.vel.y *= Math.pow(0.08, dt);
  s.pos.x += s.vel.x * dt;
  s.pos.y += s.vel.y * dt;

  const kx = s.pos.x - s.reel.x;
  const ky = s.pos.y - s.reel.y;
  const dist = Math.hypot(kx, ky) || 1;
  if (dist > maxLen) {
    s.pos.x = s.reel.x + (kx / dist) * maxLen;
    s.pos.y = s.reel.y + (ky / dist) * maxLen;
  }

  s.phase += dt * (2.4 + Math.hypot(s.vel.x, s.vel.y) * 0.01);
}

function stroke(ctx: CanvasRenderingContext2D, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

export function drawKite(
  ctx: CanvasRenderingContext2D,
  s: KiteState,
  color: string,
  scale: number,
  accent = color,
  from?: Vec,
) {
  const { reel, pos } = s;
  const dx = pos.x - reel.x;
  const dy = pos.y - reel.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  const sag = Math.min(dist * 0.08, 28 * scale);

  // The line is pinched at the hand, and the pinch gives a little toward the
  // kite's pull, so the fixed point drifts as the kite flies.
  const pin = {
    x: reel.x + (dx / dist) * 4 * scale,
    y: reel.y + (dy / dist) * 4 * scale,
  };

  stroke(ctx, accent, 1.8 * scale);
  ctx.beginPath();
  if (from) {
    // Slack run from the reel up to the pinch, sagging under gravity.
    const rx = pin.x - from.x;
    const ry = pin.y - from.y;
    const slack = Math.min(Math.hypot(rx, ry) * 0.07, 9 * scale);
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(from.x + rx * 0.5, from.y + ry * 0.5 + slack, pin.x, pin.y);
  } else {
    ctx.moveTo(pin.x, pin.y);
  }
  ctx.quadraticCurveTo(
    pin.x + (pos.x - pin.x) * 0.5 + (dy / dist) * sag,
    pin.y + (pos.y - pin.y) * 0.5 - (dx / dist) * sag * 0.35,
    pos.x,
    pos.y,
  );
  ctx.stroke();

  const w = 22 * scale;
  const h = 24 * scale;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(ang + Math.PI * 0.5);

  stroke(ctx, color, 1.9 * scale);
  ctx.strokeRect(-w, -h, w * 2, h * 2);
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-w, -h);
  ctx.lineTo(w, h);
  ctx.moveTo(w, -h);
  ctx.lineTo(-w, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-w * 0.18, h);
  ctx.lineTo(-w * 0.18, h + 8 * scale);
  ctx.stroke();

  stroke(ctx, color, 1.4 * scale);
  for (let i = 0; i < 3; i++) {
    const t0 = s.phase * 2.1 + i * 0.9;
    ctx.beginPath();
    ctx.moveTo((-0.4 + i * 0.4) * w, h);
    for (let k = 1; k <= TAIL; k++) {
      const u = k / TAIL;
      const wave = Math.sin(t0 + u * 4.2) * (6 + i) * scale * (0.35 + u);
      ctx.lineTo(
        (-0.4 + i * 0.4) * w + wave,
        h + u * (36 + i * 10) * scale,
      );
    }
    ctx.stroke();
  }

  ctx.restore();
}

export function idleKiteTarget(reel: Vec, size: { w: number; h: number }, now: number): Vec {
  const t = now / 1000;
  return {
    x: reel.x + size.w * 0.28 + Math.sin(t * 0.7) * size.w * 0.08,
    y: reel.y - size.h * 0.28 + Math.cos(t * 0.55) * size.h * 0.06,
  };
}
