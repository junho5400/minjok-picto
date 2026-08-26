import { WHITE, clamp, readAnchor, resizeCanvas, type Vec } from "./play";
import { ARM_REST_DEG, applyYeonPose, YEON_FRAMES, type YeonRig } from "./yeon-frames";
import { drawKite, idleKiteTarget, kiteSpeed, steerKite, stringAngleDeg, type KiteState } from "./yeon";

const FRAMES_PER_TURN = 8;

export function startYeon(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>(".pictogram")!;
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  const anchorMark = root.querySelector<SVGCircleElement>("#reel-anchor")!;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rig: YeonRig = {
    body: root.querySelector<SVGGElement>("#yeon-body")!,
    head: root.querySelector<SVGGElement>("#yeon-head")!,
    rightArm: root.querySelector<SVGGElement>("#yeon-right-arm")!,
    legs: root.querySelector<SVGGElement>("#yeon-legs")!,
    foot: root.querySelector<SVGGElement>("#yeon-foot")!,
  };

  if (!ctx) {
    applyYeonPose(rig, YEON_FRAMES[2], 0);
    return { setVisible() {}, measure() {} };
  }

  const pointer: Vec = { x: 0, y: 0 };
  let size = { w: 0, h: 0, scale: 1 };
  let reel: Vec = { x: 0, y: 0 };
  let framePhase = 0;
  let frameIndex = 0;
  let hasPointer = false;
  let visible = true;
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

  function frame(now: number) {
    requestAnimationFrame(frame);
    if (!visible) return;

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    reel = readAnchor(stage, anchorMark);
    kite.reel = reel;

    const target = hasPointer ? pointer : idleKiteTarget(reel, size, now);
    steerKite(kite, target, maxLen(), dt);

    const speed = kiteSpeed(kite);
    framePhase += (0.7 + speed / 140) * FRAMES_PER_TURN * dt;
    const next = Math.floor(framePhase) % YEON_FRAMES.length;
    if (next !== frameIndex) frameIndex = next;
    applyYeonPose(
      rig,
      YEON_FRAMES[frameIndex],
      clamp(stringAngleDeg(kite) - ARM_REST_DEG, -28, 28),
    );

    ctx.clearRect(0, 0, size.w, size.h);
    drawKite(ctx, kite, WHITE, size.scale);
  }

  function movePointer(x: number, y: number) {
    if (!visible) return;
    const rect = stage.getBoundingClientRect();
    pointer.x = x - rect.left;
    pointer.y = y - rect.top;
    hasPointer = true;
  }

  window.addEventListener("pointermove", (e) => movePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => movePointer(e.clientX, e.clientY), { passive: true });

  if (reduceMotion) {
    applyYeonPose(rig, YEON_FRAMES[2], 0);
    measure();
    const target = idleKiteTarget(reel, size, 0);
    kite.pos.x = target.x;
    kite.pos.y = target.y;
    applyYeonPose(rig, YEON_FRAMES[2], stringAngleDeg(kite) - ARM_REST_DEG);
    ctx.clearRect(0, 0, size.w, size.h);
    drawKite(ctx, kite, WHITE, size.scale);
    window.addEventListener("resize", () => {
      measure();
      ctx.clearRect(0, 0, size.w, size.h);
      drawKite(ctx, kite, WHITE, size.scale);
    });
    return {
      setVisible(next: boolean) {
        visible = next;
      },
      measure,
    };
  }

  applyYeonPose(rig, YEON_FRAMES[0], 0);
  measure();
  requestAnimationFrame(frame);

  return {
    setVisible(next: boolean) {
      visible = next;
    },
    measure,
  };
}
