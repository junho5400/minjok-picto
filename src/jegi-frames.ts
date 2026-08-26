import { rotate } from "./play";

export type JegiPose = {
  bob: number;
  head: number;
  leftArm: number;
  rightArm: number;
  stand: number;
  kick: number;
};

export const JEGI_PIVOTS = {
  head: [74, 52],
  leftArm: [70, 70],
  rightArm: [100, 66],
  stand: [90, 198],
  kick: [96, 96],
} as const;

/** Default drawing is the peak kick; positive kick lowers the raised foot. */
export const JEGI_FRAMES: JegiPose[] = [
  { bob: 1.2, head: -2, leftArm: 6, rightArm: -8, stand: 3, kick: 38 },
  { bob: 0.4, head: -1, leftArm: 2, rightArm: -3, stand: 1, kick: 26 },
  { bob: -0.6, head: 1, leftArm: -4, rightArm: 4, stand: -1, kick: 12 },
  { bob: -1.8, head: 2.4, leftArm: -9, rightArm: 8, stand: -2, kick: 2 },
  { bob: -2.2, head: 3, leftArm: -11, rightArm: 10, stand: -3, kick: -6 },
  { bob: -1.4, head: 1.6, leftArm: -6, rightArm: 5, stand: -1, kick: 8 },
  { bob: 0.2, head: -0.4, leftArm: 1, rightArm: -2, stand: 1, kick: 22 },
  { bob: 1, head: -1.6, leftArm: 5, rightArm: -6, stand: 2, kick: 34 },
];

export const CONTACT_FRAMES = new Set([3, 4]);

export type JegiRig = {
  body: SVGGElement;
  head: SVGGElement;
  leftArm: SVGGElement;
  rightArm: SVGGElement;
  stand: SVGGElement;
  kick: SVGGElement;
};

export function applyJegiPose(rig: JegiRig, pose: JegiPose) {
  rig.body.setAttribute("transform", `translate(0 ${pose.bob.toFixed(2)})`);
  rotate(rig.head, pose.head, JEGI_PIVOTS.head);
  rotate(rig.leftArm, pose.leftArm, JEGI_PIVOTS.leftArm);
  rotate(rig.rightArm, pose.rightArm, JEGI_PIVOTS.rightArm);
  rotate(rig.stand, pose.stand, JEGI_PIVOTS.stand);
  rotate(rig.kick, pose.kick, JEGI_PIVOTS.kick);
}
