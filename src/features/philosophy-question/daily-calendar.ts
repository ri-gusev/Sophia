const dayMs = 86_400_000;
export const cycleStartDay = Date.UTC(2026, 10, 25) / dayMs;

const moscowDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit",
});
const moscowOffset = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Moscow", timeZoneName: "longOffset",
});
const displayDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone: "UTC" });

export function getMoscowDay(now = Date.now()) {
  const parts = moscowDate.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / dayMs;
}

export function isoDate(day: number) {
  return new Date(day * dayMs).toISOString().slice(0, 10);
}

export function calendarDay(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && isoDate(time / dayMs) === date ? time / dayMs : null;
}

export function labelForDay(day: number) {
  return displayDate.format(day * dayMs);
}

export function nextMoscowMidnight(day: number) {
  const wallTime = (day + 1) * dayMs;
  const label = moscowOffset.formatToParts(wallTime).find(part => part.type === "timeZoneName")?.value;
  const offset = label?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  const minutes = offset ? (offset[1] === "-" ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3])) : 0;
  return wallTime - minutes * 60_000;
}
