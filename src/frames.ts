/**
 * The dancer is animated as discrete drawn frames: each pose nudges a few SVG
 * groups by a fixed amount and the loop steps between them, so the figure reads
 * as hand-drawn cels rather than a smooth tween.
 */
export type Pose = {
  bob: number;
  head: number;
  leftArm: number;
  rightArm: number;
  legs: number;
  foot: number;
};

export const PIVOTS = {
  head: [35.5, 33],
  leftArm: [31.5, 36.5],
  rightArm: [39, 39],
  legs: [34, 54],
  foot: [40, 86],
} as const;

export const FRAMES: Pose[] = [
  { bob: 0, head: 0, leftArm: 0, rightArm: 0, legs: 0, foot: 0 },
  { bob: -1.1, head: 1.6, leftArm: -5, rightArm: 4, legs: 2, foot: -6 },
  { bob: -1.9, head: 2.6, leftArm: -9, rightArm: 7, legs: 3.5, foot: -10 },
  { bob: -1.1, head: 1.6, leftArm: -6, rightArm: 5, legs: 2.5, foot: -7 },
  { bob: 0, head: 0, leftArm: 0, rightArm: 0, legs: 0, foot: 0 },
  { bob: -1, head: -1.6, leftArm: 5, rightArm: -4, legs: -2, foot: 5 },
  { bob: -1.8, head: -2.6, leftArm: 8, rightArm: -7, legs: -3.5, foot: 9 },
  { bob: -1, head: -1.6, leftArm: 5, rightArm: -5, legs: -2.5, foot: 6 },
];

export type Rig = {
  body: SVGGElement;
  head: SVGGElement;
  leftArm: SVGGElement;
  rightArm: SVGGElement;
  legs: SVGGElement;
  foot: SVGGElement;
};

function rotate(el: SVGGElement, angle: number, pivot: readonly [number, number]) {
  el.setAttribute("transform", `rotate(${angle.toFixed(2)} ${pivot[0]} ${pivot[1]})`);
}

export function applyPose(rig: Rig, pose: Pose) {
  rig.body.setAttribute("transform", `translate(0 ${pose.bob.toFixed(2)})`);
  rotate(rig.head, pose.head, PIVOTS.head);
  rotate(rig.leftArm, pose.leftArm, PIVOTS.leftArm);
  rotate(rig.rightArm, pose.rightArm, PIVOTS.rightArm);
  rotate(rig.legs, pose.legs, PIVOTS.legs);
  rotate(rig.foot, pose.foot, PIVOTS.foot);
}
