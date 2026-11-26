import { calendarDay, isoDate, labelForDay } from "../philosophy-question/daily-calendar.ts";

const daysInActivityCalendar = 365;
const monthName = new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" });

export function buildProfileActivityCalendar(today: string, activity: Readonly<Record<string, number>>) {
  const end = calendarDay(today);
  if (end === null) throw new RangeError("Expected a calendar date in YYYY-MM-DD format");

  const start = end - daysInActivityCalendar + 1;
  const firstWeekday = (new Date(isoDate(start)).getUTCDay() + 6) % 7;
  const days = Array.from({ length: daysInActivityCalendar }, (_, index) => {
    const day = start + index;
    const date = isoDate(day);
    const gridOffset = firstWeekday + index;
    const count = activity[date] ?? 0;
    return {
      date,
      label: labelForDay(day),
      week: Math.floor(gridOffset / 7) + 1,
      weekday: gridOffset % 7 + 1,
      count,
      level: Math.min(count, 4),
    };
  });
  const monthStarts = days.filter(day => day.date.endsWith("-01"));
  // A short fragment at the left edge has no room for a second month label.
  if (monthStarts[0].week >= 4) monthStarts.unshift(days[0]);
  const months = monthStarts.map(({ date, week }) => ({
    date,
    week,
    label: monthName.format(new Date(date)).replace(/\.$/, ""),
  }));

  return { days, months, weeks: days[days.length - 1].week };
}
