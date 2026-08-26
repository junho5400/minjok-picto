import { WHITE, clamp, readAnchor, resizeCanvas, type Vec } from "./play";
import { ARM_REST_DEG, applyYeonPose, YEON_FRAMES, type YeonRig } from "./yeon-frames";
import { drawKite, idleKiteTarget, kiteSpeed, steerKite, stringAngleDeg, type KiteState } from "./yeon";

const stage = document.querySelector<HTMLElement>(".stage")!;
const canvas = document.querySelector<HTMLCanvasElement>("#play-layer")!;
const anchorMark = document.querySelector<SVGCircleElement>("#reel-anchor")!;
const hint = document.querySelector<HTMLElement>(".hint")!;
const cursor = document.querySelector<HTMLElement>(".cursor-ring")!;

const rig: YeonRig = {
  body: document.querySelector<SVGGElement>("#body")!,
  head: document.querySelector<SVGGElement>("#head")!,
  rightArm: document.querySelector<SVGGElement>("#right-arm")!,
  legs: document.querySelector<SVGGElement>("#legs")!,
  foot: document.querySelector<SVGGElement>("#foot")!,
};

const FRAMES_PER_TURN = 8;
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!ctx) {
  document.body.classList.add("is-static");
  hint.textContent = "This browser cannot draw the kite, so the flyer is shown still.";
  applyYeonPose(rig, YEON_FRAMES[2], 0);
} else {
  run(ctx);
}

function run(ctx: CanvasRenderingContext2D) {
  const pointer: Vec = { x: 0, y: 0 };
  let size = { w: 0, h: 0, scale: 1 };
  let reel: Vec = { x: 0, y: 0 };
  let framePhase = 0;
  let frameIndex = -1;
  let hasPointer = false;
  let last = performance.now();

  const kite: KiteState = {
    reel,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    phase: 0,
  };

  function measure() {
    size = resizeCanvas(canvas, ctx, stage);
    reel = readAnchor(stage, anchorMark);
    kite.reel = reel;
    if (!hasPointer) {
      const idle = idleKiteTarget(reel, size, performance.now());
      pointer.x = idle.x;
      pointer.y = idle.y;
    }
    if (kite.pos.x === 0 && kite.pos.y === 0) {
      kite.pos.x = pointer.x;
      kite.pos.y = pointer.y;
    }
  }

  function maxLen() {
    return Math.min(size.w, size.h) * 0.72;
  }

  function paintStill() {
    measure();
    kite.reel = reel;
    const target = idleKiteTarget(reel, size, 0);
    kite.pos.x = target.x;
    kite.pos.y = target.y;
    kite.vel.x = 0;
    kite.vel.y = 0;
    applyYeonPose(rig, YEON_FRAMES[2], stringAngleDeg(kite) - ARM_REST_DEG);
    ctx.clearRect(0, 0, size.w, size.h);
    drawKite(ctx, kite, WHITE, size.scale);
  }

  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    reel = readAnchor(stage, anchorMark);
    kite.reel = reel;

    const target = hasPointer ? pointer : idleKiteTarget(reel, size, now);
    steerKite(kite, target, maxLen(), dt);

    const speed = kiteSpeed(kite);
    framePhase += (0.7 + speed / 140) * FRAMES_PER_TURN * dt;
    const next = Math.floor(framePhase) % YEON_FRAMES.length;
    if (next !== frameIndex) {
      frameIndex = next;
    }
    applyYeonPose(
      rig,
      YEON_FRAMES[frameIndex],
      clamp(stringAngleDeg(kite) - ARM_REST_DEG, -28, 28),
    );

    ctx.clearRect(0, 0, size.w, size.h);
    drawKite(ctx, kite, WHITE, size.scale);
    requestAnimationFrame(frame);
  }

  function movePointer(x: number, y: number) {
    const rect = stage.getBoundingClientRect();
    pointer.x = x - rect.left;
    pointer.y = y - rect.top;
    if (!hasPointer) {
      hasPointer = true;
      document.body.classList.add("is-engaged");
    }
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", (e) => movePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => movePointer(e.clientX, e.clientY), { passive: true });

  if (reduceMotion) {
    document.body.classList.add("is-static");
    hint.textContent = "Motion is reduced in your system settings, so the kite is held still.";
    paintStill();
    window.addEventListener("resize", paintStill);
  } else {
    requestAnimationFrame(frame);
  }
}
