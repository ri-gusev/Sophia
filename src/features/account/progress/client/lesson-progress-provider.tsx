"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { refreshAfterIdentityChange } from "../../account-client";
import {
  EXPECTED_PROGRESS_ACCOUNT_HEADER, type AccountProgress, type ProgressMutation, type ProgressResponse,
} from "../contract";

type Snapshot = {
  status: "ready" | "loading" | "failed" | "stale" | "session-unavailable";
  progress: AccountProgress | null;
  revision?: string;
};

function createProgressStore(accountId: string | null, sessionUnavailable: boolean) {
  const initial: Snapshot = {
    status: sessionUnavailable ? "session-unavailable" : accountId === null ? "ready" : "loading",
    progress: null,
  };
  const listeners = new Set<() => void>();
  let snapshot = initial;
  let queue: Promise<unknown> = Promise.resolve();
  let revision = 0;

  function publish(value: Snapshot) {
    snapshot = value;
    for (const notify of listeners) notify();
  }

  function subscribe(notify: () => void) {
    listeners.add(notify);
    return () => { listeners.delete(notify); };
  }

  function expire(): never {
    publish({ status: "stale", progress: null });
    refreshAfterIdentityChange();
    throw new Error("Account changed");
  }

  // Keep a tab's writes and reads in order. Each response is a committed server snapshot.
  function request(mutation?: ProgressMutation) {
    const expectedRevision = revision;
    const run = queue.then(async (): Promise<ProgressResponse> => {
      if (accountId === null || sessionUnavailable || snapshot.status === "stale" || expectedRevision !== revision) throw new Error("Account changed");
      const response = await fetch("/api/progress", {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
        ...(mutation ? {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...mutation, expectedAccountId: accountId }),
        } : { headers: { [EXPECTED_PROGRESS_ACCOUNT_HEADER]: accountId } }),
      });
      if (expectedRevision !== revision) throw new Error("Account changed");
      if (response.status === 401 || response.status === 409) expire();
      if (!response.ok) throw new Error("Progress request failed");
      const result: ProgressResponse = await response.json();
      if (expectedRevision !== revision) throw new Error("Account changed");
      if (result.accountId !== accountId) expire();
      publish({ status: "ready", progress: result.progress, revision: result.revision });
      return result;
    });
    queue = run.catch(() => {});
    return run;
  }

  function refresh(invalidate = false) {
    if (accountId === null || sessionUnavailable || snapshot.status === "stale") return;
    if (invalidate) revision++;
    const expectedRevision = revision;
    if (!snapshot.progress || invalidate) publish({ status: "loading", progress: null });
    void request().catch(() => {
      if (expectedRevision === revision && snapshot.status === "loading") publish({ status: "failed", progress: null });
    });
  }

  return { accountId, sessionUnavailable, request, refresh, subscribe, snapshot: () => snapshot, initial: () => initial };
}

const ProgressContext = createContext<ReturnType<typeof createProgressStore> | null>(null);

export function LessonProgressProvider({ accountId, sessionUnavailable = false, children }: {
  accountId: string | null;
  sessionUnavailable?: boolean;
  children: ReactNode;
}) {
  return <ProgressScope key={sessionUnavailable ? "unavailable" : accountId ?? "guest"}
    accountId={accountId} sessionUnavailable={sessionUnavailable}>{children}</ProgressScope>;
}

function ProgressScope({ accountId, sessionUnavailable, children }: {
  accountId: string | null;
  sessionUnavailable: boolean;
  children: ReactNode;
}) {
  const [store] = useState(() => createProgressStore(accountId, sessionUnavailable));
  useEffect(() => {
    if (accountId === null || sessionUnavailable) return;
    function refresh() { store.refresh(); }
    function restore(event: PageTransitionEvent) { if (event.persisted) store.refresh(true); }
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", restore);
    };
  }, [accountId, sessionUnavailable, store]);
  return <ProgressContext.Provider value={store}>{children}</ProgressContext.Provider>;
}

export function useProgressStore() {
  const store = useContext(ProgressContext);
  if (!store) throw new Error("LessonProgressProvider is required");
  return store;
}

export function useProgressSnapshot() {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribe, store.snapshot, store.initial);
}
