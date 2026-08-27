import { clamp, lerp, resizeCanvas } from "./play";

/** Samples per stroke. */
const N = 36;
/** Strokes keep their own shape outside this window and melt into the
 *  target shape only mid-flight. */
const BLEND_START = 0.25;
const BLEND_SPAN = 0.5;

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

/** Optional hand overrides (group:indexWithinGroup pairs, keyed by
 *  "figureA|figureB"). Matching otherwise minimizes travel, which keeps the
 *  figure together mid-flight; add a pair here only when proximity mismatches. */
const CURATED: Record<string, [string, string][]> = {};

type Stroke = {
  el: SVGGeometryElement;
  key: string;
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

type Pair = { a: number; b: number; rev: boolean };

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
    const groupCounts: Record<string, number> = {};
    for (const el of svg.querySelectorAll<SVGGeometryElement>("path")) {
      let role = "torso";
      let gid = "root";
      for (let g = el.parentElement; g && g !== (svg as unknown as HTMLElement); g = g.parentElement) {
        if (g.id) {
          gid = g.id;
          role = ROLE[g.id] ?? role;
          break;
        }
      }
      groupCounts[gid] = groupCounts[gid] ?? 0;
      strokes.push({
        el,
        key: `${gid}:${groupCounts[gid]++}`,
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
    const A = figure(ai);
    const B = figure(bi);
    const ia = describe(A);
    const ib = describe(B);

    const out: Pair[] = [];
    const push = (a: Info, b: Info) => {
      const straight = Math.hypot(a.sx - b.sx, a.sy - b.sy) + Math.hypot(a.ex - b.ex, a.ey - b.ey);
      const crossed = Math.hypot(a.sx - b.ex, a.sy - b.ey) + Math.hypot(a.ex - b.sx, a.ey - b.sy);
      out.push({ a: a.idx, b: b.idx, rev: crossed < straight });
    };

    // The hand-curated pairs first: the major shapes carry over meaningfully.
    const usedA = new Set<number>();
    const usedB = new Set<number>();
    const byKeyA = new Map(ia.map((s) => [A.strokes[s.idx].key, s]));
    const byKeyB = new Map(ib.map((s) => [B.strokes[s.idx].key, s]));
    for (const [keyA, keyB] of CURATED[`${ai}|${bi}`] ?? []) {
      const a = byKeyA.get(keyA);
      const b = byKeyB.get(keyB);
      if (!a || !b) continue;
      usedA.add(a.idx);
      usedB.add(b.idx);
      push(a, b);
    }

    // The rest match by proximity, preferring the same body part; whatever is
    // left over merges into its closest counterpart.
    const restA = ia.filter((s) => !usedA.has(s.idx));
    const restB = ib.filter((s) => !usedB.has(s.idx));
    const cands: { a: Info; b: Info; cost: number }[] = [];
    for (const a of restA) {
      for (const b of restB) {
        const penalty = a.role === b.role ? 0 : 60;
        cands.push({ a, b, cost: Math.hypot(a.cx - b.cx, a.cy - b.cy) + penalty });
      }
    }
    cands.sort((p, q) => p.cost - q.cost);
    for (const c of cands) {
      if (usedA.has(c.a.idx) || usedB.has(c.b.idx)) continue;
      usedA.add(c.a.idx);
      usedB.add(c.b.idx);
      push(c.a, c.b);
    }
    const nearest = (from: Info, list: Info[]) =>
      list.reduce((best, cur) =>
        Math.hypot(cur.cx - from.cx, cur.cy - from.cy) < Math.hypot(best.cx - from.cx, best.cy - from.cy)
          ? cur
          : best,
      );
    for (const a of ia) if (!usedA.has(a.idx)) push(a, nearest(a, ib));
    for (const b of ib) if (!usedB.has(b.idx)) push(nearest(b, ia), b);
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

    const tt = smooth(clamp(t, 0, 1));
    const u = smooth(clamp((tt - BLEND_START) / BLEND_SPAN, 0, 1));
    const thin = 1 - 0.22 * Math.sin(Math.PI * tt);

    for (const pair of pairsFor(active.a, active.b)) {
      const sa = A.strokes[pair.a];
      const sb = B.strokes[pair.b];
      const scaleA = project(sa, origin, bufA);
      const scaleB = project(sb, origin, bufB);
      if (!scaleA || !scaleB) continue;

      let cax = 0;
      let cay = 0;
      let cbx = 0;
      let cby = 0;
      for (let i = 0; i < N; i++) {
        cax += bufA[i * 2];
        cay += bufA[i * 2 + 1];
        cbx += bufB[i * 2];
        cby += bufB[i * 2 + 1];
      }
      cax /= N;
      cay /= N;
      cbx /= N;
      cby /= N;

      // The stroke's centroid travels the whole way while its shape stays
      // intact outside the mid-flight blend window.
      const cx = lerp(cax, cbx, tt);
      const cy = lerp(cay, cby, tt);
      ctx!.lineWidth = Math.max(lerp(sa.width * scaleA, sb.width * scaleB, tt) * thin, 0.5);
      ctx!.beginPath();
      for (let i = 0; i < N; i++) {
        const j = pair.rev ? N - 1 - i : i;
        const x = cx + lerp(bufA[i * 2] - cax, bufB[j * 2] - cbx, u);
        const y = cy + lerp(bufA[i * 2 + 1] - cay, bufB[j * 2 + 1] - cby, u);
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
