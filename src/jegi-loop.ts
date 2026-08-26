import { readAnchor, resizeCanvas, type Vec } from "./play";
import { applyJegiPose, JEGI_FRAMES, type JegiRig } from "./jegi-frames";
import {
  drawJegi,
  hoverJegi,
  jegiFallen,
  kickJegi,
  stepJegi,
  type JegiState,
} from "./jegi";

const INK = "#212121";
const KICK_SPEED = 12;
const CONTACT_R = 26;

export function startJegi(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>(".pictogram")!;
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  const kickMark = root.querySelector<SVGCircleElement>("#kick-anchor")!;
  const ctx = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rig: JegiRig = {
    body: root.querySelector<SVGGElement>("#jegi-body")!,
    head: root.querySelector<SVGGElement>("#jegi-head")!,
    leftArm: root.querySelector<SVGGElement>("#jegi-left-arm")!,
    rightArm: root.querySelector<SVGGElement>("#jegi-right-arm")!,
    stand: root.querySelector<SVGGElement>("#jegi-stand")!,
    kick: root.querySelector<SVGGElement>("#jegi-kick")!,
    hem: root.querySelector<SVGPathElement>("#jegi-hem")!,
  };

  if (!ctx) {
    applyJegiPose(rig, JEGI_FRAMES[4]);
    return { setVisible() {}, measure() {}, stop() {} };
  }

  const pointer: Vec = { x: 0, y: 0 };
  let size = { w: 0, h: 0, scale: 1 };
  let foot: Vec = { x: 0, y: 0 };
  let peak: Vec = { x: 0, y: 0 };
  let playOrigin: Vec = { x: 0, y: 0 };
  let kicking = false;
  let kickPhase = 0;
  let frameIndex = 0;
  let hasPointer = false;
  let engaged = false;
  let placed = false;
  let visible = false;
  let last = performance.now();
  let raf = 0;

  const jegi: JegiState = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    spin: 0,
    phase: 0,
  };

  function resetJegi() {
    jegi.pos.x = foot.x + 12 * size.scale;
    jegi.pos.y = foot.y - 90 * size.scale;
    jegi.vel.x = 0;
    jegi.vel.y = 0;
  }

  function cachePeak() {
    applyJegiPose(rig, JEGI_FRAMES[0]);
    playOrigin = readAnchor(stage, kickMark);
    applyJegiPose(rig, JEGI_FRAMES[4]);
    peak = readAnchor(stage, kickMark);
    applyJegiPose(rig, JEGI_FRAMES[frameIndex]);
  }

  function measure() {
    const prevW = size.w;
    const prevH = size.h;
    size = resizeCanvas(canvas, ctx, stage);
    foot = readAnchor(stage, kickMark);
    if (size.w < 2 || size.h < 2) return;
    const resized = !placed || Math.abs(size.w - prevW) > 8 || Math.abs(size.h - prevH) > 8;
    if (resized) {
      cachePeak();
      resetJegi();
      placed = true;
    }
  }

  function strike() {
    kickJegi(jegi, foot, hasPointer ? pointer : peak);
  }

  function startKick() {
    if (kicking) return;
    kicking = true;
    kickPhase = 0;
  }

  function paintJegi() {
    ctx.clearRect(0, 0, size.w, size.h);
    if (!visible || size.w < 2 || size.h < 2) return;
    drawJegi(ctx, jegi, INK, size.scale);
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

    const playR = Math.min(size.w, size.h) * 0.48;
    const inPlay =
      hasPointer &&
      Math.hypot(pointer.x - playOrigin.x, pointer.y - playOrigin.y) < playR;
    if (inPlay) engaged = true;

    if (kicking) {
      kickPhase += KICK_SPEED * dt;
      if (kickPhase >= JEGI_FRAMES.length) {
        kicking = false;
        kickPhase = 0;
        frameIndex = 0;
      } else {
        frameIndex = Math.min(JEGI_FRAMES.length - 1, Math.floor(kickPhase));
      }
    } else {
      frameIndex = 0;
    }
    applyJegiPose(rig, JEGI_FRAMES[frameIndex]);
    foot = readAnchor(stage, kickMark);

    // Rebound only on real contact: the falling coin has to reach the resting
    // foot. While the kick animation swings, contact stays off so one kick
    // cannot tap the jegi twice.
    if (
      engaged &&
      !kicking &&
      jegi.vel.y > 0 &&
      Math.hypot(jegi.pos.x - foot.x, jegi.pos.y - foot.y) < CONTACT_R * size.scale
    ) {
      kicking = true;
      kickPhase = 0;
      strike();
    }

    if (engaged) {
      stepJegi(jegi, size, dt);
    } else {
      hoverJegi(jegi, size, dt);
    }

    if (jegiFallen(jegi, size)) {
      resetJegi();
      engaged = inPlay;
    }

    paintJegi();
  }

  function movePointer(x: number, y: number) {
    if (!visible) return;
    const rect = stage.getBoundingClientRect();
    pointer.x = x - rect.left;
    pointer.y = y - rect.top;
    hasPointer = true;
  }

  window.addEventListener("pointermove", (e) => movePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => {
    movePointer(e.clientX, e.clientY);
    if (visible) startKick();
  });
  window.addEventListener("pointerleave", () => {
    hasPointer = false;
  });

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

  applyJegiPose(rig, JEGI_FRAMES[reduceMotion ? 4 : 0]);
  measure();
  cachePeak();

  if (reduceMotion) {
    jegi.pos.x = foot.x + 18;
    jegi.pos.y = foot.y - 40;
    jegi.vel.x = 0;
    jegi.vel.y = 0;
    paintJegi();
    window.addEventListener("resize", () => {
      measure();
      paintJegi();
    });
    return {
      setVisible(next: boolean) {
        visible = next;
        if (next) {
          measure();
          paintJegi();
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
