"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChevronDown, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReaderStorage, type ReaderWorkActivity } from "@/features/reader/reader-storage";
import { readerHref, readerSavedHref, type ReaderWork } from "@/features/reader/reader-types";
import styles from "./profile-library.module.css";

type Work = Pick<ReaderWork, "id" | "title" | "author" | "translator" | "cover">;
const date = new Intl.DateTimeFormat("ru", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" });

function Shelf({ title, children }: { title: string; children: ReactNode }) {
  return <details className={styles.shelf}>
    <summary>{title}<ChevronDown size={17} aria-hidden="true" /></summary>
    <div aria-label={title} role="group" className={styles.shelfBody}>{children}</div>
  </details>;
}

function WorkRow({ work, activity }: { work: Work; activity: ReaderWorkActivity }) {
  const title = useId();
  const percent = Math.floor(activity.position?.percent ?? activity.maxProgress);
  return <article aria-labelledby={title} className={styles.work}>
    <Image src={work.cover} width={64} height={68} alt="" className={styles.cover} />
    <div>
      <h4 id={title}>{work.title}</h4>
      <p>{work.author}</p>
      {!activity.completed && <p>{activity.position?.percent === undefined ? "Дальняя позиция" : "Текущая позиция"} · {percent} %
        {activity.position?.reference && <> · <span>{activity.position.reference}</span></>}</p>}
    </div>
    <Button asChild size="sm"><Link prefetch={false} href={readerHref(work.id)}>
      {activity.completed ? "Открыть" : "Продолжить"}
    </Link></Button>
  </article>;
}

function SavedEntries({ works, kind }: { works: Work[]; kind: "bookmark" | "quote" }) {
  const { bookmarks, quotes, removeBookmark, removeQuote } = useReaderStorage();
  const [term, setTerm] = useState("");
  const [workFilter, setWorkFilter] = useState("");
  const [order, setOrder] = useState("newest");
  const [status, setStatus] = useState("");
  const quoteCollection = kind === "quote";
  const items = quoteCollection ? quotes : bookmarks;
  const search = term.trim().toLocaleLowerCase("ru").replaceAll("ё", "е");
  const entries = items.flatMap(item => {
    const work = works.find(work => work.id === item.workId);
    const text = "text" in item ? item.text : item.excerpt;
    const id = "id" in item ? item.id : item.paragraphId;
    if (!work || (workFilter && work.id !== workFilter)) return [];
    const searchable = `${text} ${work.title} ${work.author} ${item.reference}`.toLocaleLowerCase("ru").replaceAll("ё", "е");
    return searchable.includes(search) ? [{ item, id, text, work }] : [];
  }).sort((a, b) => order === "oldest" ? a.item.createdAt.localeCompare(b.item.createdAt) : b.item.createdAt.localeCompare(a.item.createdAt));

  return <>
    {items.length > 0 && <div className={styles.filters}>
      <label><span>{quoteCollection ? "Поиск по цитатам" : "Поиск по закладкам"}</span><input type="search"
        value={term} onChange={event => setTerm(event.target.value)} /></label>
      <label><span>Произведение</span><select value={workFilter} onChange={event => setWorkFilter(event.target.value)}>
        <option value="">Все произведения</option>
        {works.filter(work => items.some(item => item.workId === work.id)).map(work =>
          <option key={work.id} value={work.id}>{work.title}</option>)}
      </select></label>
      {quoteCollection && <label><span>Сортировка</span><select value={order} onChange={event => setOrder(event.target.value)}>
        <option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option>
      </select></label>}
    </div>}
    {entries.length === 0 && <p className={styles.empty}>{items.length ? "Фрагменты по этому запросу не найдены." :
      quoteCollection ? "Сохраните выделенный текст в читалке, чтобы собрать цитаты здесь." :
        "Поставьте закладку в читалке, чтобы вернуться к этому месту."}</p>}
    <div className={styles.entries}>
      {entries.map(({ item, id, text, work }) => <article className={styles.entry} key={id}>
        <p className={styles.byline}>{work.author} · {work.title}{item.reference && ` · ${item.reference}`}</p>
        {quoteCollection ? <blockquote>{text}</blockquote> : <p className={styles.excerpt}>{text}</p>}
        <p className={styles.meta}>{quoteCollection && `Перевод: ${work.translator} · `}
          <time dateTime={item.createdAt}>{date.format(new Date(item.createdAt))}</time></p>
        <div className={styles.actions}>
          <Button asChild size="sm" variant="outline"><Link prefetch={false}
            href={readerSavedHref(work.id, kind, id)}>Открыть в книге</Link></Button>
          {quoteCollection && <button className={styles.tool} type="button" aria-label="Скопировать с источником"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${text}\n\n${work.author}, «${work.title}»${item.reference ? `, ${item.reference}` : ""}. Перевод: ${work.translator}.`);
                setStatus("Цитата и источник скопированы");
              } catch { setStatus("Не удалось скопировать цитату"); }
            }}><Copy size={18} aria-hidden="true" /></button>}
          <button className={styles.tool} type="button" aria-label={quoteCollection ? "Удалить цитату" : "Удалить закладку"}
            onClick={() => {
              if (quoteCollection) removeQuote(id);
              else removeBookmark(work.id, id);
              setWorkFilter(current => items.filter(candidate => candidate.workId === current).length <= 1 ? "" : current);
              setStatus(quoteCollection ? "Цитата удалена" : "Закладка удалена");
            }}><Trash2 size={18} aria-hidden="true" /></button>
        </div>
      </article>)}
    </div>
    <p className={styles.feedback} role="status">{status}</p>
  </>;
}

export function ProfileLibrary({ works }: { works: Work[] }) {
  const { works: states, quotes } = useReaderStorage();
  const activity = works.flatMap(work => {
    const state = states[work.id];
    return state ? [{ work, state }] : [];
  }).sort((a, b) => (b.state.lastActivityAt ?? "").localeCompare(a.state.lastActivityAt ?? ""));
  const reading = activity.filter(({ state }) => state.position && !state.completed);
  const completed = activity.filter(({ state }) => state.completed);
  const latest = reading[0];
  return <section id="profile-library" className={`glass ${styles.section}`} aria-labelledby="profile-library-title">
    <header className={styles.header}>
      <h2 id="profile-library-title"><BookOpen size={21} aria-hidden="true" /> Моя библиотека</h2>
      <Link href="/library" prefetch={false}>Перейти в библиотеку</Link>
    </header>
    <dl className={styles.metrics}>
      <div><dt>Сейчас читаю</dt><dd>{reading.length}</dd></div>
      <div><dt>Прочитано</dt><dd>{completed.length}</dd></div>
      <div><dt>Цитаты</dt><dd>{quotes.length}</dd></div>
    </dl>
    <div className={styles.now}>
      <h3>Сейчас читаю</h3>
      {latest ? <WorkRow work={latest.work} activity={latest.state} /> :
        <p className={styles.empty}>Начатые произведения появятся здесь.</p>}
      {reading.length > 1 && <Shelf title="Все начатые произведения">
        {reading.slice(1).map(({ work, state }) => <WorkRow key={work.id} work={work} activity={state} />)}
      </Shelf>}
    </div>
    <Shelf title="Прочитанные произведения">
      {completed.length ? completed.map(({ work, state }) => <WorkRow key={work.id} work={work} activity={state} />) :
        <p className={styles.empty}>Отметьте произведение прочитанным, чтобы оно появилось здесь.</p>}
    </Shelf>
    <Shelf title="Мои закладки"><SavedEntries works={works} kind="bookmark" /></Shelf>
    <Shelf title="Мой цитатник"><SavedEntries works={works} kind="quote" /></Shelf>
    <p className={styles.meta}>Данные читалки сохраняются в текущем браузере.</p>
  </section>;
}
