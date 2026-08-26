export type Vec = { x: number; y: number };

export const WHITE = "#ffffff";

export const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  stage: HTMLElement,
) {
  const rect = stage.getBoundingClientRect();
  const w = Math.max(stage.clientWidth, rect.width, 1);
  const h = Math.max(stage.clientHeight, rect.height, 1);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const nextW = Math.round(w * dpr);
  const nextH = Math.round(h * dpr);
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return {
    w,
    h,
    scale: clamp(Math.min(w, h) / 520, 0.55, 2),
  };
}

export function readAnchor(stage: HTMLElement, mark: SVGGraphicsElement): Vec {
  const rect = stage.getBoundingClientRect();
  const box = mark.getBoundingClientRect();
  return {
    x: box.left + box.width / 2 - rect.left,
    y: box.top + box.height / 2 - rect.top,
  };
}

export function rotate(
  el: SVGGElement,
  angle: number,
  pivot: readonly [number, number],
) {
  el.setAttribute(
    "transform",
    `rotate(${angle.toFixed(2)} ${pivot[0]} ${pivot[1]})`,
  );
}
