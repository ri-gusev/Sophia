"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { clearAccountLessonStorage } from "@/features/course-lesson/lesson-resume";
import { accountChangeKey, accountErasurePrefix, refreshAfterIdentityChange } from "./account-client";
import { suspendAccountBrowserStorage } from "./account-storage";

type Viewer = { id: string; displayName: string };
const ViewerContext = createContext<Viewer | null | undefined>(null);

function sessionMarker() {
  try { return localStorage.getItem(accountChangeKey); } catch { return null; }
}

export function AccountViewer({ viewer, children }: { viewer: Viewer | null | undefined; children: ReactNode }) {
  useEffect(() => {
    const marker = sessionMarker();
    function onStorage(event: StorageEvent) {
      if (event.key !== accountChangeKey) return;
      if (event.newValue?.startsWith(accountErasurePrefix)) return;
      if (viewer && event.oldValue === accountErasurePrefix + viewer.id) clearAccountLessonStorage(viewer.id);
      refreshAfterIdentityChange();
    }
    function onRestore(event: PageTransitionEvent) {
      if (!event.persisted) return;
      const identityChanged = sessionMarker() !== marker;
      if (identityChanged && viewer) suspendAccountBrowserStorage(viewer.id);
      if (identityChanged || viewer) refreshAfterIdentityChange();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onRestore);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onRestore);
    };
  }, [viewer]);
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export const useAccountViewer = () => useContext(ViewerContext) ?? null;

export function useAccountViewerId() {
  const viewer = useContext(ViewerContext);
  return viewer === undefined ? undefined : viewer?.id ?? null;
}
