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
 * Dropped: that same 아랫단 hanging at standing length.
 */
const HEM_RAISED = [
  149.5, 81.55, 153.61, 94.33, 145.08, 100.5, 146.78, 114.56, 152.15, 159.22, 96.02, 206.15, 61.8,
  200.49, 44.45, 160.52, 54.39, 126.59, 70.13, 95.79,
] as const;

const HEM_DROPPED = [
  136, 176, 150, 196, 132, 214, 105, 216, 82, 218, 68, 210, 61.8, 200.49, 44.45, 160.52, 54.39,
  126.59, 70.13, 95.79,
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

export type JegiRig = {
  body: SVGGElement;
  head: SVGGElement;
  leftArm: SVGGElement;
  rightArm: SVGGElement;
  stand: SVGGElement;
  kick: SVGGElement;
  hem: SVGPathElement;
};

function hemPath(t: number) {
  const n = HEM_RAISED.map((v, i) => lerp(HEM_DROPPED[i], v, t));
  return `M${n[0]} ${n[1]}C${n[2]} ${n[3]} ${n[4]} ${n[5]} ${n[6]} ${n[7]} ${n[8]} ${n[9]} ${n[10]} ${n[11]} ${n[12]} ${n[13]} ${n[14]} ${n[15]} ${n[16]} ${n[17]} ${n[18]} ${n[19]}`;
}

export function applyJegiPose(rig: JegiRig, pose: JegiPose) {
  rig.body.setAttribute("transform", `translate(0 ${pose.bob.toFixed(2)})`);
  rotate(rig.head, pose.head, JEGI_PIVOTS.head);
  rotate(rig.leftArm, pose.leftArm, JEGI_PIVOTS.leftArm);
  rotate(rig.rightArm, pose.rightArm, JEGI_PIVOTS.rightArm);
  rotate(rig.stand, pose.stand, JEGI_PIVOTS.stand);
  rotate(rig.kick, pose.kick + (1 - pose.kickScale) * 52, JEGI_PIVOTS.kick);
  rig.hem.setAttribute("d", hemPath(pose.kickScale));
}
