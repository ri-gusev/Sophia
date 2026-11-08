export const EARTH_TEXTURE = "/textures/earth/earth-day.jpg";
export const MIN_DISTANCE = 1.35;
export const MAX_DISTANCE = 12;
export const CAMERA_FOV = 40;

// Fit a unit sphere in the narrower field of view, leaving room around its edge.
export function initialDistance(aspect: number) {
  const vertical = CAMERA_FOV * Math.PI / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return Math.min(MAX_DISTANCE, 1.16 / Math.sin(Math.min(vertical, horizontal) / 2));
}

export type AtlasAction = { kind: "in" | "out" | "reset" | "left" | "right" | "up" | "down"; sequence: number };
export type ZoomLimits = { near: boolean; far: boolean };
