/** Minimal cursor: a filled ink square on every scene. During a scene wipe
 *  the square splits along the background boundary, taking each region's ink,
 *  and it turns into a diamond over the clickable taegeuk. */

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
    let fill = bottomInk;
    if (boundary >= cy + R) {
      fill = topInk;
    } else if (boundary > cy - R) {
      const p = boundary - (cy - R);
      fill = `linear-gradient(${topInk} 0px, ${topInk} ${p}px, ${bottomInk} ${p}px)`;
    }
    square.style.setProperty("--square-fill", fill);
  }

  const onMove = (e: PointerEvent) => {
    cy = e.clientY;
    seen = true;
    square.style.transform = `translate3d(${e.clientX}px, ${cy}px, 0) translate(-50%, -50%)`;
    if (active) square.style.opacity = "1";
    paintSquare();
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  // Over the clickable taegeuk the square eases into a diamond.
  const taegeuk = document.getElementById("taegeuk");
  const toDiamond = () => square.classList.add("is-diamond");
  const toSquare = () => square.classList.remove("is-diamond");
  taegeuk?.addEventListener("pointerenter", toDiamond);
  taegeuk?.addEventListener("pointerleave", toSquare);

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
      taegeuk?.removeEventListener("pointerenter", toDiamond);
      taegeuk?.removeEventListener("pointerleave", toSquare);
      square.remove();
      document.body.classList.remove("has-cursor-fx");
    },
  };
}
