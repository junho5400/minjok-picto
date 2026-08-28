import { clamp, lerp, type Vec } from "./play";

export type JegiState = {
  pos: Vec;
  vel: Vec;
  spin: number;
  phase: number;
};

function integrate(s: JegiState, dt: number, size: { w: number; h: number }) {
  s.pos.x += s.vel.x * dt;
  s.pos.y += s.vel.y * dt;
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

/** The weighted coin rights itself under the tassels instead of tumbling. */
function settleUpright(s: JegiState, dt: number, rate: number) {
  const lean = clamp(s.vel.x * 0.0012, -0.35, 0.35);
  s.spin += (lean - s.spin) * Math.min(1, rate * dt);
}

/** Stay in the air while idle. */
export function hoverJegi(s: JegiState, size: { w: number; h: number }, dt: number) {
  s.vel.x *= Math.pow(0.06, dt);
  s.vel.y *= Math.pow(0.06, dt);
  settleUpright(s, dt, 6);
  integrate(s, dt, size);
}

/** Ballistic flight: gravity and drag only — the pointer has no pull here. */
export function stepJegi(s: JegiState, size: { w: number; h: number }, dt: number) {
  s.vel.y += 980 * dt;
  s.vel.x *= Math.pow(0.55, dt);
  s.vel.y *= Math.pow(0.92, dt);
  settleUpright(s, dt, s.vel.y > 0 ? 9 : 4);
  integrate(s, dt, size);
}

const KICK_VY_MIN = 560;
const KICK_VY_MAX = 900;

/** 0 = softest tap, 1 = full-strength kick, from how far above the foot `aim` sits. */
export function kickPower(from: Vec, aim: Vec) {
  return clamp(((from.y - aim.y) * 2.2 - KICK_VY_MIN) / (KICK_VY_MAX - KICK_VY_MIN), 0, 1);
}

/** Launch off the foot toward wherever `aim` sits at this instant. */
export function kickJegi(s: JegiState, from: Vec, aim: Vec) {
  s.vel.x = clamp((aim.x - from.x) * 2.0, -380, 380);
  s.vel.y = -lerp(KICK_VY_MIN, KICK_VY_MAX, kickPower(from, aim));
  s.spin = clamp(s.vel.x * 0.002, -0.4, 0.4);
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

  // Tassels trail opposite the motion; the upward bias keeps them above the
  // coin once the jegi slows or falls.
  const trail = Math.atan2(-s.vel.y - 140, -s.vel.x);
  for (let i = -2; i <= 2; i++) {
    const ang = trail + i * 0.28;
    const len = fan + Math.sin(s.phase + i) * 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(i * 1.4 * scale, -w * 0.2);
    ctx.lineTo(Math.cos(ang) * len + i * 2 * scale, Math.sin(ang) * len - w * 0.2);
    ctx.stroke();
  }

  ctx.restore();
}
