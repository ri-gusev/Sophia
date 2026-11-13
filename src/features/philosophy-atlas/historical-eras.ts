import { FIRST_YEAR, LAST_YEAR, toAxisYear } from "./historical-time";

export const HISTORICAL_ERAS = [
  { id: "antiquity", name: "Античность", shortName: "Античность", start: FIRST_YEAR, end: 499, jumpYear: -400 },
  { id: "medieval", name: "Средневековье", shortName: "Средневековье", start: 500, end: 1399, jumpYear: 1200 },
  { id: "renaissance", name: "Возрождение", shortName: "Возрождение", start: 1400, end: 1599, jumpYear: 1500 },
  { id: "early-modern", name: "Новое время и Просвещение", shortName: "Новое время", start: 1600, end: 1800, jumpYear: 1750 },
  { id: "nineteenth", name: "XIX век", shortName: "XIX век", start: 1801, end: 1900, jumpYear: 1850 },
  { id: "twentieth", name: "XX век", shortName: "XX век", start: 1901, end: 2000, jumpYear: 1950 },
  { id: "contemporary", name: "XXI век", shortName: "XXI век", start: 2001, end: LAST_YEAR, jumpYear: LAST_YEAR },
] as const;

export function getHistoricalEra(year: number) {
  toAxisYear(year);
  const era = HISTORICAL_ERAS.find(item => year >= item.start && year <= item.end);
  if (!era) throw new RangeError("Year outside the atlas range");
  return era;
}
