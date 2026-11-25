"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { clearAccountLessonStorage, suspendAccountLessonStorage } from "@/features/course-lesson/lesson-resume";
import { accountChangeKey, accountErasurePrefix, refreshAfterIdentityChange } from "./account-client";

type Viewer = { id: string; displayName: string };
const ViewerContext = createContext<Viewer | null>(null);

function sessionMarker() {
  try { return localStorage.getItem(accountChangeKey); } catch { return null; }
}

export function AccountViewer({ viewer, children }: { viewer: Viewer | null; children: ReactNode }) {
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
      if (identityChanged && viewer) suspendAccountLessonStorage(viewer.id);
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

export const useAccountViewer = () => useContext(ViewerContext);
