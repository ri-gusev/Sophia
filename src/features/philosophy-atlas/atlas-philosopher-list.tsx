import type { Ref } from "react";
import type { AtlasPhilosopher } from "./philosophers-data";
import styles from "./philosophy-atlas.module.css";

export function AtlasPhilosopherList({ philosophers, onSelect, unavailable, summaryRef }: {
  philosophers: readonly AtlasPhilosopher[];
  onSelect: (ids: string[], button: HTMLButtonElement) => void;
  unavailable: boolean;
  summaryRef: Ref<HTMLElement>;
}) {
  return <details className={styles.catalog} open={unavailable || undefined}>
    <summary ref={summaryRef}>Философы выбранного года <span className={styles.catalogCount}>{philosophers.length}</span></summary>
    {philosophers.length ? <ul className={styles.catalogList}>
      {philosophers.map(person => <li key={person.id}>
        <button type="button" onClick={event => onSelect([person.id], event.currentTarget)}>
          <strong>{person.name}</strong>
          <small>{person.school}</small>
        </button>
      </li>)}
    </ul> : <p className={styles.catalogEmpty}>В выбранном году в каталоге пока нет философов.</p>}
  </details>;
}
