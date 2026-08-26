import { clamp, readAnchor, resizeCanvas, type Vec } from "./play";
import { applyJegiPose, CONTACT_FRAMES, JEGI_FRAMES, type JegiRig } from "./jegi-frames";
import {
  drawJegi,
  followJegi,
  hoverJegi,
  jegiFallen,
  kickJegi,
  stepJegi,
  type JegiState,
} from "./jegi";

const INK = "#212121";
const KICK_SPEED = 6;

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
  let hit = false;
  let hasPointer = false;
  let held = false;
  let dropped = false;
  let lastPointerX = 0;
  let sweep = 0;
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
    jegi.pos.x = foot.x + 16;
    jegi.pos.y = foot.y - 36;
    jegi.vel.x = 0;
    jegi.vel.y = 0;
    held = false;
    dropped = false;
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

  function startKick() {
    if (kicking) return;
    kicking = true;
    kickPhase = 0;
    hit = false;
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
    const dist = hasPointer
      ? Math.hypot(pointer.x - playOrigin.x, pointer.y - playOrigin.y)
      : Infinity;
    const inPlay = hasPointer && dist < playR;

    if (inPlay) {
      held = true;
      dropped = false;
    } else if (held) {
      held = false;
      dropped = true;
    }

    if (!kicking && Math.abs(sweep) > (held ? 90 : 140)) startKick();

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

    if (!hit && kicking && CONTACT_FRAMES.has(frameIndex)) {
      const reach = Math.hypot(jegi.pos.x - peak.x, jegi.pos.y - peak.y);
      if (reach < 78 * size.scale) {
        kickJegi(jegi, peak, hasPointer ? pointer.x : peak.x + 40, 80 + Math.abs(sweep));
        hit = true;
        if (!held) dropped = true;
      }
    }

    if (held) {
      followJegi(jegi, pointer, size, dt);
    } else if (dropped) {
      stepJegi(jegi, size, dt);
    } else {
      hoverJegi(jegi, size, dt);
    }

    if (jegiFallen(jegi, size)) resetJegi();
    sweep *= 0.88;

    paintJegi();
  }

  function movePointer(x: number, y: number) {
    if (!visible) return;
    const rect = stage.getBoundingClientRect();
    const nextX = x - rect.left;
    const nextY = y - rect.top;
    if (hasPointer) {
      sweep = clamp(sweep + (nextX - lastPointerX) * 2, -280, 280);
    }
    pointer.x = nextX;
    pointer.y = nextY;
    lastPointerX = nextX;
    hasPointer = true;
  }

  window.addEventListener("pointermove", (e) => movePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => {
    movePointer(e.clientX, e.clientY);
    if (visible) startKick();
  });
  window.addEventListener("pointerleave", () => {
    if (held) dropped = true;
    hasPointer = false;
    held = false;
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
