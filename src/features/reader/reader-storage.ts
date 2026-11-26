"use client";

import { useSyncExternalStore } from "react";
import { useAccountViewerId } from "@/features/account/account-viewer";
import { createReaderLocalStore, readerServerSnapshot } from "./reader-local-store";

export { READER_DEFAULT_SETTINGS, READER_FONT_SIZE, READER_LINE_HEIGHT } from "./reader-local-store";
export type { ReaderBookmark, ReaderPosition, ReaderSettings, ReaderTheme, ReaderWorkActivity } from "./reader-local-store";
export type { ReaderQuote, ReaderQuoteInput } from "./reader-quote-types";

const browserStores = new Map<string | null | undefined, ReturnType<typeof createReaderLocalStore>>();
const serverStore = createReaderLocalStore(null);
const getServerSnapshot = () => readerServerSnapshot;

function readerStore(accountId: string | null | undefined) {
  if (typeof window === "undefined") return serverStore;
  let store = browserStores.get(accountId);
  if (!store) {
    store = createReaderLocalStore(accountId);
    browserStores.set(accountId, store);
  }
  return store;
}

export function useReaderStorage() {
  const accountId = useAccountViewerId();
  const { subscribe, getSnapshot, savePosition, setCompleted, addBookmark, removeBookmark, updateSettings, addQuote, removeQuote } = readerStore(accountId);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...snapshot, savePosition, setCompleted, addBookmark, removeBookmark, updateSettings, addQuote, removeQuote };
}
