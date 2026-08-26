import { WHITE, clamp, readAnchor, resizeCanvas, type Vec } from "./play";
import {
  applyJegiPose,
  CONTACT_FRAMES,
  JEGI_FRAMES,
  type JegiRig,
} from "./jegi-frames";
import {
  drawJegi,
  followJegi,
  hoverJegi,
  jegiFallen,
  kickJegi,
  stepJegi,
  type JegiState,
} from "./jegi";

const stage = document.querySelector<HTMLElement>(".stage")!;
const canvas = document.querySelector<HTMLCanvasElement>("#play-layer")!;
const kickMark = document.querySelector<SVGCircleElement>("#kick-anchor")!;
const hint = document.querySelector<HTMLElement>(".hint")!;
const cursor = document.querySelector<HTMLElement>(".cursor-ring")!;

const rig: JegiRig = {
  body: document.querySelector<SVGGElement>("#body")!,
  head: document.querySelector<SVGGElement>("#head")!,
  leftArm: document.querySelector<SVGGElement>("#left-arm")!,
  rightArm: document.querySelector<SVGGElement>("#right-arm")!,
  stand: document.querySelector<SVGGElement>("#stand")!,
  kick: document.querySelector<SVGGElement>("#kick")!,
  hem: document.querySelector<SVGPathElement>("#jegi-hem")!,
};

const KICK_SPEED = 6;
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!ctx) {
  document.body.classList.add("is-static");
  hint.textContent = "This browser cannot draw the jegi, so the kicker is shown still.";
  applyJegiPose(rig, JEGI_FRAMES[4]);
} else {
  run(ctx);
}

function run(ctx: CanvasRenderingContext2D) {
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
  let last = performance.now();

  const jegi: JegiState = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    spin: 0,
    phase: 0,
  };

  function cachePeak() {
    applyJegiPose(rig, JEGI_FRAMES[0]);
    playOrigin = readAnchor(stage, kickMark);
    applyJegiPose(rig, JEGI_FRAMES[4]);
    peak = readAnchor(stage, kickMark);
    applyJegiPose(rig, JEGI_FRAMES[frameIndex]);
  }

  function resetJegi() {
    jegi.pos.x = foot.x + 16;
    jegi.pos.y = foot.y - 36;
    jegi.vel.x = 0;
    jegi.vel.y = 0;
    held = false;
    dropped = false;
  }

  function measure() {
    size = resizeCanvas(canvas, ctx, stage);
    foot = readAnchor(stage, kickMark);
    if (jegi.pos.x === 0 && jegi.pos.y === 0) {
      cachePeak();
      resetJegi();
    }
  }

  function startKick() {
    if (kicking) return;
    kicking = true;
    kickPhase = 0;
    hit = false;
    document.body.classList.add("is-engaged");
  }

  function paintStill() {
    measure();
    applyJegiPose(rig, JEGI_FRAMES[4]);
    jegi.pos.x = foot.x + 18;
    jegi.pos.y = foot.y - 40;
    jegi.vel.x = 0;
    jegi.vel.y = 0;
    ctx.clearRect(0, 0, size.w, size.h);
    drawJegi(ctx, jegi, WHITE, size.scale);
  }

  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    foot = readAnchor(stage, kickMark);

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

    ctx.clearRect(0, 0, size.w, size.h);
    drawJegi(ctx, jegi, WHITE, size.scale);
    requestAnimationFrame(frame);
  }

  function movePointer(x: number, y: number) {
    const rect = stage.getBoundingClientRect();
    const nextX = x - rect.left;
    pointer.x = nextX;
    pointer.y = y - rect.top;
    if (hasPointer) sweep = clamp(sweep + (nextX - lastPointerX) * 2, -280, 280);
    lastPointerX = nextX;
    if (!hasPointer) {
      hasPointer = true;
      document.body.classList.add("is-engaged");
    }
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  measure();
  cachePeak();
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", (e) => movePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => {
    movePointer(e.clientX, e.clientY);
    startKick();
  });
  window.addEventListener("pointerleave", () => {
    if (held) dropped = true;
    hasPointer = false;
    held = false;
  });

  if (reduceMotion) {
    document.body.classList.add("is-static");
    hint.textContent = "Motion is reduced in your system settings, so the kick is held still.";
    paintStill();
    window.addEventListener("resize", paintStill);
  } else {
    requestAnimationFrame(frame);
  }
}
