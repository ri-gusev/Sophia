import { accountChangeKey } from "../account/account-client";
import { accountStoragePrefix } from "../account/account-storage";
import { getMoscowDay, nextMoscowMidnight } from "./daily-calendar";
import { parseProgress, recordAnswer, type DailyProgress } from "./daily-streak";

export function quizStorageKey(accountId: string | null) {
  return (accountId === null ? "sophia." : accountStoragePrefix(accountId)) + "daily-quiz.v1";
}

type Snapshot = {
  day: number;
  progress: DailyProgress | null;
  status: "loading" | "ready" | "account-unavailable" | "storage-unavailable" | "stale";
};

export function createDailyQuizStore(initialDay: number, key: string | null) {
  const initial: Snapshot = { day: initialDay, progress: null, status: key === null ? "account-unavailable" : "loading" };
  let snapshot = initial;
  let notify: (() => void) | undefined;
  let sessionMarker: string | null | undefined;
  let timer: number;
  let pending = false;

  function publish(value: Snapshot) {
    snapshot = value;
    notify?.();
  }

  function refresh() {
    const day = getMoscowDay();
    if (key === null || snapshot.status === "stale") {
      publish({ ...snapshot, day });
      return;
    }
    try {
      const marker = localStorage.getItem(accountChangeKey);
      if (sessionMarker === undefined) sessionMarker = marker;
      if (marker !== sessionMarker) {
        publish({ day, progress: null, status: "stale" });
        return;
      }
      const progress = parseProgress(localStorage.getItem(key));
      publish({ day, progress, status: "ready" });
    } catch {
      publish({ day, progress: null, status: "storage-unavailable" });
    }
  }

  function wake() {
    window.clearTimeout(timer);
    refresh();
    const untilMidnight = nextMoscowMidnight(snapshot.day) - Date.now();
    timer = window.setTimeout(wake, Math.max(1, untilMidnight));
  }

  function onStorage(event: StorageEvent) {
    if (event.key === accountChangeKey && event.newValue !== sessionMarker) {
      publish({ ...snapshot, progress: null, status: "stale" });
    } else if (event.key === key || event.key === null) {
      wake();
    }
  }

  function subscribe(listener: () => void) {
    notify = listener;
    wake();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      notify = undefined;
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }

  async function submit(day: number, selectedIndex: number) {
    if (key === null || pending) return false;
    const storageKey = key;
    pending = true;
    function commit() {
      if (!notify) return false;
      // Re-read inside the lock, after any preceding tab's write and any midnight rollover.
      wake();
      if (snapshot.status !== "ready" || snapshot.day !== day) return false;
      const progress = recordAnswer(snapshot.progress, day, selectedIndex);
      if (!progress) return false;
      localStorage.setItem(storageKey, JSON.stringify(progress));
      publish({ day, progress, status: "ready" });
      return true;
    }
    try {
      return await (navigator.locks ? navigator.locks.request(storageKey, commit) : commit());
    } finally {
      pending = false;
    }
  }

  return { subscribe, getSnapshot: () => snapshot, getServerSnapshot: () => initial, submit };
}
