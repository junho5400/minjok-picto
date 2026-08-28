import { lerp, rotate } from "./play";

export type JegiPose = {
  bob: number;
  head: number;
  leftArm: number;
  rightArm: number;
  stand: number;
  kick: number;
  /** 1 = drawn high kick; lower values drop the hiked skirt hem with the foot. */
  kickScale: number;
};

export const JEGI_PIVOTS = {
  head: [74, 52],
  leftArm: [70, 70],
  rightArm: [100, 66],
  stand: [90, 198],
  kick: [90, 112],
} as const;

/**
 * Skirt outline as absolute cubics.
 * Raised: right hem pulled up to the kicking foot.
 * Dropped: that same hem hanging at standing length.
 */
const HEM_RAISED = [
  149.5, 81.55, 153.61, 94.33, 145.08, 100.5, 146.78, 114.56, 152.15, 159.22, 96.02, 206.15, 61.8,
  200.49, 44.45, 160.52, 54.39, 126.59, 70.13, 95.79,
] as const;

const HEM_DROPPED = [
  152.7, 157.8, 158, 182, 132, 214, 105, 216, 82, 218, 68, 210, 61.8, 200.49, 44.45, 160.52, 54.39,
  126.59, 70.13, 95.79,
] as const;

/** Skirt fold lines from the waist: aimed at the lifted hem when raised,
 *  draped onto the extended leg when the foot drops. [sx,sy,c1x,c1y,c2x,c2y,ex,ey] */
const FOLD1_RAISED = [97.45, 89.09, 101.24, 90.99, 108.6, 96.19, 108.6, 96.19] as const;
const FOLD1_DROPPED = [97.45, 89.09, 101, 98, 106.5, 110, 107.8, 119] as const;
const FOLD2_RAISED = [92.62, 91.68, 96.43, 95.11, 103.59, 103.87, 103.59, 103.87] as const;
const FOLD2_DROPPED = [92.62, 91.68, 95.5, 100, 99.5, 113, 100.3, 122] as const;

/** Standing leg + shoe outline: its two upper edges tuck under the hem as the
 *  skirt drops so the leg never pokes through the fabric. */
const STAND_RAISED = [
  95.24, 194.7, 95.24, 194.7, 90.8, 210.98, 90.8, 212.59, 90.8, 214.29, 94.22, 220, 98.69, 224.51,
  103.16, 229.03, 90.75, 230.16, 86.83, 226.76, 82.92, 223.36, 80.61, 221.56, 79.51, 220.08, 78.4,
  218.6, 80.52, 214.48, 81.54, 213.04, 82.55, 211.59, 82.05, 199.33, 82.05, 199.33,
] as const;
const STAND_DROPPED = [
  92, 209.5, 91.4, 211, 90.9, 212.2, 90.8, 212.59, 90.8, 214.29, 94.22, 220, 98.69, 224.51, 103.16,
  229.03, 90.75, 230.16, 86.83, 226.76, 82.92, 223.36, 80.61, 221.56, 79.51, 220.08, 78.4, 218.6,
  80.52, 214.48, 81.54, 213.04, 81.9, 212.5, 82.05, 211, 82.2, 209.5,
] as const;

export const JEGI_FRAMES: JegiPose[] = [
  { bob: 0.8, head: -1.2, leftArm: 4, rightArm: -5, stand: 2, kick: 8, kickScale: 0.22 },
  { bob: 0.2, head: -0.4, leftArm: 1, rightArm: -2, stand: 1, kick: 5, kickScale: 0.4 },
  { bob: -0.6, head: 1, leftArm: -3, rightArm: 3, stand: -1, kick: 2, kickScale: 0.62 },
  { bob: -1.4, head: 2, leftArm: -7, rightArm: 6, stand: -2, kick: -2, kickScale: 0.86 },
  { bob: -1.8, head: 2.4, leftArm: -9, rightArm: 8, stand: -2, kick: -6, kickScale: 1 },
  { bob: -1.0, head: 1.2, leftArm: -5, rightArm: 4, stand: -1, kick: -1, kickScale: 0.78 },
  { bob: 0.1, head: -0.2, leftArm: 1, rightArm: -1, stand: 1, kick: 4, kickScale: 0.48 },
  { bob: 0.6, head: -1, leftArm: 3, rightArm: -4, stand: 2, kick: 7, kickScale: 0.3 },
];

export const CONTACT_FRAMES = new Set([3, 4]);

/** Shrink a swing frame toward the wind-up pose: 1 keeps the full drawn arc,
 *  lower values lift the foot (and the hiked hem) proportionally less. */
export function scaleJegiPose(pose: JegiPose, k: number): JegiPose {
  const base = JEGI_FRAMES[0];
  return {
    bob: lerp(base.bob, pose.bob, k),
    head: lerp(base.head, pose.head, k),
    leftArm: lerp(base.leftArm, pose.leftArm, k),
    rightArm: lerp(base.rightArm, pose.rightArm, k),
    stand: lerp(base.stand, pose.stand, k),
    kick: lerp(base.kick, pose.kick, k),
    kickScale: lerp(base.kickScale, pose.kickScale, k),
  };
}

export type JegiRig = {
  body: SVGGElement;
  head: SVGGElement;
  leftArm: SVGGElement;
  rightArm: SVGGElement;
  stand: SVGGElement;
  kick: SVGGElement;
  hem: SVGPathElement;
  fold1?: SVGPathElement | null;
  fold2?: SVGPathElement | null;
  standLeg?: SVGPathElement | null;
};

function hemPath(t: number) {
  const n = HEM_RAISED.map((v, i) => lerp(HEM_DROPPED[i], v, t));
  return `M${n[0]} ${n[1]}C${n[2]} ${n[3]} ${n[4]} ${n[5]} ${n[6]} ${n[7]} ${n[8]} ${n[9]} ${n[10]} ${n[11]} ${n[12]} ${n[13]} ${n[14]} ${n[15]} ${n[16]} ${n[17]} ${n[18]} ${n[19]}`;
}

/** Lerp two same-shaped point lists into "M x y C ..." (one C per 6 numbers). */
function foldPath(dropped: readonly number[], raised: readonly number[], t: number) {
  const n = raised.map((v, i) => lerp(dropped[i], v, t));
  let d = `M${n[0]} ${n[1]}`;
  for (let i = 2; i < n.length; i += 6) {
    d += `C${n[i]} ${n[i + 1]} ${n[i + 2]} ${n[i + 3]} ${n[i + 4]} ${n[i + 5]}`;
  }
  return d;
}

export function applyJegiPose(rig: JegiRig, pose: JegiPose) {
  rig.body.setAttribute("transform", `translate(0 ${pose.bob.toFixed(2)})`);
  rotate(rig.head, pose.head, JEGI_PIVOTS.head);
  rotate(rig.leftArm, pose.leftArm, JEGI_PIVOTS.leftArm);
  rotate(rig.rightArm, pose.rightArm, JEGI_PIVOTS.rightArm);
  rotate(rig.stand, pose.stand, JEGI_PIVOTS.stand);
  rotate(rig.kick, pose.kick + (1 - pose.kickScale) * 52, JEGI_PIVOTS.kick);
  rig.hem.setAttribute("d", hemPath(pose.kickScale));
  rig.fold1?.setAttribute("d", foldPath(FOLD1_DROPPED, FOLD1_RAISED, pose.kickScale));
  rig.fold2?.setAttribute("d", foldPath(FOLD2_DROPPED, FOLD2_RAISED, pose.kickScale));
  rig.standLeg?.setAttribute("d", foldPath(STAND_DROPPED, STAND_RAISED, pose.kickScale));
}
