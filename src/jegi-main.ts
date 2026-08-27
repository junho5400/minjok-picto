import { WHITE, readAnchor, resizeCanvas, type Vec } from "./play";
import {
  applyJegiPose,
  JEGI_FRAMES,
  type JegiRig,
} from "./jegi-frames";
import {
  drawJegi,
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
  fold1: document.querySelector<SVGPathElement>("#jegi-fold1"),
  fold2: document.querySelector<SVGPathElement>("#jegi-fold2"),
  standLeg: document.querySelector<SVGPathElement>("#jegi-standleg"),
};

const KICK_SPEED = 12;
const CONTACT_R = 26;
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
  let hasPointer = false;
  let engaged = false;
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
    jegi.pos.x = foot.x + 12 * size.scale;
    jegi.pos.y = foot.y - 90 * size.scale;
    jegi.vel.x = 0;
    jegi.vel.y = 0;
  }

  function measure() {
    size = resizeCanvas(canvas, ctx, stage);
    foot = readAnchor(stage, kickMark);
    if (jegi.pos.x === 0 && jegi.pos.y === 0) {
      cachePeak();
      resetJegi();
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

    ctx.clearRect(0, 0, size.w, size.h);
    drawJegi(ctx, jegi, WHITE, size.scale);
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
  cachePeak();
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", (e) => movePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => {
    movePointer(e.clientX, e.clientY);
    startKick();
  });
  window.addEventListener("pointerleave", () => {
    hasPointer = false;
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
