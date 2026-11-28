"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkPlus, BookOpen, Check, List, Quote, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useAccountViewer } from "@/features/account/account-viewer";
import { READER_FONT_SIZE, READER_LINE_HEIGHT, type ReaderTheme } from "./reader-storage";
import { useReaderSession } from "./use-reader-session";
import type { ReaderWork } from "./reader-types";
import { paragraphText } from "./reader-quotes";
import { paragraphElement, textPoint } from "./reader-text-range";
import { ReaderSelection } from "./reader-selection";
import styles from "./reader.module.css";

const themes: Record<ReaderTheme, string> = {
  light: "Светлая",
  paper: "Бумажная",
  dark: "Тёмная",
};

function ReaderPanel({ name, panel, children }: {
  name: string;
  panel: RefObject<HTMLDialogElement | null>;
  children: ReactNode;
}) {
  return <dialog ref={panel} aria-label={name} className={styles.panel}
    onClick={event => { if (event.target === event.currentTarget) panel.current?.close(); }}>
    <div className={styles.panelBody}>
      <header className={styles.panelHeading}>
        <h2>{name}</h2>
        <button type="button" className={styles.icon} aria-label="Закрыть панель" onClick={() => panel.current?.close()}>
          <X size={21} aria-hidden="true" />
        </button>
      </header>
      {children}
    </div>
  </dialog>;
}

type ReadingProps = { work: ReaderWork; lessonReturn?: string };

export function Reader(props: ReadingProps) {
  const viewer = useAccountViewer();
  return <ReadingView key={viewer?.id ?? "guest"} {...props} />;
}

function ReadingView({ work, lessonReturn }: ReadingProps) {
  const pane = useRef<HTMLDivElement>(null);
  const textRoot = useRef<HTMLDivElement>(null);
  const session = useReaderSession(work, pane);
  const { active, settings, activity } = session;
  const [notice, setNotice] = useState<{ text: string } | null>(null);
  const toc = useRef<HTMLDialogElement>(null);
  const preferences = useRef<HTMLDialogElement>(null);
  const bookmarks = useRef<HTMLDialogElement>(null);
  const quotesPanel = useRef<HTMLDialogElement>(null);
  const index = work.sections.findIndex(section => section.id === session.sectionId);
  const section = work.sections[index];
  const progress = activity?.completed ? 100 : Math.floor(activity?.maxProgress ?? 0);
  const saved = session.bookmarks.filter(bookmark => bookmark.workId === work.id);
  const quotes = session.quotes.filter(quote => quote.workId === work.id);
  const marked = new Set(saved.map(bookmark => bookmark.paragraphId));

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timeout);
  }, [notice]);

  function announce(text: string) {
    setNotice({ text });
  }

  function goToSection(sectionId: string) {
    toc.current?.close();
    session.navigate({ sectionId, record: true });
    pane.current?.focus({ preventScroll: true });
  }

  function bookmarkCurrent() {
    session.flush();
    const position = session.measurePosition();
    const paragraph = active?.paragraphs.find(item => item.id === position?.paragraphId);
    if (!position || !paragraph) return;
    if (saved.some(item => item.paragraphId === paragraph.id)) {
      announce("На этом фрагменте уже есть закладка");
      return;
    }
    const text = paragraphText(paragraph);
    const offset = position.offset ?? Math.floor(text.length * position.fraction);
    const start = Math.max(0, offset - 24);
    const end = Math.min(text.length, offset + 96);
    const excerpt = (start ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "…" : "");
    session.addBookmark({
      workId: work.id, sectionId: position.sectionId, paragraphId: paragraph.id,
      excerpt, fraction: position.fraction, offset: position.offset,
      reference: position.reference ?? "",
    });
    announce("Закладка добавлена");
  }

  function handleReadingKeys(event: KeyboardEvent<HTMLDivElement>) {
    const direction = { ArrowLeft: "backward", ArrowRight: "forward", ArrowUp: "backward", ArrowDown: "forward" } as const;
    const movement = direction[event.key as keyof typeof direction];
    if (event.shiftKey && movement && textRoot.current) {
      const selection = window.getSelection();
      const position = session.measurePosition();
      const paragraph = position && paragraphElement(textRoot.current, position.paragraphId);
      const text = paragraph && paragraph.querySelector<HTMLElement>("[data-reader-text]");
      if (text && position && selection && typeof selection.modify === "function") {
        if (!textRoot.current.contains(selection.anchorNode)) {
          const from = textPoint(text, position.offset ?? 0);
          selection.collapse(from.node, from.offset);
        }
        selection.modify("extend", movement, event.key === "ArrowUp" || event.key === "ArrowDown"
          ? "line" : event.ctrlKey || event.altKey ? "word" : "character");
        event.preventDefault();
        return;
      }
    }
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) session.allowRecording();
  }

  return <main id="main" tabIndex={-1} className={styles.reader} data-theme={settings.theme}
    style={{ "--reading-size": settings.fontSize + "px", "--reading-leading": settings.lineHeight } as CSSProperties}>
    <header className={styles.toolbar}>
      <div className={styles.toolbarInner}>
        <Link prefetch={false} className={lessonReturn ? `${styles.back} ${styles.lessonBack}` : styles.back}
          href={lessonReturn ?? "/library"} aria-label={lessonReturn ? "Вернуться к уроку" : "Вернуться в библиотеку"}
          onClick={session.flush}>
          <ArrowLeft size={20} aria-hidden="true" /><span>{lessonReturn ? "Вернуться к уроку" : "Библиотека"}</span>
        </Link>
        <div className={styles.workName}>
          <h1>{work.title}</h1>
          <p>{work.author}</p>
        </div>
        <div className={styles.tools} role="group" aria-label="Управление читалкой">
          <button className={styles.icon} type="button" aria-label="Поставить закладку" title="Поставить закладку"
            disabled={!active} onClick={bookmarkCurrent}><BookmarkPlus size={21} aria-hidden="true" /></button>
          <button className={styles.icon} type="button" aria-label="Закладки" title="Закладки"
            onClick={() => bookmarks.current?.showModal()}><Bookmark size={21} aria-hidden="true" /></button>
          <button className={styles.icon} type="button" aria-label="Цитаты" title="Цитаты"
            onClick={() => quotesPanel.current?.showModal()}><Quote size={20} aria-hidden="true" /></button>
          <button className={styles.icon} type="button" aria-label="Настройки чтения" title="Настройки чтения"
            onClick={() => preferences.current?.showModal()}><SlidersHorizontal size={21} aria-hidden="true" /></button>
          <button className={styles.icon} type="button" aria-label="Оглавление" title="Оглавление"
            onClick={() => toc.current?.showModal()}><List size={23} aria-hidden="true" /></button>
        </div>
      </div>
    </header>

    <div className={styles.viewport} tabIndex={0} role="region" aria-label="Текст произведения"
      ref={pane} onScroll={session.onScroll} onWheel={session.allowRecording}
      onTouchMove={session.allowRecording} onPointerDown={session.allowRecording}
      onKeyDown={handleReadingKeys}>
      <article className={styles.text}>
        {!active && !session.failed && <p className={styles.state} role="status">Загружаем текст…</p>}
        {session.failed && <div className={styles.state}>
          <p role="alert">Не удалось загрузить раздел.</p>
          <button className={styles.action} type="button" onClick={session.retry}>Повторить</button>
        </div>}
        {active && <div key={active.sectionId}>
          <header className={styles.sectionHeading}>
            <BookOpen size={24} aria-hidden="true" />
            <h2>{section.title}</h2>
            {section.stephanusReference && <p>{section.stephanusReference}</p>}
          </header>
          {session.unknownReference && <p className={styles.state} role="status">Фрагмент по этой ссылке отсутствует в издании.</p>}
          {session.missingTarget && <p className={styles.state} role="status">Сохранённый фрагмент недоступен в этом издании или браузере.</p>}
          <div ref={textRoot}>
            {active.paragraphs.map(paragraph => <p key={paragraph.id} id={paragraph.stephanusReference}
              data-paragraph={paragraph.id} data-continuation={paragraph.continuation || undefined}
              data-bookmarked={marked.has(paragraph.id) || undefined} className={styles.paragraph}>
              {paragraph.stephanusReference && <span className={styles.reference}>{paragraph.stephanusReference}</span>}
              <span data-reader-text>
                {paragraph.speaker && <strong className={styles.speaker}>{paragraph.speaker} </strong>}
                {paragraph.text}
              </span>
            </p>)}
          </div>
          <span className={styles.endMark} aria-hidden="true">✦</span>
        </div>}
      </article>
    </div>
    {active && <ReaderSelection key={active.sectionId} root={textRoot} active={active} work={work}
      priorReference={session.priorReference} quotes={session.quotes} focused={session.focusedQuote}
      addQuote={session.addQuote} announce={announce} />}

    <div className={styles.readingFooter}>
      <div className={styles.footerInner}>
        <div className={styles.progress}>
          <progress max={100} value={progress} aria-label="Дальняя позиция по тексту" />
          <span>{progress}%</span>
        </div>
        <nav className={styles.pager} aria-label="Разделы произведения">
          <button type="button" className={styles.action} disabled={index <= 0}
            onClick={() => goToSection(work.sections[index - 1].id)}><ArrowLeft size={17} aria-hidden="true" /> Назад</button>
          <span className={styles.counter}>{index >= 0 ? `${index + 1} / ${work.sections.length}` : ""}</span>
          <button type="button" className={styles.action} disabled={index < 0 || index >= work.sections.length - 1}
            onClick={() => goToSection(work.sections[index + 1].id)}>Далее <ArrowRight size={17} aria-hidden="true" /></button>
          <button type="button" className={styles.complete} aria-pressed={Boolean(activity?.completed)}
            onClick={() => {
              session.flush();
              session.setCompleted(work.id, !activity?.completed);
            }}><Check size={17} aria-hidden="true" />{activity?.completed ? "Прочитано" : "Отметить прочитанным"}</button>
        </nav>
      </div>
    </div>
    <span className={styles.notice} role="status">{notice?.text}</span>

    <ReaderPanel name="Оглавление" panel={toc}>
      <ol className={styles.contents}>
        {work.sections.map(item => <li key={item.id}>
          <button type="button" aria-current={item.id === session.sectionId ? "location" : undefined}
            onClick={() => goToSection(item.id)}>
            <span>{item.title}</span>{item.stephanusReference && <small>{item.stephanusReference}</small>}
          </button>
        </li>)}
      </ol>
    </ReaderPanel>

    <ReaderPanel name="Настройки чтения" panel={preferences}>
      <fieldset className={styles.settings}>
        <legend>Тема</legend>
        <div className={styles.themes}>
          {(Object.keys(themes) as ReaderTheme[]).map(theme => <button type="button" key={theme}
            data-swatch={theme} aria-pressed={theme === settings.theme} onClick={() => session.updateSettings({ theme })}>
            <span aria-hidden="true">Аа</span>{themes[theme]}
          </button>)}
        </div>
      </fieldset>
      <label className={styles.range}>
        <span>Размер шрифта</span><output>{settings.fontSize} px</output>
        <input type="range" aria-label="Размер шрифта" {...READER_FONT_SIZE} value={settings.fontSize}
          onChange={event => session.updateSettings({ fontSize: event.target.valueAsNumber })} />
      </label>
      <p className={styles.localNote}>Настройки, позиции, закладки и цитаты сохраняются в этом браузере.</p>
      <label className={styles.range}>
        <span>Межстрочный интервал</span><output>{settings.lineHeight.toLocaleString("ru")}</output>
        <input type="range" aria-label="Межстрочный интервал" {...READER_LINE_HEIGHT} value={settings.lineHeight}
          onChange={event => session.updateSettings({ lineHeight: event.target.valueAsNumber })} />
      </label>
      <div className={styles.source}>
        <h3>Об издании</h3>
        <p>{work.translator} · {work.publicationYear}</p>
        <p>{work.edition}</p>
        <p>{work.rightsJustification}</p>
        <a href={work.sourceUrl}>Источник текста</a>
      </div>
    </ReaderPanel>

    <ReaderPanel name="Закладки" panel={bookmarks}>
      {saved.length === 0 && <p>Сохранённые фрагменты появятся здесь.</p>}
      <ul className={styles.bookmarks}>
        {saved.map(bookmark => <li key={bookmark.paragraphId}>
          <button type="button" className={styles.bookmarkLink} onClick={() => {
            bookmarks.current?.close();
            session.navigate({ sectionId: bookmark.sectionId, position: bookmark });
            pane.current?.focus({ preventScroll: true });
          }}>
            <small>{bookmark.reference && `${bookmark.reference} · `}{new Date(bookmark.createdAt).toLocaleDateString("ru")}</small>
            <span>{bookmark.excerpt}</span>
          </button>
          <button type="button" className={styles.icon} aria-label={`Удалить закладку: ${bookmark.reference || bookmark.excerpt}`}
            onClick={() => {
              session.removeBookmark(work.id, bookmark.paragraphId);
              announce("Закладка удалена");
            }}><Trash2 size={18} aria-hidden="true" /></button>
        </li>)}
      </ul>
    </ReaderPanel>
    <ReaderPanel name="Цитаты" panel={quotesPanel}>
      {quotes.length === 0 && <p>Выделите текст и сохраните цитату. Она появится здесь.</p>}
      <ul className={styles.bookmarks}>
        {quotes.map(quote => <li key={quote.id}>
          <button type="button" className={styles.bookmarkLink} onClick={() => {
            quotesPanel.current?.close();
            session.navigate({ sectionId: quote.sectionId, quote });
            pane.current?.focus({ preventScroll: true });
          }}>
            <small>{quote.reference}</small><span>{quote.text}</span>
          </button>
          <button type="button" className={styles.icon} aria-label="Удалить цитату" onClick={() => session.removeQuote(quote.id)}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </li>)}
      </ul>
    </ReaderPanel>
  </main>;
}
