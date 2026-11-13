export const FIRST_YEAR = -650;
export const LAST_YEAR = 2026;
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

export function isAliveAt(life: { birthYear: number; deathYear: number | null }, year: number): boolean {
  toAxisYear(year);
  return FIRST_YEAR <= year && year <= LAST_YEAR && life.birthYear <= year && year <= (life.deathYear ?? LAST_YEAR);
}

export type HistoricalEra = "bce" | "ce";

export function parseHistoricalYear(text: string, era: HistoricalEra): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const number = Number(trimmed);
  if (!Number.isSafeInteger(number) || number < 1) return null;
  const year = era === "bce" ? -number : number;
  return year < FIRST_YEAR || year > LAST_YEAR ? null : year;
}

export function formatLifeDates(life: { birthYear: number; deathYear: number | null; approximateBirth: boolean; approximateDeath: boolean }): string {
  const birth = `${life.approximateBirth ? "Ок. " : ""}${formatHistoricalYear(life.birthYear)}`;
  const death = life.deathYear === null ? "настоящее время" : `${life.approximateDeath ? "ок. " : ""}${formatHistoricalYear(life.deathYear)}`;
  return `${birth} — ${death}`;
}

export function philosopherCountLabel(count: number): string {
  const last = count % 10, lastTwo = count % 100;
  return `${count} ${last === 1 && lastTwo !== 11 ? "философ" : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? "философа" : "философов"}`;
}
