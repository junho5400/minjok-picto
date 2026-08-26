export type Vec = { x: number; y: number };

export type SangmoState = {
  anchor: Vec;
  /** Rotation of the ribbon around the spin cone, in radians. */
  phase: number;
  /** Horizontal half-width of the spin circle, in pixels. */
  radius: number;
  /** How flat the circle reads, 0 = edge on, 1 = seen from above. */
  tilt: number;
  /** Height of the spin plane above the hat, in pixels. */
  lift: number;
  /** Sideways offset of the spin plane, in pixels. */
  lean: number;
};

const SAMPLES = 108;
/** How far the ribbon trails behind its own tip, in turns. */
const WRAP = 0.86;
/** Fraction of the ribbon spent rising from the hat into the circle. */
const STALK = 0.24;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

export function sangmoSpine(s: SangmoState): Vec[] {
  const cx = s.anchor.x + s.lean;
  const cy = s.anchor.y - s.lift;
  const points: Vec[] = [];

  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES;
    const grow = ease(Math.min(u / STALK, 1));
    const theta = s.phase - u * WRAP * Math.PI * 2;
    const wobble = 1 + 0.05 * Math.sin(theta * 2);
    const ex = cx + Math.cos(theta) * s.radius * wobble;
    const ey = cy + Math.sin(theta) * s.radius * s.tilt * wobble;
    points.push({
      x: lerp(s.anchor.x, ex, grow),
      y: lerp(s.anchor.y, ey, grow),
    });
  }

  return points;
}

export function drawSangmo(
  ctx: CanvasRenderingContext2D,
  s: SangmoState,
  color: string,
  scale: number,
) {
  const spine = sangmoSpine(s);
  const head = 3 * scale;
  const tail = 1.1 * scale;
  const left: Vec[] = [];
  const right: Vec[] = [];

  for (let i = 0; i < spine.length; i++) {
    const prev = spine[Math.max(0, i - 1)];
    const next = spine[Math.min(spine.length - 1, i + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    let len = Math.hypot(tx, ty);
    if (len < 0.0001) {
      tx = 1;
      ty = 0;
      len = 1;
    }
    const u = i / (spine.length - 1);
    const half = lerp(head, tail, Math.pow(u, 0.7)) / 2;
    const nx = (-ty / len) * half;
    const ny = (tx / len) * half;
    left.push({ x: spine[i].x + nx, y: spine[i].y + ny });
    right.push({ x: spine[i].x - nx, y: spine[i].y - ny });
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();

  const tip = spine[spine.length - 1];
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, tail * 1.4, 0, Math.PI * 2);
  ctx.fill();
}
