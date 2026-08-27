import { clamp, lerp, resizeCanvas } from "./play";

/** Samples per stroke. */
const N = 36;
/** Portion of the transition spent staggering stroke departures. */
const STAG = 0.12;

/** Body-part buckets so strokes morph into their counterpart limb. */
const ROLE: Record<string, string> = {
  legs: "legs",
  foot: "legs",
  torso: "torso",
  "right-arm": "rarm",
  "left-arm": "larm",
  head: "head",
  "yeon-legs": "legs",
  "yeon-foot": "legs",
  "yeon-torso": "torso",
  "yeon-right-arm": "rarm",
  "yeon-head": "head",
  "jegi-stand": "legs",
  "jegi-kick": "legs",
  "jegi-skirt": "torso",
  "jegi-torso": "torso",
  "jegi-left-arm": "larm",
  "jegi-right-arm": "rarm",
  "jegi-head": "head",
};

type Stroke = {
  el: SVGGeometryElement;
  role: string;
  width: number;
  d: string | null;
  local: Float32Array;
};

type Figure = {
  svg: SVGSVGElement;
  prop: HTMLCanvasElement | null;
  ink: [number, number, number];
  strokes: Stroke[];
};

type Pair = { a: number; b: number; rev: boolean; amp: number; lag: number };

export type MorphState = { a: number; b: number; t: number } | null;

const smooth = (t: number) => t * t * (3 - 2 * t);

function parseColor(css: string): [number, number, number] {
  const m = css.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [255, 255, 255];
}

export function createMorph(stage: HTMLElement, roots: HTMLElement[]) {
  const canvas = document.createElement("canvas");
  canvas.className = "morph-layer";
  stage.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: true });

  if (!ctx) {
    canvas.remove();
    return { set(_: MorphState) {}, stop() {} };
  }

  const figures: (Figure | null)[] = roots.map(() => null);
  const pairCache = new Map<string, Pair[]>();
  const bufA = new Float32Array(N * 2);
  const bufB = new Float32Array(N * 2);
  const bufM = new Float32Array(N * 2);
  let active: Exclude<MorphState, null> = { a: 0, b: 1, t: 0 };
  let on = false;
  let raf = 0;

  function figure(i: number): Figure {
    let f = figures[i];
    if (f) return f;
    const svg = roots[i].querySelector<SVGSVGElement>(".pictogram svg.figure")!;
    const strokes: Stroke[] = [];
    for (const el of svg.querySelectorAll<SVGGeometryElement>("path")) {
      let role = "torso";
      for (let g = el.parentElement; g && g !== (svg as unknown as HTMLElement); g = g.parentElement) {
        const mapped = g.id && ROLE[g.id];
        if (mapped) {
          role = mapped;
          break;
        }
      }
      strokes.push({
        el,
        role,
        width: parseFloat(getComputedStyle(el).strokeWidth) || 1,
        d: null,
        local: new Float32Array(0),
      });
    }
    f = {
      svg,
      prop: roots[i].querySelector<HTMLCanvasElement>(".pictogram canvas"),
      ink: parseColor(getComputedStyle(svg).color),
      strokes,
    };
    figures[i] = f;
    return f;
  }

  function ensureSamples(s: Stroke) {
    const d = s.el.getAttribute("d");
    if (s.local.length && d === s.d) return;
    s.d = d;
    if (!s.local.length) s.local = new Float32Array(N * 2);
    const L = s.el.getTotalLength();
    for (let i = 0; i < N; i++) {
      const p = s.el.getPointAtLength((L * i) / (N - 1));
      s.local[i * 2] = p.x;
      s.local[i * 2 + 1] = p.y;
    }
  }

  /** Map cached local samples to stage coordinates; returns the CTM scale. */
  function project(s: Stroke, origin: DOMRect, out: Float32Array): number {
    ensureSamples(s);
    const m = s.el.getScreenCTM();
    if (!m) return 0;
    for (let i = 0; i < N; i++) {
      const x = s.local[i * 2];
      const y = s.local[i * 2 + 1];
      out[i * 2] = m.a * x + m.c * y + m.e - origin.left;
      out[i * 2 + 1] = m.b * x + m.d * y + m.f - origin.top;
    }
    return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
  }

  function buildPairs(ai: number, bi: number): Pair[] {
    const origin = stage.getBoundingClientRect();
    const describe = (f: Figure) =>
      f.strokes.map((s, idx) => {
        const sc = project(s, origin, bufA);
        let cx = 0;
        let cy = 0;
        for (let i = 0; i < N; i++) {
          cx += bufA[i * 2];
          cy += bufA[i * 2 + 1];
        }
        return {
          idx,
          role: s.role,
          len: s.el.getTotalLength() * sc,
          cx: cx / N,
          cy: cy / N,
          sx: bufA[0],
          sy: bufA[1],
          ex: bufA[(N - 1) * 2],
          ey: bufA[(N - 1) * 2 + 1],
        };
      });
    type Info = ReturnType<typeof describe>[number];
    const bucket = (list: Info[]) => {
      const map = new Map<string, Info[]>();
      for (const it of list) {
        const arr = map.get(it.role) ?? [];
        arr.push(it);
        map.set(it.role, arr);
      }
      return map;
    };
    const ia = describe(figure(ai));
    const ib = describe(figure(bi));
    const minY = Math.min(...ia.map((s) => s.cy));
    const spanY = Math.max(Math.max(...ia.map((s) => s.cy)) - minY, 1);
    const ba = bucket(ia);
    const bb = bucket(ib);

    const out: Pair[] = [];
    const push = (a: Info, b: Info) => {
      const straight = Math.hypot(a.sx - b.sx, a.sy - b.sy) + Math.hypot(a.ex - b.ex, a.ey - b.ey);
      const crossed = Math.hypot(a.sx - b.ex, a.sy - b.ey) + Math.hypot(a.ex - b.sx, a.ey - b.sy);
      const travel = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      out.push({
        a: a.idx,
        b: b.idx,
        rev: crossed < straight,
        // Strokes that morph in place stay put; only far movers arc a little.
        amp: Math.min(travel / 240, 1) * 0.35,
        // Top-to-bottom ripple instead of random departures.
        lag: (a.cy - minY) / spanY,
      });
    };
    const nearest = (from: Info, list: Info[]) =>
      list.reduce((best, cur) =>
        Math.hypot(cur.cx - from.cx, cur.cy - from.cy) < Math.hypot(best.cx - from.cx, best.cy - from.cy)
          ? cur
          : best,
      );

    for (const role of new Set([...ba.keys(), ...bb.keys()])) {
      const realA = ba.get(role);
      const realB = bb.get(role);
      const la = realA ?? ba.get("torso")!;
      const lb = realB ?? bb.get("torso")!;

      // Greedy nearest matching so counterparts that sit close morph into
      // each other; leftovers split off from / merge into their closest match.
      const cands: { a: Info; b: Info; cost: number }[] = [];
      for (const a of la) {
        for (const b of lb) {
          cands.push({
            a,
            b,
            cost: Math.hypot(a.cx - b.cx, a.cy - b.cy) + 0.35 * Math.abs(a.len - b.len),
          });
        }
      }
      cands.sort((p, q) => p.cost - q.cost);
      const usedA = new Set<number>();
      const usedB = new Set<number>();
      for (const c of cands) {
        if (usedA.has(c.a.idx) || usedB.has(c.b.idx)) continue;
        usedA.add(c.a.idx);
        usedB.add(c.b.idx);
        push(c.a, c.b);
      }
      if (realA) for (const a of realA) if (!usedA.has(a.idx)) push(a, nearest(a, lb));
      if (realB) for (const b of realB) if (!usedB.has(b.idx)) push(nearest(b, la), b);
    }
    return out;
  }

  function pairsFor(ai: number, bi: number): Pair[] {
    const key = `${ai}|${bi}`;
    let pairs = pairCache.get(key);
    if (!pairs) {
      pairs = buildPairs(ai, bi);
      pairCache.set(key, pairs);
    }
    return pairs;
  }

  function applyStyles() {
    figures.forEach((f, i) => {
      if (!f) return;
      if (on && (i === active.a || i === active.b)) {
        f.svg.style.opacity = "0";
        if (f.prop) {
          f.prop.style.opacity =
            i === active.a
              ? String(1 - clamp(active.t / 0.3, 0, 1))
              : String(clamp((active.t - 0.7) / 0.3, 0, 1));
        }
      } else {
        f.svg.style.opacity = "";
        if (f.prop) f.prop.style.opacity = "";
      }
    });
  }

  function render() {
    raf = requestAnimationFrame(render);
    draw();
  }

  function draw() {
    const size = resizeCanvas(canvas, ctx!, stage);
    ctx!.clearRect(0, 0, size.w, size.h);
    if (!on || size.w < 2) return;

    const origin = stage.getBoundingClientRect();
    const A = figure(active.a);
    const B = figure(active.b);
    const t = active.t;
    const ink = A.ink.map((v, i) => Math.round(lerp(v, B.ink[i], t)));
    ctx!.strokeStyle = `rgb(${ink[0]}, ${ink[1]}, ${ink[2]})`;
    ctx!.lineCap = "round";
    ctx!.lineJoin = "round";

    for (const pair of pairsFor(active.a, active.b)) {
      const sa = A.strokes[pair.a];
      const sb = B.strokes[pair.b];
      const scaleA = project(sa, origin, bufA);
      const scaleB = project(sb, origin, bufB);
      if (!scaleA || !scaleB) continue;

      const tt = smooth(clamp((t - pair.lag * STAG) / (1 - STAG), 0, 1));
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < N; i++) {
        const j = pair.rev ? N - 1 - i : i;
        const x = lerp(bufA[i * 2], bufB[j * 2], tt);
        const y = lerp(bufA[i * 2 + 1], bufB[j * 2 + 1], tt);
        bufM[i * 2] = x;
        bufM[i * 2 + 1] = y;
        cx += x;
        cy += y;
      }
      cx /= N;
      cy /= N;

      // Mid-flight curl: swing each stroke around its own centroid.
      const ang = Math.sin(Math.PI * tt) * pair.amp;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      ctx!.lineWidth = Math.max(lerp(sa.width * scaleA, sb.width * scaleB, tt), 0.5);
      ctx!.beginPath();
      for (let i = 0; i < N; i++) {
        const dx = bufM[i * 2] - cx;
        const dy = bufM[i * 2 + 1] - cy;
        const x = cx + dx * cos - dy * sin;
        const y = cy + dx * sin + dy * cos;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();
    }
  }

  return {
    set(state: MorphState) {
      const next = !!state;
      if (state) {
        active = state;
        figure(state.a);
        figure(state.b);
      }
      if (next !== on) {
        on = next;
        canvas.classList.toggle("is-on", on);
        if (on) {
          // Paint synchronously so the figures never blank for a frame while
          // the SVGs hide and the first rAF tick is still pending.
          draw();
          if (!raf) raf = requestAnimationFrame(render);
        } else {
          cancelAnimationFrame(raf);
          raf = 0;
          ctx!.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      applyStyles();
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      on = false;
      applyStyles();
      canvas.remove();
    },
  };
}
