export type Vec = { x: number; y: number };

type Node = { x: number; y: number; px: number; py: number };

const ITERATIONS = 10;

export class Ribbon {
  private nodes: Node[] = [];
  private segment = 6;

  constructor(private readonly count: number) {}

  reset(at: Vec) {
    this.nodes = Array.from({ length: this.count }, () => ({
      x: at.x,
      y: at.y,
      px: at.x,
      py: at.y,
    }));
  }

  /**
   * Anchor stays pinned to the hat and the tip is pinned to the pointer, so all
   * slack has to coil up in between. That coil is what reads as the spin.
   */
  update(anchor: Vec, tip: Vec, ropeLength: number) {
    if (!this.nodes.length) this.reset(anchor);

    const span = Math.hypot(tip.x - anchor.x, tip.y - anchor.y);
    this.segment = Math.max(ropeLength, span * 1.12) / (this.count - 1);

    for (let i = 1; i < this.nodes.length - 1; i++) {
      const n = this.nodes[i];
      const vx = (n.x - n.px) * 0.94;
      const vy = (n.y - n.py) * 0.94;
      n.px = n.x;
      n.py = n.y;
      n.x += vx;
      n.y += vy + 0.06 * this.segment;
    }

    const last = this.nodes[this.nodes.length - 1];
    last.px = last.x;
    last.py = last.y;
    last.x = tip.x;
    last.y = tip.y;

    const first = this.nodes[0];
    first.x = anchor.x;
    first.y = anchor.y;

    for (let k = 0; k < ITERATIONS; k++) {
      for (let i = 0; i < this.nodes.length - 1; i++) {
        const a = this.nodes[i];
        const b = this.nodes[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const shift = (dist - this.segment) / dist / 2;
        const ox = dx * shift;
        const oy = dy * shift;
        const aFixed = i === 0;
        const bFixed = i === this.nodes.length - 2;

        if (!aFixed) {
          a.x += ox * (bFixed ? 2 : 1);
          a.y += oy * (bFixed ? 2 : 1);
        }
        if (!bFixed) {
          b.x -= ox * (aFixed ? 2 : 1);
          b.y -= oy * (aFixed ? 2 : 1);
        }
      }
      first.x = anchor.x;
      first.y = anchor.y;
      last.x = tip.x;
      last.y = tip.y;
    }
  }

  draw(ctx: CanvasRenderingContext2D, color: string, scale: number, glow: number) {
    if (this.nodes.length < 3) return;

    const head = 3.4 * scale;
    const tail = 0.9 * scale;
    const left: Vec[] = [];
    const right: Vec[] = [];

    for (let i = 0; i < this.nodes.length; i++) {
      const prev = this.nodes[Math.max(0, i - 1)];
      const next = this.nodes[Math.min(this.nodes.length - 1, i + 1)];
      const tx = next.x - prev.x;
      const ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 0.0001;
      const t = i / (this.nodes.length - 1);
      const half = (head + (tail - head) * Math.pow(t, 0.65)) / 2;
      const nx = (-ty / len) * half;
      const ny = (tx / len) * half;
      left.push({ x: this.nodes[i].x + nx, y: this.nodes[i].y + ny });
      right.push({ x: this.nodes[i].x - nx, y: this.nodes[i].y - ny });
    }

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = (6 + glow * 22) * scale;
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fill();

    const tip = this.nodes[this.nodes.length - 1];
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, tail * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
