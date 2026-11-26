import { accountStoragePrefix, canWriteAccountBrowserStorage } from "../account/account-storage.ts";

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
}>;

export type ReaderBookmark = BookmarkInput & Readonly<{ createdAt: string }>;

type ReaderData = Readonly<{
  settings: ReaderSettings;
  works: Readonly<Partial<Record<string, ReaderWorkActivity>>>;
  bookmarks: readonly ReaderBookmark[];
}>;

const emptyActivity: ReaderWorkActivity = { position: null, maxProgress: 0, lastActivityAt: null, completed: false };
const emptyData: ReaderData = { settings: READER_DEFAULT_SETTINGS, works: {}, bookmarks: [] };
const emptySnapshot = { ...emptyData, ready: true };
export const readerServerSnapshot = { ...emptyData, ready: false };

export function readerStorageKey(accountId: string | null) {
  return (accountId === null ? "sophia." : accountStoragePrefix(accountId)) + "reader.v1";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function bounded(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
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
  const { sectionId, paragraphId, fraction } = record(value);
  return typeof sectionId === "string" && sectionId && typeof paragraphId === "string" && paragraphId
    ? { sectionId, paragraphId, fraction: bounded(fraction, 0, 1, 0) }
    : null;
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
  const { workId, sectionId, paragraphId, excerpt, reference, createdAt } = record(value);
  const date = dateFrom(createdAt);
  if (!date || typeof workId !== "string" || !workId || typeof sectionId !== "string" || !sectionId
    || typeof paragraphId !== "string" || !paragraphId || typeof excerpt !== "string" || typeof reference !== "string") return null;
  return { workId, sectionId, paragraphId, excerpt, reference, createdAt: date };
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

export function createReaderLocalStore(accountId: string | null | undefined) {
  // A failed session lookup must never read or write the guest's saved history.
  const key = accountId === undefined ? null : readerStorageKey(accountId);
  const listeners = new Set<() => void>();
  let lastRaw: string | null | undefined;
  let snapshot = emptySnapshot;

  function getSnapshot() {
    if (key === null) return snapshot;
    if (!canWriteAccountBrowserStorage(key)) return emptySnapshot;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== lastRaw) {
        lastRaw = raw;
        snapshot = { ...parseData(raw), ready: true };
      }
    } catch { /* Keep the last usable snapshot while browser storage is unavailable. */ }
    return snapshot;
  }

  function publish() {
    for (const listener of listeners) listener();
  }

  function onStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) publish();
  }

  function subscribe(listener: () => void) {
    if (key !== null && !listeners.size) window.addEventListener("storage", onStorage);
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
    snapshot = { settings, works, bookmarks, ready: true };
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

  return {
    getSnapshot,
    subscribe,
    savePosition(workId: string, position: ReaderPosition, percent: number) {
      const validPosition = positionFrom(position);
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
  };
}
