import { drawSangmo, type SangmoState, type Vec } from "./sangmo";
import { applyPose, FRAMES, type Rig } from "./frames";

const WHITE = "#ffffff";
const BASE_SPIN = 5.6;
const MAX_SPIN = 15;
const FRAMES_PER_TURN = 8;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function startSangmo(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>(".pictogram")!;
  const canvas = root.querySelector<HTMLCanvasElement>("#ribbon-layer")!;
  const anchorMark = root.querySelector<SVGCircleElement>("#hat-anchor")!;
  const ctx = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rig: Rig = {
    body: root.querySelector<SVGGElement>("#body")!,
    head: root.querySelector<SVGGElement>("#head")!,
    leftArm: root.querySelector<SVGGElement>("#left-arm")!,
    rightArm: root.querySelector<SVGGElement>("#right-arm")!,
    legs: root.querySelector<SVGGElement>("#legs")!,
    foot: root.querySelector<SVGGElement>("#foot")!,
  };

  if (!ctx) {
    applyPose(rig, FRAMES[2]);
    return { setVisible() {}, measure() {}, stop() {} };
  }

  const pointer: Vec = { x: 0, y: 0 };
  let size = { w: 0, h: 0, scale: 1 };
  let anchor: Vec = { x: 0, y: 0 };
  let spin = BASE_SPIN;
  let framePhase = 0;
  let frameIndex = -1;
  let lastPointerX = 0;
  let sweep = 0;
  let hasPointer = false;
  let visible = true;
  let last = performance.now();
  let raf = 0;

  const state: SangmoState = {
    anchor,
    phase: 0,
    radius: 0,
    tilt: 0.34,
    lift: 0,
    lean: 0,
  };

  const defaultRadius = () => Math.min(size.w, size.h) * 0.22;
  const defaultLift = () => Math.min(size.w, size.h) * 0.1;

  function readAnchor() {
    const rect = stage.getBoundingClientRect();
    const mark = anchorMark.getBoundingClientRect();
    anchor = {
      x: mark.left + mark.width / 2 - rect.left,
      y: mark.top + mark.height / 2 - rect.top,
    };
    state.anchor = anchor;
  }

  function measure() {
    const wCss = Math.max(stage.clientWidth, stage.getBoundingClientRect().width, 1);
    const hCss = Math.max(stage.clientHeight, stage.getBoundingClientRect().height, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextW = Math.round(wCss * dpr);
    const nextH = Math.round(hCss * dpr);
    if (canvas.width !== nextW || canvas.height !== nextH) {
      canvas.width = nextW;
      canvas.height = nextH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size = {
      w: wCss,
      h: hCss,
      scale: clamp(Math.min(wCss, hCss) / 520, 0.55, 2),
    };
    readAnchor();
    if (!hasPointer) {
      pointer.x = anchor.x + size.w * 0.18;
      pointer.y = anchor.y - size.h * 0.1;
      lastPointerX = pointer.x;
    }
  }

  function tickPhysics(dt: number) {
    const reach = hasPointer
      ? clamp(Math.hypot(pointer.x - anchor.x, pointer.y - anchor.y) * 0.75, size.w * 0.08, size.w * 0.36)
      : defaultRadius();
    const wantLift = hasPointer
      ? clamp((anchor.y - pointer.y) * 0.45 + defaultLift() * 0.5, size.h * 0.02, size.h * 0.24)
      : defaultLift();
    const wantLean = hasPointer ? (pointer.x - anchor.x) * 0.18 : 0;

    if (state.radius < 1) state.radius = reach;
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
  }

  function paintRibbon() {
    ctx.clearRect(0, 0, size.w, size.h);
    if (size.w < 2 || size.h < 2 || state.radius < 1) return;
    drawSangmo(ctx, state, WHITE, size.scale);
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

    tickPhysics(dt);
    paintRibbon();
  }

  function movePointer(x: number, y: number) {
    if (!visible) return;
    const rect = stage.getBoundingClientRect();
    pointer.x = x - rect.left;
    pointer.y = y - rect.top;
    sweep = clamp(sweep + (pointer.x - lastPointerX) * 2, -260, 260);
    lastPointerX = pointer.x;
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

  applyPose(rig, FRAMES[reduceMotion ? 2 : 0]);
  measure();

  if (reduceMotion) {
    state.phase = Math.PI * 0.35;
    state.radius = defaultRadius();
    state.lift = defaultLift();
    paintRibbon();
    window.addEventListener("resize", () => {
      measure();
      paintRibbon();
    });
    return { setVisible(next: boolean) { visible = next; }, measure, stop };
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
