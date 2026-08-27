/** Minimal cursor: a filled ink square, off on the intro. During a scene wipe
 *  the square splits along the background boundary, taking each region's ink. */

const R = 6.5;

export function createCursor(stage: HTMLElement) {
  const fine = window.matchMedia("(pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduceMotion) {
    return { setActive(_: boolean) {}, setSplit(_t: string, _b: string, _y: number) {}, stop() {} };
  }

  const square = document.createElement("div");
  square.className = "cursor-square";
  stage.append(square);

  let active = false;
  let topInk = "#212121";
  let bottomInk = "#212121";
  let boundary = Infinity;
  let cy = 0;
  let seen = false;

  function paintSquare() {
    if (boundary >= cy + R) {
      square.style.background = topInk;
    } else if (boundary <= cy - R) {
      square.style.background = bottomInk;
    } else {
      const p = boundary - (cy - R);
      square.style.background = `linear-gradient(${topInk} 0px, ${topInk} ${p}px, ${bottomInk} ${p}px)`;
    }
  }

  const onMove = (e: PointerEvent) => {
    cy = e.clientY;
    seen = true;
    square.style.transform = `translate3d(${e.clientX}px, ${cy}px, 0) translate(-50%, -50%)`;
    if (active) square.style.opacity = "1";
    paintSquare();
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  return {
    /** The intro keeps the native cursor; scenes switch to the ink square. */
    setActive(next: boolean) {
      if (next === active) return;
      active = next;
      document.body.classList.toggle("has-cursor-fx", next);
      square.style.opacity = next && seen ? "1" : "0";
    },
    /** boundary: viewport y where the rising next-scene background starts. */
    setSplit(top: string, bottom: string, boundaryY: number) {
      topInk = top;
      bottomInk = bottom;
      boundary = boundaryY;
      paintSquare();
    },
    stop() {
      window.removeEventListener("pointermove", onMove);
      square.remove();
      document.body.classList.remove("has-cursor-fx");
    },
  };
}
