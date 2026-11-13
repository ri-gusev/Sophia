"use client";

import { FIRST_YEAR, LAST_YEAR, formatHistoricalYear, fromAxisYear, philosopherCountLabel, toAxisYear } from "./historical-time";
import styles from "./timeline.module.css";

const ticks = [-650, -600, -500, -400, -300, -200, -100, 1, 100, 200, 270];
const periods = [{ name: "Архаическая Греция", shortName: "Архаика", start: -650, end: -480 }, { name: "Классическая Греция", shortName: "Классика", start: -480, end: -323 }, { name: "Эллинизм", shortName: "Эллинизм", start: -323, end: -31 }, { name: "Римский мир", shortName: "Рим", start: -31, end: 270 }];
const span = toAxisYear(LAST_YEAR) - toAxisYear(FIRST_YEAR);
const percent = (year: number) => (toAxisYear(year) - toAxisYear(FIRST_YEAR)) / span * 100;

export function Timeline({ year, count, onYearChange }: { year: number; count: number; onYearChange: (year: number) => void }) {
  return <section className={styles.timeline} aria-label="Историческая шкала">
    <div className={styles.heading}><div><span className="eyebrow">Путешествие во времени</span><p data-testid="selected-year" className={styles.year}>{formatHistoricalYear(year)}</p></div><p className={styles.count}><span data-testid="philosopher-count">{philosopherCountLabel(count)}</span><span>живут в выбранном году</span></p></div>
    <label className={styles.srOnly} htmlFor="atlas-year">Год на исторической шкале</label>
    <input id="atlas-year" type="range" min={toAxisYear(FIRST_YEAR)} max={toAxisYear(LAST_YEAR)} step={1} value={toAxisYear(year)} onChange={event => onYearChange(fromAxisYear(Number(event.target.value)))} aria-valuetext={formatHistoricalYear(year)} style={{ "--progress": `${percent(year)}%` } as React.CSSProperties} />
    <div className={styles.ticks} aria-hidden="true">{ticks.map((tick, index) => <span key={tick} className={index === 0 ? styles.first : index === ticks.length - 1 ? styles.last : undefined} style={{ left: `${percent(tick)}%` }}>{tick === 1 ? "1 н. э." : tick < 0 ? `${-tick}${tick === -650 ? "\nдо н. э." : ""}` : tick}</span>)}</div>
    <div className={styles.periods} aria-label="Условные исторические периоды">{periods.map(period => <div key={period.name} title={period.name} style={{ flex: toAxisYear(period.end) - toAxisYear(period.start) }} data-active={year >= period.start && year <= period.end}><span className={styles.periodFull}>{period.name}</span><span className={styles.periodShort}>{period.shortName}</span></div>)}</div>
    <p className={styles.note}>{count === 0 ? "В каталоге пока нет философов, живших в этом году. " : ""}Выбери год, затем нажми на портрет или группу на Земле.</p>
  </section>;
}
