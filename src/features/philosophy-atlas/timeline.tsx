"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FIRST_YEAR, LAST_YEAR, formatHistoricalYear, fromAxisYear, philosopherCountLabel, toAxisYear, parseHistoricalYear, type HistoricalEra } from "./historical-time";
import { HISTORICAL_ERAS, getHistoricalEra } from "./historical-eras";
import styles from "./timeline.module.css";

const ticks = [-650, -400, 1, 500, 1000, 1500, 1750, LAST_YEAR];
const span = toAxisYear(LAST_YEAR) - toAxisYear(FIRST_YEAR);
const percent = (year: number) => (toAxisYear(year) - toAxisYear(FIRST_YEAR)) / span * 100;
const makeDraft = (year: number) => ({ selectedYear: year, text: String(Math.abs(year)), era: (year < 0 ? "bce" : "ce") as HistoricalEra });

export function Timeline({ year, count, onYearChange }: { year: number; count: number; onYearChange: (year: number) => void }) {
  const [draft, setDraft] = useState(() => makeDraft(year));
  const [error, setError] = useState<string | null>(null);
  // A draft is editable text, not a second selected year. External changes stay in sync.
  const currentDraft = draft.selectedYear === year ? draft : makeDraft(year);
  const activeEra = getHistoricalEra(year);
  const navigate = (next: number) => { setDraft(makeDraft(next)); setError(null); onYearChange(next); };
  return <section className={styles.timeline} aria-label="Историческая шкала">
    <div className={styles.heading}>
      <div><span className="eyebrow">Путешествие во времени</span><p data-testid="selected-year" className={styles.year}>{formatHistoricalYear(year)}</p></div>
      <form className={styles.exactYear} noValidate onSubmit={event => {
        event.preventDefault();
        const parsed = parseHistoricalYear(currentDraft.text, currentDraft.era);
        if (parsed === null) { setError("Введите целый год от 650 до н. э. до 2026 н. э. Исторического нулевого года нет."); return; }
        navigate(parsed);
      }}>
        <label className={styles.srOnly} htmlFor="atlas-exact-year">Точный год</label>
        <input id="atlas-exact-year" className={styles.exactInput} type="text" inputMode="numeric" value={currentDraft.text} aria-invalid={!!error} aria-describedby={error ? "atlas-year-error" : undefined} onChange={event => { setDraft({ ...currentDraft, text: event.target.value }); setError(null); }} />
        <label className={styles.srOnly} htmlFor="atlas-year-era">Эра года</label>
        <select id="atlas-year-era" value={currentDraft.era} onChange={event => { setDraft({ ...currentDraft, era: event.target.value as HistoricalEra }); setError(null); }}><option value="bce">до н. э.</option><option value="ce">н. э.</option></select>
        <Button type="submit" variant="outline" size="sm" className={styles.go}>Перейти</Button>
      </form>
      <p className={styles.count}><span data-testid="philosopher-count">{philosopherCountLabel(count)}</span><span>жили в выбранном году</span></p>
    </div>
    {error && <p id="atlas-year-error" className={styles.error} role="alert">{error}</p>}
    <label className={styles.srOnly} htmlFor="atlas-year">Год на исторической шкале</label>
    <input id="atlas-year" type="range" min={toAxisYear(FIRST_YEAR)} max={toAxisYear(LAST_YEAR)} step={1} value={toAxisYear(year)} onChange={event => navigate(fromAxisYear(Number(event.target.value)))} aria-valuetext={formatHistoricalYear(year)} style={{ "--progress": `${percent(year)}%` } as React.CSSProperties} />
    <div className={styles.ticks} aria-hidden="true">{ticks.map((tick, index) => <span key={tick} className={index === 0 ? styles.first : index === ticks.length - 1 ? styles.last : undefined} style={{ left: `${percent(tick)}%` }}>{tick === 1 ? "1 н. э." : tick < 0 ? `${-tick}${tick === -650 ? "\nдо н. э." : ""}` : tick}</span>)}</div>
    <nav className={styles.periods} aria-label="Эпохи философии">{HISTORICAL_ERAS.map(era => <button type="button" key={era.id} aria-label={era.name} title={`Перейти: ${formatHistoricalYear(era.jumpYear)}`} aria-pressed={activeEra.id === era.id} onClick={() => navigate(era.jumpYear)}>{era.shortName}</button>)}</nav>
    <label className={styles.srOnly} htmlFor="atlas-era-jump">Перейти к эпохе</label>
    <select id="atlas-era-jump" className={styles.eraSelect} value={activeEra.id} onChange={event => { const next = HISTORICAL_ERAS.find(era => era.id === event.target.value); if (next) navigate(next.jumpYear); }}>{HISTORICAL_ERAS.map(era => <option key={era.id} value={era.id}>{era.name}</option>)}</select>
    <p className={styles.note}>{count === 0 ? "В каталоге пока нет философов, живших в этом году. " : ""}Выбери год, затем нажми на портрет или группу на Земле.</p>
  </section>;
}
