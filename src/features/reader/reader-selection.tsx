"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { Copy, Quote } from "lucide-react";
import type { ReaderQuote, ReaderQuoteInput } from "./reader-quote-types";
import { precedingReference, resolveQuote, type QuoteBounds } from "./reader-quotes";
import { quoteRanges, selectedText } from "./reader-text-range";
import { readerEdition, type ReaderParagraph, type ReaderWork } from "./reader-types";
import styles from "./reader.module.css";

type ActiveSection = { sectionId: string; paragraphs: ReaderParagraph[] };

export function ReaderSelection({ root, active, work, priorReference, quotes, focused, addQuote, announce }: {
  root: RefObject<HTMLDivElement | null>;
  active: ActiveSection;
  work: ReaderWork;
  priorReference: string;
  quotes: readonly ReaderQuote[];
  focused?: QuoteBounds | null;
  addQuote: (input: ReaderQuoteInput) => boolean;
  announce: (message: string) => void;
}) {
  const [selection, setSelection] = useState<ReturnType<typeof selectedText>>(null);
  const edition = readerEdition(work);

  useEffect(() => {
    function updateSelection() {
      if (root.current) setSelection(selectedText(root.current, active.paragraphs, window.getSelection()));
    }
    document.addEventListener("selectionchange", updateSelection);
    return () => document.removeEventListener("selectionchange", updateSelection);
  }, [active, root]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || !CSS.highlights || typeof Highlight === "undefined") return;
    const saved = quotes.flatMap(quote => {
      if (quote.workId !== work.id || quote.sectionId !== active.sectionId) return [];
      const bounds = resolveQuote(active.paragraphs, quote, edition);
      return bounds ? quoteRanges(element, active.paragraphs, bounds) : [];
    });
    CSS.highlights.set("sophia-quote", new Highlight(...saved));
    const focus = new Highlight(...(focused ? quoteRanges(element, active.paragraphs, focused) : []));
    focus.priority = 1;
    CSS.highlights.set("sophia-quote-focus", focus);
    return () => {
      CSS.highlights.delete("sophia-quote");
      CSS.highlights.delete("sophia-quote-focus");
    };
  }, [active, edition, focused, quotes, root, work.id]);

  if (!selection) return null;
  const picked = selection;
  return <div className={styles.selectionActions} role="group" aria-label="Действия с выделенным текстом"
    onMouseDown={event => event.preventDefault()}>
    <button type="button" className={styles.action} onClick={async () => {
      try {
        await navigator.clipboard.writeText(picked.text);
        announce("Текст скопирован");
      } catch {
        announce("Скопируйте текст через меню браузера");
      }
    }}><Copy size={16} aria-hidden="true" /> Копировать</button>
    <button type="button" className={styles.action} onClick={() => {
      const start = precedingReference(active.paragraphs, picked.startParagraphId, priorReference);
      const end = precedingReference(active.paragraphs, picked.endParagraphId, priorReference);
      const reference = start && end && start !== end ? `${start}–${end}` : start || end;
      const added = addQuote({ ...picked, workId: work.id, sectionId: active.sectionId, reference, edition });
      announce(added ? "Добавлено в цитатник" : "Эта цитата уже сохранена");
      window.getSelection()?.removeAllRanges();
      setSelection(null);
      root.current?.closest<HTMLElement>('[role="region"]')?.focus({ preventScroll: true });
    }}><Quote size={16} aria-hidden="true" /> Сохранить цитату</button>
  </div>;
}
