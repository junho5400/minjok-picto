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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return {
    w: rect.width,
    h: rect.height,
    scale: clamp(Math.min(rect.width, rect.height) / 520, 0.55, 2),
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
