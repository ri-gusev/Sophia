export const FIRST_YEAR = -650;
export const LAST_YEAR = 270;
export const INITIAL_YEAR = -400;

export function toAxisYear(year: number): number {
  if (!Number.isInteger(year) || year === 0) throw new RangeError("Historical years must be nonzero integers");
  return year > 0 ? year - 1 : year;
}

export function fromAxisYear(value: number): number {
  if (!Number.isInteger(value)) throw new RangeError("Timeline positions must be integers");
  return value >= 0 ? value + 1 : value;
}

export function formatHistoricalYear(year: number): string {
  toAxisYear(year);
  return `${Math.abs(year)} г. ${year < 0 ? "до н. э." : "н. э."}`;
}

export function isAliveAt(life: { birthYear: number; deathYear: number }, year: number): boolean {
  toAxisYear(year);
  return life.birthYear <= year && year <= life.deathYear;
}

export function philosopherCountLabel(count: number): string {
  const last = count % 10, lastTwo = count % 100;
  return `${count} ${last === 1 && lastTwo !== 11 ? "философ" : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? "философа" : "философов"}`;
}
