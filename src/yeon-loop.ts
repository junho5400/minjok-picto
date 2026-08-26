import { WHITE, clamp, readAnchor, resizeCanvas, type Vec } from "./play";
import { ARM_REST_DEG, applyYeonPose, YEON_FRAMES, type YeonRig } from "./yeon-frames";
import { drawKite, idleKiteTarget, kiteSpeed, steerKite, stringAngleDeg, type KiteState } from "./yeon";

const FRAMES_PER_TURN = 8;

export function startYeon(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>(".pictogram")!;
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  const anchorMark = root.querySelector<SVGCircleElement>("#reel-anchor")!;
  const ctx = canvas.getContext("2d", { alpha: true });
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
    return { setVisible() {}, measure() {}, stop() {} };
  }

  const pointer: Vec = { x: 0, y: 0 };
  let size = { w: 0, h: 0, scale: 1 };
  let reel: Vec = { x: 0, y: 0 };
  let framePhase = 0;
  let frameIndex = 0;
  let hasPointer = false;
  let placed = false;
  let visible = false;
  let last = performance.now();
  let raf = 0;

  const kite: KiteState = {
    reel,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    phase: 0,
  };

  function snapToIdle(now = performance.now()) {
    const idle = idleKiteTarget(reel, size, now);
    pointer.x = idle.x;
    pointer.y = idle.y;
    kite.pos.x = idle.x;
    kite.pos.y = idle.y;
    kite.vel.x = 0;
    kite.vel.y = 0;
  }

  function measure() {
    size = resizeCanvas(canvas, ctx, stage);
    const next = readAnchor(stage, anchorMark);
    const jump = Math.hypot(next.x - reel.x, next.y - reel.y);
    reel = next;
    kite.reel = reel;
    if (size.w < 2 || size.h < 2) return;
    if (!placed || jump > 48) {
      snapToIdle();
      placed = true;
    } else if (!hasPointer) {
      const idle = idleKiteTarget(reel, size, performance.now());
      pointer.x = idle.x;
      pointer.y = idle.y;
    }
  }

  function maxLen() {
    return Math.min(size.w, size.h) * 0.72;
  }

  function paintKite() {
    ctx.clearRect(0, 0, size.w, size.h);
    if (!visible || size.w < 2 || size.h < 2) return;
    drawKite(ctx, kite, WHITE, size.scale);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    measure();

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible) {
      ctx.clearRect(0, 0, size.w, size.h);
      return;
    }

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

    paintKite();
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

  const ro = new ResizeObserver(() => measure());
  ro.observe(stage);

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    ro.disconnect();
  };

  if (import.meta.hot) {
    import.meta.hot.dispose(stop);
  }

  applyYeonPose(rig, YEON_FRAMES[reduceMotion ? 2 : 0], 0);
  measure();

  if (reduceMotion) {
    snapToIdle(0);
    applyYeonPose(rig, YEON_FRAMES[2], stringAngleDeg(kite) - ARM_REST_DEG);
    paintKite();
    window.addEventListener("resize", () => {
      measure();
      paintKite();
    });
    return {
      setVisible(next: boolean) {
        visible = next;
        if (next) {
          measure();
          paintKite();
        }
      },
      measure,
      stop,
    };
  }

  raf = requestAnimationFrame(frame);

  return {
    setVisible(next: boolean) {
      visible = next;
      if (next) {
        last = performance.now();
        measure();
      }
    },
    measure,
    stop,
  };
}
