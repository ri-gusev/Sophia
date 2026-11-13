"use client";

import { useEffect, useRef } from "react";
import { X, MapPin } from "lucide-react";
import { formatLifeDates } from "./historical-time";
import type { AtlasPhilosopher } from "./philosophers-data";
import { PhilosopherPortrait } from "./philosopher-portrait";
import styles from "./philosopher-card.module.css";

export function PhilosopherCard({ philosophers, onChoose, onClose }: { philosophers: readonly AtlasPhilosopher[]; onChoose: (id: string) => void; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { close.current?.focus({ preventScroll: true }); }, []);
  const choose = (id: string) => {
    // The list button disappears on selection; keep focus on a persistent control.
    // Do this only for an explicit choice, so changing the year keeps slider focus.
    close.current?.focus({ preventScroll: true });
    onChoose(id);
  };
  const person = philosophers.length === 1 ? philosophers[0] : null;
  return <aside className={styles.card} aria-label="Карточка философа" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <button ref={close} type="button" className={styles.close} aria-label="Закрыть карточку" onClick={onClose}><X size={17} aria-hidden="true" /></button>
    {person ? <>
      <div className={styles.portrait}><PhilosopherPortrait person={person} size={96} alt={`Изображение: ${person.name}`} /></div>
      <h2>{person.name}</h2>
      <p className={styles.dates}>{formatLifeDates(person)}</p>
      <p className={styles.school}>{person.school}</p>
      <p className={styles.description}>{person.description}</p>
      <p className={styles.place}><MapPin size={13} aria-hidden="true" />{person.place}</p>
      <p className={styles.note}>{person.locationType === "birth" ? "Место рождения" : person.locationType === "activity" ? "Место философской деятельности" : "Историческая привязка"}. {person.locationNote} Географическая привязка приблизительна и не показывает перемещения по годам.</p>
    </> : <>
      <span className="eyebrow">В одной области</span><h2 className={styles.groupTitle}>Философы рядом</h2><p className={styles.note}>Выбери портрет, чтобы узнать больше. Приблизь Землю, чтобы разделить близкие города.</p>
      <ul className={styles.list}>{philosophers.map(item => <li key={item.id}><button type="button" aria-label={item.name} onClick={() => choose(item.id)}><PhilosopherPortrait person={item} size={48} /><span>{item.name}<small>{item.school}</small></span></button></li>)}</ul>
    </>}
  </aside>;
}
