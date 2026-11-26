"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReaderStorage } from "./reader-storage";
import { readerHref, type ReaderWork } from "./reader-types";
import styles from "./library.module.css";

type LibraryWork = Pick<ReaderWork, "id" | "title" | "author" | "epoch" | "description" | "cover" | "unavailableReason"> &
  { available: boolean };
const filters = ["Все", "Читаю", "Прочитано"] as const;

function normalized(text: string) {
  return text.normalize("NFC").toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
}

export function Library({ works }: { works: LibraryWork[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("Все");
  const { works: states, ready } = useReaderStorage();
  const terms = normalized(query).split(/\s+/);
  const matching = works.filter(work => {
    const state = states[work.id];
    const text = normalized(work.title + " " + work.author);
    return terms.every(term => text.includes(term)) &&
      (filter === "Все" || (filter === "Прочитано" ? state?.completed : state?.position && !state.completed));
  }).sort((a, b) => {
    const aDate = states[a.id]?.lastActivityAt ?? "";
    const bDate = states[b.id]?.lastActivityAt ?? "";
    return bDate.localeCompare(aDate);
  });

  return <main id="main" tabIndex={-1} className={styles.library}>
    <div className="container">
      <header className={styles.intro}>
        <h1>Библиотека</h1>
        <p>Диалог с великими умами прошлого</p>
      </header>
      <div className={styles.controls}>
        <label className={styles.search}>
          <Search size={20} aria-hidden="true" />
          <input type="search" aria-label="Поиск по названию и автору" placeholder="Название или автор"
            value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <div role="group" aria-label="Статус чтения" className={styles.filters}>
          {filters.map(label => <button key={label} type="button" aria-pressed={filter === label}
            onClick={() => setFilter(label)}>{label}</button>)}
        </div>
      </div>
      <div className={styles.grid}>
        {matching.map(work => {
          const state = states[work.id];
          const progress = state?.completed ? 100 : Math.floor(state?.maxProgress ?? 0);
          return <article className={styles.card} key={work.id}>
            <div className={styles.cover}>
              <Image src={work.cover} alt="" fill sizes="(max-width: 620px) 100vw, (max-width: 920px) 50vw, 380px" />
              {state?.completed && <span className={styles.read}><Check size={16} aria-hidden="true" /> Прочитано</span>}
            </div>
            <div className={styles.details}>
              <p className={styles.epoch}>{work.epoch}</p>
              <h2>{work.title}</h2>
              <p className={styles.author}>{work.author}</p>
              <p className={styles.description}>{work.description}</p>
              {(state?.position || state?.completed) && <div className={styles.progress}>
                <progress aria-label={`Прогресс чтения — ${work.title}`} max={100} value={progress} />
                <span>{progress}%</span>
              </div>}
              {work.available
                ? <Button asChild size="sm"><Link prefetch={false} href={readerHref(work.id)}>
                    {state?.position || state?.completed ? "Продолжить чтение" : "Начать чтение"}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link></Button>
                : <p className={styles.author}>{work.unavailableReason ?? "Текст пока недоступен"}</p>}
            </div>
          </article>;
        })}
      </div>
      {matching.length === 0 && (ready || filter === "Все") && <p role="status" className={styles.empty}>
        {query.trim() ? "Произведения не найдены" : filter === "Читаю"
          ? "Здесь появятся начатые произведения" : "Здесь появятся прочитанные произведения"}
      </p>}
    </div>
  </main>;
}
