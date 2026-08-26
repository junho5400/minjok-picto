import { Ribbon, type Vec } from "./ribbon";

const stage = document.querySelector<HTMLElement>(".stage")!;
const canvas = document.querySelector<HTMLCanvasElement>("#ribbon-layer")!;
const figure = document.querySelector<SVGSVGElement>(".figure")!;
const anchorMark = document.querySelector<SVGCircleElement>("#hat-anchor")!;
const hint = document.querySelector<HTMLElement>(".hint")!;
const cursor = document.querySelector<HTMLElement>(".cursor-dot")!;

const ACCENT = "#DE3B1F";
const IDLE_DELAY = 1600;

const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!ctx) {
  document.body.classList.add("is-static");
  hint.textContent =
    "This browser cannot draw the ribbon, so the dancer is shown still.";
} else {
  run(ctx);
}

function run(ctx: CanvasRenderingContext2D) {
  const ribbon = new Ribbon(52);
  const pointer: Vec = { x: 0, y: 0 };
  const smooth: Vec = { x: 0, y: 0 };
  let anchor: Vec = { x: 0, y: 0 };
  let size = { w: 0, h: 0, scale: 1 };
  let idleAngle = 0;
  let idleMix = 1;
  let speed = 0;
  let lastMove = -Infinity;
  let hasPointer = false;
  let last = performance.now();

  function measure() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size = { w: rect.width, h: rect.height, scale: Math.min(rect.width, rect.height) / 520 };

    const mark = anchorMark.getBoundingClientRect();
    anchor = { x: mark.left + mark.width / 2 - rect.left, y: mark.top + mark.height / 2 - rect.top };

    if (!hasPointer) {
      pointer.x = smooth.x = anchor.x + size.w * 0.22;
      pointer.y = smooth.y = anchor.y - size.h * 0.16;
    }
    ribbon.reset(anchor);
  }

  function idleTarget(dt: number): Vec {
    idleAngle += dt * 0.0022;
    const radius = Math.min(size.w, size.h) * 0.3;
    return {
      x: anchor.x + Math.cos(idleAngle) * radius * 1.15,
      y: anchor.y - size.h * 0.06 + Math.sin(idleAngle) * radius * 0.6,
    };
  }

  function frame(now: number) {
    const dt = Math.min(now - last, 48);
    last = now;

    const idle = now - lastMove > IDLE_DELAY;
    idleMix += ((idle ? 1 : 0) - idleMix) * 0.045;

    const orbit = idleTarget(dt);
    const target: Vec = {
      x: pointer.x + (orbit.x - pointer.x) * idleMix,
      y: pointer.y + (orbit.y - pointer.y) * idleMix,
    };

    const step = 0.22 + speed * 0.0006;
    const nx = smooth.x + (target.x - smooth.x) * Math.min(step, 0.6);
    const ny = smooth.y + (target.y - smooth.y) * Math.min(step, 0.6);
    speed = speed * 0.9 + Math.hypot(nx - smooth.x, ny - smooth.y) * 0.1;
    smooth.x = nx;
    smooth.y = ny;

    ribbon.update(anchor, smooth, Math.min(size.w, size.h) * 0.95);

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.restore();

    ribbon.draw(ctx, ACCENT, size.scale, Math.min(speed / 12, 1));

    const tilt = ((smooth.x - anchor.x) / size.w) * 4;
    figure.style.transform = `rotate(${tilt.toFixed(2)}deg)`;

    requestAnimationFrame(frame);
  }

  function paintStill() {
    ctx.clearRect(0, 0, size.w, size.h);
    for (let i = 0; i < 90; i++) {
      ribbon.update(anchor, { x: anchor.x + size.w * 0.26, y: anchor.y - size.h * 0.2 }, Math.min(size.w, size.h) * 0.95);
    }
    ribbon.draw(ctx, ACCENT, size.scale, 0);
  }

  function movePointer(x: number, y: number) {
    const rect = stage.getBoundingClientRect();
    pointer.x = x - rect.left;
    pointer.y = y - rect.top;
    lastMove = performance.now();
    if (!hasPointer) {
      hasPointer = true;
      document.body.classList.add("is-engaged");
    }
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  measure();
  window.addEventListener("resize", measure);

  window.addEventListener("pointermove", (e) => movePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener(
    "pointerdown",
    (e) => {
      movePointer(e.clientX, e.clientY);
      document.body.classList.add("is-pressed");
    },
    { passive: true },
  );
  window.addEventListener("pointerup", () => document.body.classList.remove("is-pressed"), { passive: true });

  if (reduceMotion.matches) {
    document.body.classList.add("is-static");
    hint.textContent = "Motion is reduced in your system settings, so the ribbon is held still.";
    paintStill();
    window.addEventListener("resize", paintStill);
  } else {
    requestAnimationFrame(frame);
  }
}
