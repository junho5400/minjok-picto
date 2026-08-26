import { clamp, readAnchor, resizeCanvas, type Vec } from "./play";
import { applyJegiPose, CONTACT_FRAMES, JEGI_FRAMES, type JegiRig } from "./jegi-frames";
import { drawJegi, jegiFallen, kickJegi, stepJegi, type JegiState } from "./jegi";

const INK = "#212121";
const KICK_SPEED = 14;

export function startJegi(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>(".pictogram")!;
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  const kickMark = root.querySelector<SVGCircleElement>("#kick-anchor")!;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rig: JegiRig = {
    body: root.querySelector<SVGGElement>("#jegi-body")!,
    head: root.querySelector<SVGGElement>("#jegi-head")!,
    leftArm: root.querySelector<SVGGElement>("#jegi-left-arm")!,
    rightArm: root.querySelector<SVGGElement>("#jegi-right-arm")!,
    stand: root.querySelector<SVGGElement>("#jegi-stand")!,
    kick: root.querySelector<SVGGElement>("#jegi-kick")!,
  };

  if (!ctx) {
    applyJegiPose(rig, JEGI_FRAMES[4]);
    return { setVisible() {}, measure() {} };
  }

  const pointer: Vec = { x: 0, y: 0 };
  let size = { w: 0, h: 0, scale: 1 };
  let foot: Vec = { x: 0, y: 0 };
  let kicking = false;
  let kickPhase = 0;
  let frameIndex = 0;
  let hit = false;
  let hasPointer = false;
  let lastPointerX = 0;
  let sweep = 0;
  let visible = true;
  let last = performance.now();

  const jegi: JegiState = {
    pos: { x: 0, y: 0 },
    vel: { x: 40, y: -120 },
    spin: 0,
    phase: 0,
  };

  function measure() {
    size = resizeCanvas(canvas, ctx, stage);
    foot = readAnchor(stage, kickMark);
    if (jegi.pos.x === 0 && jegi.pos.y === 0) {
      jegi.pos.x = foot.x + 16;
      jegi.pos.y = foot.y - 36;
    }
  }

  function startKick() {
    if (kicking) return;
    kicking = true;
    kickPhase = 0;
    hit = false;
  }

  function resetJegi() {
    jegi.pos.x = foot.x + 12;
    jegi.pos.y = foot.y - 28;
    jegi.vel.x = 30;
    jegi.vel.y = -80;
  }

  function frame(now: number) {
    requestAnimationFrame(frame);
    if (!visible) return;

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    foot = readAnchor(stage, kickMark);

    if (!kicking) {
      const fallingIn = jegi.vel.y > 40 && Math.hypot(jegi.pos.x - foot.x, jegi.pos.y - foot.y) < 90;
      if (fallingIn || Math.abs(sweep) > 90) startKick();
    }

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
      const reach = Math.hypot(jegi.pos.x - foot.x, jegi.pos.y - foot.y);
      if (reach < 78 * size.scale) {
        kickJegi(jegi, foot, hasPointer ? pointer.x : foot.x + 40, 80 + Math.abs(sweep));
        hit = true;
      }
    }

    stepJegi(jegi, size, dt);
    if (jegiFallen(jegi, size)) resetJegi();
    sweep *= 0.88;

    ctx.clearRect(0, 0, size.w, size.h);
    drawJegi(ctx, jegi, INK, size.scale);
  }

  function movePointer(x: number, y: number) {
    if (!visible) return;
    const rect = stage.getBoundingClientRect();
    pointer.x = x - rect.left;
    pointer.y = y - rect.top;
    sweep = clamp(sweep + (pointer.x - lastPointerX) * 2, -280, 280);
    lastPointerX = pointer.x;
    hasPointer = true;
  }

  window.addEventListener("pointermove", (e) => movePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => {
    movePointer(e.clientX, e.clientY);
    if (visible) startKick();
  });

  if (reduceMotion) {
    applyJegiPose(rig, JEGI_FRAMES[4]);
    measure();
    jegi.pos.x = foot.x + 18;
    jegi.pos.y = foot.y - 40;
    jegi.vel.x = 0;
    jegi.vel.y = 0;
    ctx.clearRect(0, 0, size.w, size.h);
    drawJegi(ctx, jegi, INK, size.scale);
    window.addEventListener("resize", () => {
      measure();
      ctx.clearRect(0, 0, size.w, size.h);
      drawJegi(ctx, jegi, INK, size.scale);
    });
    return {
      setVisible(next: boolean) {
        visible = next;
      },
      measure,
    };
  }

  applyJegiPose(rig, JEGI_FRAMES[0]);
  measure();
  requestAnimationFrame(frame);

  return {
    setVisible(next: boolean) {
      visible = next;
    },
    measure,
  };
}
