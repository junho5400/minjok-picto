import type { Vec } from "./play";

export type JegiState = {
  pos: Vec;
  vel: Vec;
  spin: number;
  phase: number;
};

function integrate(s: JegiState, dt: number, size: { w: number; h: number }) {
  s.pos.x += s.vel.x * dt;
  s.pos.y += s.vel.y * dt;
  s.spin += s.vel.x * 0.04 * dt + s.vel.y * 0.01 * dt;
  s.phase += dt * (6 + Math.hypot(s.vel.x, s.vel.y) * 0.008);

  const pad = 18;
  if (s.pos.x < pad) {
    s.pos.x = pad;
    s.vel.x = Math.abs(s.vel.x) * 0.6;
  } else if (s.pos.x > size.w - pad) {
    s.pos.x = size.w - pad;
    s.vel.x = -Math.abs(s.vel.x) * 0.6;
  }
}

/** Stay in the air while idle. */
export function hoverJegi(s: JegiState, size: { w: number; h: number }, dt: number) {
  s.vel.x *= Math.pow(0.06, dt);
  s.vel.y *= Math.pow(0.06, dt);
  integrate(s, dt, size);
}

/** Gravity. */
export function stepJegi(s: JegiState, size: { w: number; h: number }, dt: number) {
  s.vel.y += 980 * dt;
  s.vel.x *= Math.pow(0.55, dt);
  s.vel.y *= Math.pow(0.92, dt);
  integrate(s, dt, size);
}

export function kickJegi(s: JegiState, from: Vec, aimX: number, power: number) {
  const dirX = Math.max(-1, Math.min(1, (aimX - from.x) / 220));
  s.vel.x = dirX * (180 + power * 0.9);
  s.vel.y = -(520 + power * 1.6);
  s.spin += dirX * 4;
}

export function jegiFallen(s: JegiState, size: { h: number }) {
  return s.pos.y > size.h + 36;
}

export function drawJegi(ctx: CanvasRenderingContext2D, s: JegiState, color: string, scale: number) {
  const w = 7.2 * scale;
  const fan = 16 * scale;
  ctx.save();
  ctx.translate(s.pos.x, s.pos.y);
  ctx.rotate(s.spin);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.7 * scale;

  ctx.beginPath();
  ctx.ellipse(0, 0, w, w * 0.48, 0, 0, Math.PI * 2);
  ctx.stroke();

  const trail = Math.atan2(s.vel.y, s.vel.x) + Math.PI;
  for (let i = -2; i <= 2; i++) {
    const spread = i * 0.28;
    const wave = Math.sin(s.phase + i) * 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(i * 1.4 * scale, -w * 0.2);
    ctx.lineTo(Math.cos(trail + spread) * (fan + wave) + i * 2 * scale, -fan + Math.sin(trail + spread) * 4 * scale);
    ctx.stroke();
  }

  ctx.restore();
}
