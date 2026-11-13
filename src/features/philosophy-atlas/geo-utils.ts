import { Vector3 } from "three";

export const MARKER_RADIUS = 1.015;

// World-space orientation matches SphereGeometry with the Earth's -PI/2 Y rotation.
export function latLonToVector3(latitude: number, longitude: number, radius = MARKER_RADIUS): Vector3 {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || !Number.isFinite(radius) || radius <= 0) {
    throw new RangeError("Invalid geographic point or radius");
  }
  const lat = latitude * Math.PI / 180;
  const lon = (((longitude + 180) % 360 + 360) % 360 - 180) * Math.PI / 180;
  return new Vector3(radius * Math.cos(lat) * Math.sin(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.cos(lon));
}

export function isFacingCamera(point: Vector3, camera: Vector3): boolean {
  // Use the unit surface normal, not the raised marker point: hide behind the horizon.
  const normal = point.clone().normalize();
  return normal.dot(camera) > 1.02;
}
