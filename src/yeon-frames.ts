import { rotate } from "./play";

export type YeonPose = {
  bob: number;
  head: number;
  rightArm: number;
  legs: number;
  foot: number;
};

export const YEON_PIVOTS = {
  head: [66, 242],
  rightArm: [86, 268],
  legs: [72, 372],
  foot: [48, 448],
} as const;

/** Drawn arm already points up-right toward a high kite. */
export const ARM_REST_DEG = -46;

export const YEON_FRAMES: YeonPose[] = [
  { bob: 0, head: 0, rightArm: 0, legs: 0, foot: 0 },
  { bob: -1.2, head: 2.2, rightArm: 4, legs: 2.4, foot: -7 },
  { bob: -2, head: 3.4, rightArm: 7, legs: 3.8, foot: -11 },
  { bob: -1.2, head: 2.2, rightArm: 4, legs: 2.6, foot: -7 },
  { bob: 0, head: 0, rightArm: 0, legs: 0, foot: 0 },
  { bob: -1, head: -2, rightArm: -5, legs: -2.2, foot: 6 },
  { bob: -1.8, head: -3.2, rightArm: -8, legs: -3.6, foot: 10 },
  { bob: -1, head: -2, rightArm: -5, legs: -2.4, foot: 6 },
];

export type YeonRig = {
  body: SVGGElement;
  head: SVGGElement;
  rightArm: SVGGElement;
  legs: SVGGElement;
  foot: SVGGElement;
};

export function applyYeonPose(rig: YeonRig, pose: YeonPose, armFollow: number) {
  rig.body.setAttribute("transform", `translate(0 ${pose.bob.toFixed(2)})`);
  rotate(rig.head, pose.head, YEON_PIVOTS.head);
  rotate(rig.rightArm, pose.rightArm + armFollow, YEON_PIVOTS.rightArm);
  rotate(rig.legs, pose.legs, YEON_PIVOTS.legs);
  rotate(rig.foot, pose.foot, YEON_PIVOTS.foot);
}
