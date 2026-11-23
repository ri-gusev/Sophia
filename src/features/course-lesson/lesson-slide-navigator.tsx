"use client";

import { useId, useRef, useState } from "react";
import { List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IntroLesson } from "./lesson-data";
import styles from "./lesson-slide-navigator.module.css";

export function LessonSlideNavigator({ lesson, currentId, confirmed, onSelect }: {
  lesson: IntroLesson;
  currentId: string;
  confirmed: ReadonlySet<string>;
  onSelect: (id: string) => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const count = `${confirmed.size}/${lesson.scenes.length}`;

  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  function list(mobile: boolean) {
    return <ol className={styles.list}>
      {lesson.scenes.map((scene, index) => {
        const done = confirmed.has(scene.id);
        const current = scene.id === currentId;
        return <li key={scene.id}>
          <button type="button" aria-current={current ? "step" : undefined}
            onClick={() => { if (mobile) close(); onSelect(scene.id); }}>
            <span aria-hidden="true">{done ? "✓" : current ? "●" : "○"}</span>
            <span>{index + 1}. {scene.title}<small>{done ? "Пройден" : "Не пройден"}</small></span>
          </button>
        </li>;
      })}
    </ol>;
  }

  return <aside className={styles.navigator}>
    <nav className={styles.desktop} aria-label="Слайды урока">
      <p className={styles.title}>Слайды урока <small aria-label={`Пройдено ${count}`}>{count}</small></p>
      {list(false)}
    </nav>
    <Button ref={trigger} type="button" variant="outline" className={styles.trigger}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
      <List size={16} aria-hidden="true" />Слайды · {count}
    </Button>
    <dialog id={id} ref={dialog} className={styles.dialog}
      aria-labelledby={`${id}-title`}
      onCancel={event => { event.preventDefault(); close(); }}>
      <div className={styles.title}>
        <span id={`${id}-title`}>Слайды урока · {count}</span>
        <Button type="button" variant="ghost" size="sm" aria-label="Закрыть список слайдов" onClick={close}>
          <X size={18} aria-hidden="true" />
        </Button>
      </div>
      {list(true)}
    </dialog>
  </aside>;
}
