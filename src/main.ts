import { inject } from "@vercel/analytics";
import { startSangmo } from "./sangmo-loop";
import { startYeon } from "./yeon-loop";
import { startJegi } from "./jegi-loop";
import { createMorph } from "./morph";
import { createCursor } from "./cursor";

// Initialize Vercel Web Analytics
inject();
const SCENES = [
  { id: "intro", bg: "#ffffff", ink: "dark" },
  { id: "sangmo", bg: "#ce2f3a", ink: "light" },
  { id: "kite", bg: "#0048a0", ink: "light" },
  { id: "jegi", bg: "#ffffff", ink: "dark" },
] as const;

const LAST = SCENES.length - 1;
const HOLD = 0.22;
const INTRO_SIZE = 300;
const FOOTER_SIZE = 24;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stage = document.querySelector<HTMLElement>("#stage")!;
const scrollRoot = document.querySelector<HTMLElement>("#scroll-root")!;
const bgCurrent = document.querySelector<HTMLElement>("#bg-current")!;
const bgNext = document.querySelector<HTMLElement>("#bg-next")!;
const hint = document.querySelector<HTMLElement>("#scroll-hint")!;
const pager = document.querySelector<HTMLElement>("#pager")!;
const taegeuk = document.querySelector<HTMLElement>("#taegeuk")!;
const taegeukColor = document.querySelector<HTMLElement>(".taegeuk-color")!;
const taegeukLight = document.querySelector<HTMLElement>(".taegeuk-light")!;
const slots = [...pager.querySelectorAll<HTMLButtonElement>(".slot")];
const scenes = [...document.querySelectorAll<HTMLElement>(".scene")];
const sangmoScene = document.querySelector<HTMLElement>('[data-scene="sangmo"]')!;
const kiteScene = document.querySelector<HTMLElement>('[data-scene="kite"]')!;
const jegiScene = document.querySelector<HTMLElement>('[data-scene="jegi"]')!;
const sangmo = startSangmo(sangmoScene);
const yeon = startYeon(kiteScene);
const jegi = startJegi(jegiScene);
const morph = createMorph(stage, [sangmoScene, kiteScene, jegiScene]);
const cursorFx = createCursor(stage);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    sangmo.stop?.();
    yeon.stop?.();
    jegi.stop?.();
    morph.stop();
    cursorFx.stop();
  });
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => t * t * (3 - 2 * t);

function sceneHeight() {
  return Math.max(window.innerHeight, 1) * 1.45;
}

const snapMarks = SCENES.map(() => {
  const el = document.createElement("div");
  el.className = "snap-mark";
  scrollRoot.appendChild(el);
  return el;
});

function layout() {
  scrollRoot.style.height = `${LAST * sceneHeight() + window.innerHeight}px`;
  snapMarks.forEach((el, i) => {
    el.style.top = `${targetScroll(i)}px`;
  });
}

function maxScroll() {
  return Math.max(scrollRoot.offsetHeight - window.innerHeight, 1);
}

function readProgress() {
  const raw = clamp(window.scrollY / sceneHeight(), 0, LAST);
  const index = Math.min(Math.floor(raw + 1e-6), LAST);
  const local = clamp(raw - index, 0, 1);
  if (index >= LAST) return { index: LAST, wipe: 0, raw };
  const hold = index === 0 ? 0.12 : HOLD;
  const wipe = local <= hold ? 0 : easeInOut((local - hold) / (1 - hold));
  return { index, wipe, raw };
}

function targetScroll(sceneIndex: number) {
  return clamp(sceneIndex * sceneHeight(), 0, maxScroll());
}

function paint() {
  const { index, wipe } = readProgress();
  const current = SCENES[index];
  const next = SCENES[Math.min(index + 1, LAST)];
  const wiping = wipe > 0 && index < LAST;

  bgCurrent.style.background = current.bg;
  bgNext.style.background = next.bg;
  const nextY = !wiping ? 100 : reduceMotion ? (wipe > 0.5 ? 0 : 100) : (1 - wipe) * 100;
  bgNext.style.transform = `translate3d(0, ${nextY}%, 0)`;

  const currentClip = wiping ? `inset(0 0 ${wipe * 100}% 0)` : "inset(0)";
  const nextClip = wiping ? `inset(${(1 - wipe) * 100}% 0 0 0)` : "inset(100% 0 0 0)";

  for (const el of scenes) {
    const i = SCENES.findIndex((s) => s.id === el.dataset.scene);
    const shift = el.querySelector<HTMLElement>(".scene-shift");
    el.classList.toggle("is-idle", i !== index && i !== index + 1);
    if (i === index) {
      el.style.clipPath = reduceMotion ? "inset(0)" : currentClip;
      el.style.zIndex = "3";
      if (shift) {
        shift.style.transform = reduceMotion ? "none" : `translate3d(0, ${wipe * 18}vh, 0)`;
      }
    } else if (i === index + 1 && wiping) {
      el.style.clipPath = reduceMotion ? (wipe > 0.5 ? "inset(0)" : "inset(100% 0 0 0)") : nextClip;
      el.style.zIndex = "4";
      if (shift) {
        shift.style.transform = reduceMotion ? "none" : `translate3d(0, ${(1 - wipe) * -6}vh, 0)`;
      }
    } else {
      el.style.clipPath = "inset(100% 0 0 0)";
      el.style.zIndex = "2";
      if (shift) shift.style.transform = "none";
    }
  }

  const pagerScene = wiping && wipe > 0.08 ? next : current;
  pager.classList.toggle("is-dark", pagerScene.ink === "dark");
  pager.classList.toggle("is-light", pagerScene.ink === "light");

  // The intro cursor is sosaek — barely-there on the white opening.
  const inkOf = (i: number) =>
    i === 0 ? "#f0eae0" : SCENES[i].ink === "light" ? "#ffffff" : "#212121";
  cursorFx.setActive(true);
  cursorFx.setSplit(
    inkOf(index),
    inkOf(Math.min(index + 1, LAST)),
    wiping ? (1 - wipe) * window.innerHeight : Infinity,
  );

  const introT = index === 0 ? wipe : 1;
  const pagerT = easeInOut(clamp((introT - 0.35) / 0.65, 0, 1));
  pager.style.opacity = String(pagerT);
  pager.style.pointerEvents = pagerT > 0.6 ? "auto" : "none";
  hint.style.opacity = String((1 - introT) * 0.45);

  const contentIndex = wiping ? (wipe > 0.5 ? index + 1 : index) : index;
  const activeSlot = clamp(contentIndex - 1, 0, 2);
  slots.forEach((slot, i) => {
    slot.classList.toggle("is-active", i === activeSlot && introT > 0.55);
    slot.setAttribute("aria-current", i === activeSlot && introT > 0.55 ? "true" : "false");
  });

  placeTaegeuk(index, wipe, introT);

  const sangmoOn = index === 1 || (index === 0 && wiping);
  const yeonOn = index === 2 || (index === 1 && wiping);
  const jegiOn = index === 3 || (index === 2 && wiping);
  sangmo.setVisible(sangmoOn);
  yeon.setVisible(yeonOn);
  jegi.setVisible(jegiOn);
  if (sangmoOn) sangmo.measure();
  if (yeonOn) yeon.measure();
  if (jegiOn) jegi.measure();

  // Figure-to-figure transitions morph instead of riding the scene wipe.
  const morphOn = !reduceMotion && wiping && index >= 1;
  morph.set(morphOn ? { a: index - 1, b: index, t: wipe } : null);
}

function placeTaegeuk(index: number, wipe: number, introT: number) {
  const stageBox = stage.getBoundingClientRect();
  const start = {
    x: stageBox.width / 2,
    y: stageBox.height / 2,
    size: Math.min(INTRO_SIZE, stageBox.width * 0.42, stageBox.height * 0.42),
  };

  const fromSlot = clamp(index - 1, 0, 2);
  const toSlot = clamp((index < LAST ? index + 1 : index) - 1, 0, 2);
  const fromBox = slots[fromSlot].getBoundingClientRect();
  const toBox = slots[toSlot].getBoundingClientRect();
  const slotT = index === 0 ? 0 : wipe;
  const land = {
    x: lerp(fromBox.left + fromBox.width / 2, toBox.left + toBox.width / 2, slotT) - stageBox.left,
    y: lerp(fromBox.top + fromBox.height / 2, toBox.top + toBox.height / 2, slotT) - stageBox.top,
    size: FOOTER_SIZE,
  };

  const t = index === 0 ? introT : 1;
  const x = lerp(start.x, land.x, t);
  const y = lerp(start.y, land.y, t);
  const size = lerp(start.size, land.size, t);

  // Roll exactly one clockwise turn per slot hop, so the mark keeps rolling
  // yet always comes to rest flag-aligned — on the intro and the white final
  // scene the true-color taegeuk must sit exactly like the national flag.
  const roll = reduceMotion || index === 0 ? 0 : 360 * (index - 1 + slotT);

  taegeuk.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${roll.toFixed(1)}deg) scale(${size / INTRO_SIZE})`;

  let light = 0;
  if (index === 0) light = introT;
  else if (index === 1) light = 1;
  else if (index === 2) light = 1 - wipe;
  else light = 0;
  taegeukColor.style.opacity = String(1 - light);
  taegeukLight.style.opacity = String(light);
}

function goTo(sceneIndex: number) {
  window.scrollTo({
    top: targetScroll(sceneIndex),
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

for (const slot of slots) {
  slot.addEventListener("click", () => goTo(Number(slot.dataset.target)));
}

// Mobile: the clamped wall label under the title grows in place on tap.
for (const essay of document.querySelectorAll<HTMLElement>(".scene .body")) {
  essay.addEventListener("click", () => {
    const open = essay.closest(".scene")?.classList.toggle("essay-open");
    essay.style.maxHeight = open ? `${essay.scrollHeight}px` : "";
  });
}

taegeuk.style.pointerEvents = "auto";
taegeuk.addEventListener("click", () => {
  const { index, wipe } = readProgress();
  goTo(index === 0 && wipe < 0.2 ? 1 : 0);
});
taegeuk.setAttribute("role", "button");
taegeuk.setAttribute("aria-label", "Back to start");
taegeuk.tabIndex = 0;
taegeuk.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    goTo(0);
  }
});

window.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "PageDown" && e.key !== "PageUp" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    const { index, wipe } = readProgress();
    const at = wipe > 0.55 ? index + 1 : index;
    if (e.key === "Home") goTo(0);
    else if (e.key === "End") goTo(LAST);
    else if (e.key === "ArrowDown" || e.key === "PageDown") goTo(Math.min(at + 1, LAST));
    else goTo(Math.max(at - 1, 0));
    e.preventDefault();
  },
);

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    paint();
    ticking = false;
  });
};

window.addEventListener("scroll", onScroll, { passive: true });

// Touch: a drag that starts sideways belongs to the play layer — lock the
// page against scrolling for the rest of that gesture so the finger can then
// steer freely in every direction.
let gesture: "idle" | "undecided" | "play" | "scroll" = "idle";
let gestureX = 0;
let gestureY = 0;
window.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length !== 1) {
      gesture = "scroll";
      return;
    }
    gesture = "undecided";
    gestureX = e.touches[0].clientX;
    gestureY = e.touches[0].clientY;
  },
  { passive: true },
);
window.addEventListener(
  "touchmove",
  (e) => {
    if (gesture === "scroll" || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - gestureX;
    const dy = e.touches[0].clientY - gestureY;
    if (gesture === "undecided") {
      if (Math.hypot(dx, dy) < 8) return;
      gesture = Math.abs(dx) > Math.abs(dy) ? "play" : "scroll";
    }
    if (gesture === "play" && e.cancelable) e.preventDefault();
  },
  { passive: false },
);
window.addEventListener("touchend", () => (gesture = "idle"), { passive: true });
window.addEventListener("touchcancel", () => (gesture = "idle"), { passive: true });
window.addEventListener("resize", () => {
  layout();
  paint();
  sangmo.measure();
  yeon.measure();
  jegi.measure();
});
layout();
paint();

// iOS Safari can report a zero-sized stage on the very first pass, which
// collapses the taegeuk to nothing until the next scroll; settle again once
// the page has fully laid out.
window.addEventListener("load", () => {
  layout();
  paint();
});
setTimeout(() => {
  layout();
  paint();
}, 400);

const hashIndex = SCENES.findIndex((s) => s.id === location.hash.replace("#", ""));
if (hashIndex >= 0) goTo(hashIndex);
