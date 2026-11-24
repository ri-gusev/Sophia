"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { accountChangeKey, refreshAfterIdentityChange } from "./account-client";

type Viewer = { id: string; displayName: string };
const ViewerContext = createContext<Viewer | null>(null);

function sessionMarker() {
  try { return localStorage.getItem(accountChangeKey); } catch { return null; }
}

export function AccountViewer({ viewer, children }: { viewer: Viewer | null; children: ReactNode }) {
  useEffect(() => {
    const marker = sessionMarker();
    function onStorage(event: StorageEvent) {
      if (event.key === accountChangeKey) refreshAfterIdentityChange();
    }
    function onRestore(event: PageTransitionEvent) {
      if (!event.persisted) return;
      if (sessionMarker() !== marker || viewer) refreshAfterIdentityChange();
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
