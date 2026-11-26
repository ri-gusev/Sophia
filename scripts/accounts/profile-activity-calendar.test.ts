import assert from "node:assert/strict";
import test from "node:test";
import { buildProfileActivityCalendar } from "../../src/features/account/profile-activity-calendar.ts";

test("includes exactly 365 dates ending today and leaves future days out of the grid", () => {
  const { days, weeks, months } = buildProfileActivityCalendar("2026-11-26", {
    "2025-11-26": 1,
    "2026-11-27": 2,
  });
  assert.equal(days.length, 365);
  assert.equal(new Set(days.map(day => day.date)).size, 365);
  assert.equal(weeks, 53);
  assert.deepEqual(
    [days[0], days.at(-1)].map(day => [day?.date, day?.week, day?.weekday, day?.level]),
    [["2025-11-27", 1, 4, 0], ["2026-11-26", 53, 4, 0]],
  );
  assert.deepEqual(months.map(month => month.date), [
    "2025-12-01", "2026-01-01", "2026-02-01", "2026-03-01",
    "2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01",
    "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01",
  ]);
});

test("preserves leap day and aligns a Monday in the next column across New Year", () => {
  const { days, months } = buildProfileActivityCalendar("2024-03-01", {});
  const previousYear = days.find(day => day.date === "2023-12-31");
  const newYear = days.find(day => day.date === "2024-01-01");
  const january = months.find(month => month.date === "2024-01-01");
  assert.equal(previousYear?.weekday, 7);
  assert.equal(newYear?.weekday, 1);
  assert.equal(newYear?.week, (previousYear?.week ?? 0) + 1);
  assert.equal(january?.week, newYear?.week);
  assert.deepEqual(days.slice(-3).map(day => [day.date, day.weekday]), [
    ["2024-02-28", 3], ["2024-02-29", 4], ["2024-03-01", 5],
  ]);
});

test("uses five intensity levels while preserving the exact tooltip count", () => {
  const { days } = buildProfileActivityCalendar("2026-11-26", {
    "2026-11-22": 1,
    "2026-11-23": 2,
    "2026-11-24": 3,
    "2026-11-25": 4,
    "2026-11-26": 12,
  });
  assert.deepEqual(days.slice(-6).map(day => [day.count, day.level]), [
    [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [12, 4],
  ]);
});
