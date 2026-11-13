import { expect, test } from "@playwright/test";
import { Vector3 } from "three";
import { fromAxisYear, toAxisYear, formatHistoricalYear, isAliveAt } from "../src/features/philosophy-atlas/historical-time";
import { latLonToVector3, isFacingCamera } from "../src/features/philosophy-atlas/geo-utils";
import { groupProjectedMarkers } from "../src/features/philosophy-atlas/marker-groups";
import { PHILOSOPHERS } from "../src/features/philosophy-atlas/philosophers-data";
import { existsSync } from "node:fs";
import path from "node:path";

test("historical years cross eras without a zero and include life endpoints", () => {
  expect(fromAxisYear(toAxisYear(-1) + 1)).toBe(1);
  expect(fromAxisYear(toAxisYear(1) - 1)).toBe(-1);
  for (const year of [-650, -400, -1, 1, 100, 270]) expect(fromAxisYear(toAxisYear(year))).toBe(year);
  expect(() => toAxisYear(0)).toThrow();
  expect(formatHistoricalYear(-400)).toBe("400 г. до н. э.");
  expect(formatHistoricalYear(100)).toBe("100 г. н. э.");
  const life = { birthYear: -469, deathYear: -399 };
  expect([-470, -469, -400, -399, -398].map(year => isAliveAt(life, year))).toEqual([false, true, true, true, false]);
});

test("geography matches rotated NASA sphere, poles and date line", () => {
  const near = (actual: Vector3, expected: number[]) => actual.toArray().forEach((value, i) => expect(value).toBeCloseTo(expected[i], 8));
  near(latLonToVector3(0, 0, 1), [0, 0, 1]);
  near(latLonToVector3(90, 85, 1), [0, 1, 0]);
  near(latLonToVector3(-90, 0, 1), [0, -1, 0]);
  near(latLonToVector3(0, 90, 1), [1, 0, 0]);
  near(latLonToVector3(0, -180, 1), [0, 0, -1]);
  near(latLonToVector3(0, 180, 1), [0, 0, -1]);
  for (const [lat, lon] of [[37.98, 23.73], [41.9, 12.5], [37.53, 27.28]]) {
    const point = latLonToVector3(lat, lon, 1);
    expect(Math.asin(point.y) * 180 / Math.PI).toBeCloseTo(lat, 5);
    expect(Math.atan2(point.x, point.z) * 180 / Math.PI).toBeCloseTo(lon, 5);
  }
  expect(() => latLonToVector3(91, 0)).toThrow();
  expect(isFacingCamera(new Vector3(0, 0, 1.015), new Vector3(0, 0, 4))).toBe(true);
  expect(isFacingCamera(new Vector3(0, 0, -1.015), new Vector3(0, 0, 4))).toBe(false);
  expect(isFacingCamera(new Vector3(1.015, 0, 0), new Vector3(0, 0, 4))).toBe(false);
});

test("nearby screen points group transitively without moving geographical anchors", () => {
  const points = [{ id: "b", x: 20, y: 0 }, { id: "a", x: 0, y: 0 }, { id: "c", x: 40, y: 0 }, { id: "d", x: 200, y: 0 }];
  const groups = groupProjectedMarkers(points, 25);
  expect(groups.map(group => group.ids)).toEqual([["a", "b", "c"], ["d"]]);
  expect(groups[0].anchorId).toBe("a");
  expect(points[1]).toEqual({ id: "a", x: 0, y: 0 });
  expect(groupProjectedMarkers(points, 10)).toHaveLength(4);
});

test("all fifteen catalogue records have valid dated lives, local portraits and attribution", () => {
  expect(PHILOSOPHERS).toHaveLength(15);
  expect(new Set(PHILOSOPHERS.map(person => person.id)).size).toBe(15);
  for (const person of PHILOSOPHERS) {
    expect(person.birthYear).not.toBe(0);
    expect(person.deathYear).toBeGreaterThan(person.birthYear);
    expect(latLonToVector3(person.latitude, person.longitude).length()).toBeCloseTo(1.015);
    expect(existsSync(path.join(process.cwd(), "public", person.portrait))).toBe(true);
    expect(person.credit.source).toMatch(/^https:/);
    expect(person.credit.license).toMatch(/CC BY|Public domain/);
    expect(person.source).toMatch(/^https:/);
    expect(isAliveAt(person, person.birthYear)).toBe(true);
    expect(isAliveAt(person, person.deathYear)).toBe(true);
  }
  expect(PHILOSOPHERS.filter(person => isAliveAt(person, -600)).map(person => person.id)).toEqual(["thales"]);
  expect(PHILOSOPHERS.filter(person => isAliveAt(person, 100)).map(person => person.id)).toEqual(["epictetus"]);
  expect(PHILOSOPHERS.filter(person => isAliveAt(person, 270)).map(person => person.id)).toEqual(["plotinus"]);
});
