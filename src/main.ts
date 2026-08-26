import { drawSangmo, type SangmoState, type Vec } from "./sangmo";
import { applyPose, FRAMES, type Rig } from "./frames";

const stage = document.querySelector<HTMLElement>(".stage")!;
const canvas = document.querySelector<HTMLCanvasElement>("#ribbon-layer")!;
const anchorMark = document.querySelector<SVGCircleElement>("#hat-anchor")!;
const hint = document.querySelector<HTMLElement>(".hint")!;
const cursor = document.querySelector<HTMLElement>(".cursor-ring")!;

const rig: Rig = {
  body: document.querySelector<SVGGElement>("#body")!,
  head: document.querySelector<SVGGElement>("#head")!,
  leftArm: document.querySelector<SVGGElement>("#left-arm")!,
  rightArm: document.querySelector<SVGGElement>("#right-arm")!,
  legs: document.querySelector<SVGGElement>("#legs")!,
  foot: document.querySelector<SVGGElement>("#foot")!,
};

const WHITE = "#ffffff";
const BASE_SPIN = 5.6;
const MAX_SPIN = 15;
/** Dance cels per full turn of the ribbon. */
const FRAMES_PER_TURN = 8;

const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

if (!ctx) {
  document.body.classList.add("is-static");
  hint.textContent = "This browser cannot draw the ribbon, so the dancer is shown still.";
  applyPose(rig, FRAMES[2]);
} else {
  run(ctx);
}

function run(ctx: CanvasRenderingContext2D) {
  const pointer: Vec = { x: 0, y: 0 };
  let size = { w: 0, h: 0, scale: 1 };
  let anchor: Vec = { x: 0, y: 0 };
  let spin = BASE_SPIN;
  let framePhase = 0;
  let frameIndex = -1;
  let lastPointerX = 0;
  let sweep = 0;
  let hasPointer = false;
  let last = performance.now();

  const state: SangmoState = {
    anchor,
    phase: 0,
    radius: 0,
    tilt: 0.34,
    lift: 0,
    lean: 0,
  };

  function measure() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size = {
      w: rect.width,
      h: rect.height,
      scale: clamp(Math.min(rect.width, rect.height) / 520, 0.55, 2),
    };
    readAnchor();
    if (!hasPointer) {
      pointer.x = anchor.x + size.w * 0.2;
      pointer.y = anchor.y - size.h * 0.12;
      lastPointerX = pointer.x;
    }
    state.radius = defaultRadius();
    state.lift = defaultLift();
  }

  function readAnchor() {
    const rect = stage.getBoundingClientRect();
    const mark = anchorMark.getBoundingClientRect();
    anchor = {
      x: mark.left + mark.width / 2 - rect.left,
      y: mark.top + mark.height / 2 - rect.top,
    };
    state.anchor = anchor;
  }

  const defaultRadius = () => Math.min(size.w, size.h) * 0.26;
  const defaultLift = () => Math.min(size.w, size.h) * 0.12;

  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    readAnchor();

    const reach = hasPointer
      ? clamp(Math.hypot(pointer.x - anchor.x, pointer.y - anchor.y) * 0.75, size.w * 0.08, size.w * 0.42)
      : defaultRadius();
    const wantLift = hasPointer
      ? clamp((anchor.y - pointer.y) * 0.45 + defaultLift() * 0.5, size.h * 0.02, size.h * 0.3)
      : defaultLift();
    const wantLean = hasPointer ? (pointer.x - anchor.x) * 0.18 : 0;

    state.radius += (reach - state.radius) * 0.06;
    state.lift += (wantLift - state.lift) * 0.06;
    state.lean += (wantLean - state.lean) * 0.06;
    state.tilt += (clamp(0.24 + state.lift / Math.max(size.h, 1) * 0.9, 0.2, 0.52) - state.tilt) * 0.06;

    const wantSpin = clamp(
      Math.sign(sweep || 1) * (BASE_SPIN + Math.abs(sweep) * 0.05),
      -MAX_SPIN,
      MAX_SPIN,
    );
    spin += (wantSpin - spin) * 0.04;
    sweep *= 0.9;

    state.phase += spin * dt;
    framePhase += (Math.abs(spin) / (Math.PI * 2)) * FRAMES_PER_TURN * dt;

    const next = Math.floor(framePhase) % FRAMES.length;
    if (next !== frameIndex) {
      frameIndex = next;
      applyPose(rig, FRAMES[next]);
    }

    ctx.clearRect(0, 0, size.w, size.h);
    drawSangmo(ctx, state, WHITE, size.scale);

    requestAnimationFrame(frame);
  }

  function movePointer(x: number, y: number) {
    const rect = stage.getBoundingClientRect();
    pointer.x = x - rect.left;
    pointer.y = y - rect.top;
    sweep = clamp(sweep + (pointer.x - lastPointerX) * 2, -260, 260);
    lastPointerX = pointer.x;
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
    hint.textContent = "Motion is reduced in your system settings, so the spin is held still.";
    applyPose(rig, FRAMES[2]);
    const paint = () => {
      measure();
      readAnchor();
      state.phase = Math.PI * 0.35;
      ctx.clearRect(0, 0, size.w, size.h);
      drawSangmo(ctx, state, WHITE, size.scale);
    };
    paint();
    window.addEventListener("resize", paint);
  } else {
    requestAnimationFrame(frame);
  }
}
