"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useReaderStorage, type ReaderPosition } from "./reader-storage";
import type { ReaderQuote } from "./reader-quote-types";
import { paragraphText, precedingReference, resolveQuote } from "./reader-quotes";
import { lineOffset, paragraphElement, textRange } from "./reader-text-range";
import { readerEdition, type ReaderParagraph, type ReaderSavedTarget, type ReaderWork } from "./reader-types";

type Destination = {
  sectionId: string;
  position?: ReaderPosition;
  reference?: string;
  record?: boolean;
  quote?: ReaderQuote;
  missing?: boolean;
};

type LoadedSection = { sectionId: string; paragraphs: ReaderParagraph[] };
const readingInset = 18;

function sectionForReference(work: ReaderWork, reference: string) {
  return work.anchors && Object.hasOwn(work.anchors, reference) ? work.anchors[reference] : undefined;
}

function urlReference() {
  if (window.location.hash === "#main") return "";
  try { return decodeURIComponent(window.location.hash.slice(1)).toLowerCase(); } catch { return ""; }
}

function clearReference(clearSaved = false) {
  const url = new URL(location.href);
  url.hash = "";
  if (clearSaved) {
    url.searchParams.delete("quote");
    url.searchParams.delete("bookmark");
  }
  if (url.href !== location.href) history.replaceState(history.state, "", url.pathname + url.search);
}

export function useReaderSession(
  work: ReaderWork, pane: RefObject<HTMLDivElement | null>, savedTarget?: ReaderSavedTarget,
) {
  const storage = useReaderStorage();
  const activity = storage.works[work.id];
  const [destination, setDestination] = useState<Destination | null>(null);
  const [loaded, setLoaded] = useState<LoadedSection | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const position = useRef<ReaderPosition | null>(null);
  const canRecord = useRef(false);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; maximum: number; commit: () => void } | null>(null);
  const sectionId = destination?.sectionId;
  const active = loaded && loaded.sectionId === sectionId ? loaded : null;
  const unknownReference = destination?.reference && !sectionForReference(work, destination.reference);
  const focusedQuote = active && destination?.quote &&
    resolveQuote(active.paragraphs, destination.quote, readerEdition(work));
  const missingTarget = destination?.missing || Boolean(active && (destination?.quote && !focusedQuote ||
    savedTarget?.kind === "bookmark" && destination?.position &&
    !active.paragraphs.some(p => p.id === destination.position?.paragraphId)));
  const priorReference = useMemo(() => {
    const index = work.sections.findIndex(section => section.id === sectionId);
    if (index < 1) return "";
    const priorSections = new Set(work.sections.slice(0, index).map(section => section.id));
    return Object.entries(work.anchors ?? {}).findLast(([, id]) => id && priorSections.has(id))?.[0] ?? "";
  }, [work, sectionId]);

  const restoreDestination = useEffectEvent(() => {
    flush();
    const reference = urlReference();
    const citedSection = sectionForReference(work, reference);
    const saved = activity?.position ?? undefined;
    const savedSection = work.sections.find(section => section.id === saved?.sectionId);
    const quote = savedTarget?.kind === "quote"
      ? storage.quotes.find(item => item.id === savedTarget.id && item.workId === work.id) : undefined;
    const bookmark = savedTarget?.kind === "bookmark"
      ? storage.bookmarks.find(item => item.paragraphId === savedTarget.id && item.workId === work.id) : undefined;
    const targetSection = work.sections.find(section => section.id === (quote?.sectionId ?? bookmark?.sectionId));
    setDestination({
      sectionId: targetSection?.id ?? citedSection ?? savedSection?.id ?? work.sections[0].id,
      position: targetSection ? bookmark : citedSection ? undefined : saved,
      quote: targetSection ? quote : undefined,
      missing: Boolean(savedTarget && !targetSection),
      reference: reference || undefined,
      record: !savedTarget && !reference && !saved,
    });
  });

  useEffect(() => {
    if (!storage.ready) return;
    const restore = () => restoreDestination();
    restore();
    const onHashChange = () => { if (location.hash !== "#main") restore(); };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [storage.ready, savedTarget]);

  useEffect(() => {
    if (!sectionId || active) return;
    const controller = new AbortController();
    fetch(`/api/reader/${encodeURIComponent(work.id)}/${encodeURIComponent(sectionId)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Section unavailable");
        const paragraphs = await response.json() as ReaderParagraph[];
        if (!controller.signal.aborted) setLoaded({ sectionId, paragraphs });
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(sectionId); });
    return () => controller.abort();
  }, [active, sectionId, work.id, attempt]);

  function paragraphsInViewport() {
    return pane.current?.querySelectorAll<HTMLElement>("[data-paragraph]");
  }

  function measurePosition(): ReaderPosition | null {
    const viewport = pane.current;
    const nodes = paragraphsInViewport();
    if (!viewport || !active || !nodes?.length) return null;
    const line = viewport.getBoundingClientRect().top + readingInset;
    let index = 0;
    let end = nodes.length - 1;
    while (index < end) {
      const middle = Math.floor((index + end) / 2);
      if (nodes[middle].getBoundingClientRect().bottom >= line) end = middle;
      else index = middle + 1;
    }
    const node = nodes[index];
    const bounds = node.getBoundingClientRect();
    const text = node.querySelector<HTMLElement>("[data-reader-text]");
    const paragraphId = node.dataset.paragraph!;
    return {
      sectionId: active.sectionId,
      paragraphId,
      fraction: Math.max(0, Math.min(1, (line - bounds.top) / Math.max(1, bounds.height))),
      offset: text ? lineOffset(text, line) : undefined,
      reference: precedingReference(active.paragraphs, paragraphId, priorReference),
    };
  }

  function scrollToPosition(target?: ReaderPosition, reference?: string) {
    const viewport = pane.current;
    if (!viewport) return;
    const node = reference
      ? document.getElementById(reference)
      : target && paragraphElement(viewport, target.paragraphId);
    if (!node || !viewport.contains(node)) {
      viewport.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const bounds = node.getBoundingClientRect();
    const text = node.querySelector<HTMLElement>("[data-reader-text]");
    const offset = target?.offset;
    const targetTop = text && offset !== undefined && offset < (text.textContent?.length ?? 0)
      ? textRange(text, offset, offset + 1).getBoundingClientRect().top : undefined;
    const top = viewport.scrollTop + (targetTop ?? bounds.top + bounds.height * (target?.fraction ?? 0)) -
      viewport.getBoundingClientRect().top - readingInset;
    viewport.scrollTo({ top, behavior: "instant" });
  }

  function progressAt(next: ReaderPosition) {
    if (!active || next.sectionId !== active.sectionId) return 0;
    let before = 0;
    for (const section of work.sections) {
      if (section.id === active.sectionId) break;
      before += section.characters;
    }
    for (const paragraph of active.paragraphs) {
      if (paragraph.id === next.paragraphId) {
        const fraction = next.offset === undefined ? next.fraction : next.offset / Math.max(1, paragraphText(paragraph).length);
        before += paragraph.text.length * Math.min(1, fraction);
        break;
      }
      before += paragraph.text.length;
    }
    const total = work.sections.reduce((sum, section) => sum + section.characters, 0);
    return Math.min(99.99, (before / Math.max(1, total)) * 100);
  }

  function flush() {
    const write = pending.current;
    if (!write) return;
    clearTimeout(write.timer);
    pending.current = null;
    write.commit();
  }

  const flushOnExit = useEffectEvent(flush);
  useEffect(() => {
    const save = () => flushOnExit();
    const onVisibility = () => { if (document.hidden) save(); };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibility);
      save();
    };
  }, []);

  const initializeSection = useEffectEvent(() => {
    if (!active || !destination) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    canRecord.current = false;
    const saved = focusedQuote ? {
      sectionId: active.sectionId, paragraphId: focusedQuote.startParagraphId, fraction: 0, offset: focusedQuote.startOffset,
    } : destination.position;
    const reference = unknownReference ? undefined : destination.reference;
    const atStart = !destination.quote && !savedTarget && saved?.paragraphId === active.paragraphs[0]?.id &&
      saved?.fraction === 0 && !saved.offset;
    scrollToPosition(atStart ? undefined : saved, reference);
    position.current = focusedQuote ? saved ?? null : measurePosition();
    if (destination.record && position.current) storage.savePosition(work.id, position.current, progressAt(position.current));
  });
  useLayoutEffect(() => {
    initializeSection();
  }, [active, destination]);

  const restoreLayout = useEffectEvent(() => {
    if (!active || !position.current || !pane.current?.scrollTop) return;
    canRecord.current = false;
    scrollToPosition(position.current);
  });
  useLayoutEffect(() => {
    restoreLayout();
  }, [storage.settings.fontSize, storage.settings.lineHeight]);
  useEffect(() => {
    const viewport = pane.current;
    if (!viewport) return;
    let width = viewport.clientWidth;
    let height = viewport.clientHeight;
    const observer = new ResizeObserver(() => {
      if (width === viewport.clientWidth && height === viewport.clientHeight) return;
      width = viewport.clientWidth;
      height = viewport.clientHeight;
      restoreLayout();
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [pane]);

  function onScroll() {
    if (!canRecord.current) return;
    const reference = urlReference();
    if (reference && reference !== destination?.reference) return;
    const viewport = pane.current;
    const next = measurePosition();
    if (!viewport || !next) return;
    position.current = next;
    if (destination?.quote || destination?.missing) return;
    const atEnd = next.sectionId === work.sections.at(-1)?.id &&
      viewport.scrollHeight > viewport.clientHeight &&
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 2;
    const current = atEnd ? 100 : progressAt(next);
    const maximum = Math.max(pending.current?.maximum ?? 0, current);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = {
      timer: setTimeout(flush, 180),
      maximum,
      commit: () => {
        if (reference && urlReference() === reference || savedTarget?.kind === "bookmark") clearReference(true);
        storage.savePosition(work.id, next, maximum, current);
      },
    };
  }

  function navigate(next: Destination) {
    flush();
    clearReference(true);
    setFailed(null);
    setDestination(next);
  }

  return {
    ...storage, activity, active, sectionId, failed: failed === sectionId, unknownReference, focusedQuote, missingTarget,
    onScroll, flush, navigate, measurePosition, priorReference,
    retry: () => { setFailed(null); setAttempt(previous => previous + 1); },
    allowRecording: () => { canRecord.current = true; },
  };
}
