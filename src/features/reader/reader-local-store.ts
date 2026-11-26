import { accountStoragePrefix, canWriteAccountBrowserStorage } from "../account/account-storage.ts";
import type { ReaderQuote, ReaderQuoteInput } from "./reader-quote-types.ts";

export type ReaderTheme = "light" | "paper" | "dark";

export type ReaderSettings = Readonly<{
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
}>;

export const READER_DEFAULT_SETTINGS: ReaderSettings = { theme: "paper", fontSize: 18, lineHeight: 1.65 };
export const READER_FONT_SIZE = { min: 14, max: 28 } as const;
export const READER_LINE_HEIGHT = { min: 1.2, max: 2.2, step: 0.05 } as const;

export type ReaderPosition = Readonly<{
  sectionId: string;
  paragraphId: string;
  fraction: number;
  offset?: number;
  reference?: string;
  percent?: number;
}>;

export type ReaderWorkActivity = Readonly<{
  position: ReaderPosition | null;
  maxProgress: number;
  lastActivityAt: string | null;
  completed: boolean;
}>;

type BookmarkInput = Readonly<{
  workId: string;
  sectionId: string;
  paragraphId: string;
  excerpt: string;
  reference: string;
  fraction?: number;
  offset?: number;
}>;

export type ReaderBookmark = BookmarkInput & Readonly<{ fraction: number; createdAt: string }>;

type ReaderData = Readonly<{
  settings: ReaderSettings;
  works: Readonly<Partial<Record<string, ReaderWorkActivity>>>;
  bookmarks: readonly ReaderBookmark[];
}>;

const emptyActivity: ReaderWorkActivity = { position: null, maxProgress: 0, lastActivityAt: null, completed: false };
const emptyData: ReaderData = { settings: READER_DEFAULT_SETTINGS, works: {}, bookmarks: [] };
const emptyQuotes: readonly ReaderQuote[] = [];
const emptySnapshot = { ...emptyData, quotes: emptyQuotes, ready: true };
export const readerServerSnapshot = { ...emptySnapshot, ready: false };

function readerStoragePrefix(accountId: string | null) {
  return accountId === null ? "sophia." : accountStoragePrefix(accountId);
}

export function readerStorageKey(accountId: string | null) {
  return readerStoragePrefix(accountId) + "reader.v1";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function bounded(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function textOffset(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function settingsFrom(value: unknown): ReaderSettings {
  const { theme, fontSize, lineHeight } = record(value);
  return {
    theme: theme === "light" || theme === "dark" || theme === "paper" ? theme : READER_DEFAULT_SETTINGS.theme,
    fontSize: bounded(fontSize, READER_FONT_SIZE.min, READER_FONT_SIZE.max, READER_DEFAULT_SETTINGS.fontSize),
    lineHeight: bounded(lineHeight, READER_LINE_HEIGHT.min, READER_LINE_HEIGHT.max, READER_DEFAULT_SETTINGS.lineHeight),
  };
}

function positionFrom(value: unknown): ReaderPosition | null {
  const { sectionId, paragraphId, fraction, offset, reference, percent } = record(value);
  if (typeof sectionId !== "string" || !sectionId || typeof paragraphId !== "string" || !paragraphId) return null;
  const validOffset = textOffset(offset);
  return {
    sectionId, paragraphId, fraction: bounded(fraction, 0, 1, 0),
    ...(validOffset === undefined ? {} : { offset: validOffset }),
    ...(typeof reference === "string" && reference ? { reference } : {}),
    ...(typeof percent === "number" && Number.isFinite(percent) ? { percent: bounded(percent, 0, 100, 0) } : {}),
  };
}

function dateFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function activityFrom(value: unknown): ReaderWorkActivity {
  const { position, maxProgress, lastActivityAt, completed } = record(value);
  return {
    position: positionFrom(position),
    maxProgress: bounded(maxProgress, 0, 100, 0),
    lastActivityAt: dateFrom(lastActivityAt),
    completed: completed === true,
  };
}

function bookmarkFrom(value: unknown): ReaderBookmark | null {
  const { workId, sectionId, paragraphId, excerpt, reference, fraction, offset, createdAt } = record(value);
  const date = dateFrom(createdAt);
  if (!date || typeof workId !== "string" || !workId || typeof sectionId !== "string" || !sectionId
    || typeof paragraphId !== "string" || !paragraphId || typeof excerpt !== "string" || typeof reference !== "string") return null;
  const validOffset = textOffset(offset);
  return {
    workId, sectionId, paragraphId, excerpt, reference, createdAt: date,
    fraction: bounded(fraction, 0, 1, 0),
    ...(validOffset === undefined ? {} : { offset: validOffset }),
  };
}

function sameBookmark(first: BookmarkInput, workId: string, paragraphId: string) {
  return first.workId === workId && first.paragraphId === paragraphId;
}

function parseData(raw: string | null): ReaderData {
  if (!raw) return emptyData;
  try {
    const { settings, works, bookmarks } = record(JSON.parse(raw));
    const uniqueBookmarks: ReaderBookmark[] = [];
    if (Array.isArray(bookmarks)) {
      for (const item of bookmarks) {
        const bookmark = bookmarkFrom(item);
        if (bookmark && !uniqueBookmarks.some(saved => sameBookmark(saved, bookmark.workId, bookmark.paragraphId))) {
          uniqueBookmarks.push(bookmark);
        }
      }
    }
    return {
      settings: settingsFrom(settings),
      works: Object.fromEntries(Object.entries(record(works)).map(([workId, activity]) => [workId, activityFrom(activity)])),
      bookmarks: uniqueBookmarks,
    };
  } catch {
    return emptyData;
  }
}

function quoteFrom(value: unknown): ReaderQuote | null {
  const {
    workId, sectionId, startParagraphId, endParagraphId, startOffset, endOffset, text, reference, edition, createdAt,
  } = record(value);
  const date = dateFrom(createdAt);
  const start = textOffset(startOffset);
  const end = textOffset(endOffset);
  if (!date || typeof workId !== "string" || !workId || typeof sectionId !== "string" || !sectionId
    || typeof startParagraphId !== "string" || !startParagraphId || typeof endParagraphId !== "string" || !endParagraphId
    || start === undefined || end === undefined || (startParagraphId === endParagraphId && start >= end)
    || typeof text !== "string" || !text.trim() || typeof reference !== "string" || typeof edition !== "string" || !edition) return null;

  // Each range has its own key. Concurrent edits to different ranges cannot replace each other.
  const id = [workId, sectionId, edition, startParagraphId, start, endParagraphId, end].map(encodeURIComponent).join(":");
  return {
    id, workId, sectionId, startParagraphId, endParagraphId, startOffset: start, endOffset: end,
    text, reference, edition, createdAt: date,
  };
}

function readQuote(key: string, id: string): ReaderQuote | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const quote = quoteFrom(JSON.parse(raw));
    return quote?.id === id ? quote : null;
  } catch {
    return null;
  }
}

function newestFirst(a: ReaderQuote, b: ReaderQuote) {
  return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}

export function createReaderLocalStore(accountId: string | null | undefined) {
  // A failed session lookup must never read or write the guest's saved history.
  const key = accountId === undefined ? null : readerStorageKey(accountId);
  const quotePrefix = accountId === undefined ? null : readerStoragePrefix(accountId) + "reader-quotes.v1:";
  const listeners = new Set<() => void>();
  const unsavedQuotes = new Map<string, ReaderQuote | null>();
  let lastRaw: string | null | undefined;
  let snapshot = emptySnapshot;
  let quotesNeedRefresh = true;

  function refreshQuotes(prefix: string) {
    const quotes = new Map<string, ReaderQuote>();
    for (const storedKey of Object.keys(window.localStorage)) {
      if (!storedKey.startsWith(prefix)) continue;
      const id = storedKey.slice(prefix.length);
      const quote = readQuote(storedKey, id);
      if (quote) quotes.set(id, quote);
    }
    for (const [id, quote] of unsavedQuotes) {
      if (quote) quotes.set(id, quote);
      else quotes.delete(id);
    }
    snapshot = { ...snapshot, quotes: [...quotes.values()].sort(newestFirst) };
    quotesNeedRefresh = false;
  }

  function getSnapshot() {
    if (key === null) return snapshot;
    if (!canWriteAccountBrowserStorage(key)) return emptySnapshot;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== lastRaw) {
        lastRaw = raw;
        snapshot = { ...snapshot, ...parseData(raw) };
      }
      if (quotePrefix !== null && quotesNeedRefresh) refreshQuotes(quotePrefix);
    } catch { /* Keep the last usable snapshot while browser storage is unavailable. */ }
    return snapshot;
  }

  function publish() {
    for (const listener of listeners) listener();
  }

  function onStorage(event: StorageEvent) {
    if (event.key === null || (quotePrefix !== null && event.key.startsWith(quotePrefix))) {
      quotesNeedRefresh = true;
      publish();
    } else if (event.key === key) {
      publish();
    }
  }

  function subscribe(listener: () => void) {
    if (key !== null && !listeners.size) {
      quotesNeedRefresh = true;
      window.addEventListener("storage", onStorage);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (key !== null && !listeners.size) window.removeEventListener("storage", onStorage);
    };
  }

  function update(change: (current: ReaderData) => ReaderData) {
    if (key !== null && !canWriteAccountBrowserStorage(key)) return;
    const current = getSnapshot();
    const next = change(current);
    if (current === next) return;
    const { settings, works, bookmarks } = next;
    snapshot = { ...snapshot, settings, works, bookmarks };
    if (key !== null) {
      const raw = JSON.stringify({ settings, works, bookmarks });
      try {
        window.localStorage.setItem(key, raw);
        lastRaw = raw;
      } catch { /* Changes remain usable until the document closes. */ }
    }
    publish();
  }

  function updateWork(workId: string, change: (activity: ReaderWorkActivity) => ReaderWorkActivity) {
    update(current => {
      const activity = Object.hasOwn(current.works, workId) ? current.works[workId] ?? emptyActivity : emptyActivity;
      const next = change(activity);
      return activity === next ? current : { ...current, works: { ...current.works, [workId]: next } };
    });
  }

  function changeQuote(id: string, quote: ReaderQuote | null) {
    const quotes = snapshot.quotes.filter(saved => saved.id !== id);
    if (quote) quotes.push(quote);
    snapshot = { ...snapshot, quotes: quotes.sort(newestFirst) };
    if (quotePrefix !== null) {
      const quoteKey = quotePrefix + id;
      try {
        if (quote) window.localStorage.setItem(quoteKey, JSON.stringify(quote));
        else window.localStorage.removeItem(quoteKey);
        unsavedQuotes.delete(id);
      } catch {
        unsavedQuotes.set(id, quote);
      }
    }
    publish();
  }

  return {
    getSnapshot,
    subscribe,
    savePosition(workId: string, position: ReaderPosition, percent: number, currentPercent = position.percent ?? percent) {
      const validPosition = positionFrom({ ...position, percent: currentPercent });
      if (!validPosition) return;
      updateWork(workId, activity => ({
        ...activity,
        position: validPosition,
        maxProgress: Math.max(activity.maxProgress, bounded(percent, 0, 100, 0)),
        lastActivityAt: new Date().toISOString(),
      }));
    },
    setCompleted(workId: string, completed = true) {
      updateWork(workId, activity => activity.completed === completed
        ? activity
        : { ...activity, completed, lastActivityAt: new Date().toISOString() });
    },
    addBookmark(input: BookmarkInput) {
      const bookmark = bookmarkFrom({ ...input, createdAt: new Date().toISOString() });
      if (!bookmark) return;
      update(current => current.bookmarks.some(saved => sameBookmark(saved, bookmark.workId, bookmark.paragraphId))
        ? current
        : { ...current, bookmarks: [bookmark, ...current.bookmarks] });
    },
    removeBookmark(workId: string, paragraphId: string) {
      update(current => {
        const bookmarks = current.bookmarks.filter(saved => !sameBookmark(saved, workId, paragraphId));
        return bookmarks.length === current.bookmarks.length ? current : { ...current, bookmarks };
      });
    },
    updateSettings(settings: Partial<ReaderSettings>) {
      update(current => ({ ...current, settings: settingsFrom({ ...current.settings, ...settings }) }));
    },
    addQuote(input: ReaderQuoteInput) {
      if (key !== null && !canWriteAccountBrowserStorage(key)) return false;
      const quote = quoteFrom({ ...input, createdAt: new Date().toISOString() });
      if (!quote) return false;
      const { quotes } = getSnapshot();
      if (quotes.some(saved => saved.id === quote.id)) return false;
      if (quotePrefix !== null && readQuote(quotePrefix + quote.id, quote.id)) return false;
      changeQuote(quote.id, quote);
      return true;
    },
    removeQuote(id: string) {
      if (key !== null && !canWriteAccountBrowserStorage(key)) return;
      getSnapshot();
      changeQuote(id, null);
    },
  };
}
