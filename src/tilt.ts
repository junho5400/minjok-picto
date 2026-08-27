import { clamp } from "./play";

/** Tilt-to-aim on touch devices: device orientation drives a synthetic
 *  pointer through the same pipeline as mouse and touch. Android starts
 *  immediately; iOS asks for sensor permission on the first touch. */

const RANGE = 18;
const FOLLOW = 0.14;
const DEAD = 0.04;

export function startTilt() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (!coarse || typeof DeviceOrientationEvent === "undefined") {
    return { stop() {} };
  }

  let neutralB: number | null = null;
  let neutralG = 0;
  let beta = 0;
  let gamma = 0;
  let px = 0;
  let py = 0;
  let placed = false;
  let touches = 0;
  let listening = false;
  let asked = false;
  let raf = 0;

  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    beta = e.beta;
    gamma = e.gamma;
    if (neutralB === null) {
      neutralB = beta;
      neutralG = gamma;
    }
  };

  function tick() {
    raf = requestAnimationFrame(tick);
    if (neutralB === null) return;

    // Re-learn the held pose only while the phone sits near neutral, so an
    // aim held off-center never drifts back.
    if (Math.abs(beta - neutralB) < 5 && Math.abs(gamma - neutralG) < 5) {
      neutralB += (beta - neutralB) * 0.01;
      neutralG += (gamma - neutralG) * 0.01;
    }

    const dx = clamp((gamma - neutralG) / RANGE, -1, 1);
    const dy = clamp((beta - neutralB) / RANGE, -1, 1);
    const tx = window.innerWidth / 2 + dx * window.innerWidth * 0.44;
    const ty = window.innerHeight / 2 + dy * window.innerHeight * 0.4;
    if (!placed) {
      px = tx;
      py = ty;
      placed = true;
    }
    px += (tx - px) * FOLLOW;
    py += (ty - py) * FOLLOW;

    if (touches === 0 && (Math.abs(dx) > DEAD || Math.abs(dy) > DEAD)) {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: px, clientY: py }));
    }
  }

  function listen() {
    if (listening) return;
    listening = true;
    window.addEventListener("deviceorientation", onOrient);
    raf = requestAnimationFrame(tick);
  }

  const needsPermission =
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
      .requestPermission === "function";

  const arm = () => {
    if (asked || listening) return;
    asked = true;
    (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> })
      .requestPermission()
      .then((state) => {
        if (state === "granted") listen();
      })
      .catch(() => {});
  };

  const onDown = () => {
    touches++;
    if (needsPermission) arm();
  };
  const onUp = () => {
    touches = Math.max(0, touches - 1);
  };

  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onUp, true);
  if (!needsPermission) listen();

  return {
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("deviceorientation", onOrient);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    },
  };
}
