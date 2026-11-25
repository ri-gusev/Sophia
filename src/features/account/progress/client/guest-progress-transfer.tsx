"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { subscribeLessonProgress } from "@/features/course-lesson/lesson-slide-progress";
import { canSaveAccountLessonStorage } from "@/features/course-lesson/lesson-resume";
import type { AccountProgress } from "../contract";
import { collectGuestProgress } from "./guest-progress";
import { useProgressSnapshot, useProgressStore } from "./lesson-progress-provider";
import styles from "./guest-progress-transfer.module.css";

const empty = () => "";

function readOffer(accountId: string | null) {
  if (accountId === null) return "";
  const guest = collectGuestProgress(key => window.localStorage.getItem(key));
  if (!guest) return "";
  const signature = JSON.stringify(guest);
  try {
    return window.localStorage.getItem(receiptKey(accountId)) === signature ? "" : signature;
  } catch { return signature; }
}

function receiptKey(accountId: string) {
  return `sophia.account.${encodeURIComponent(accountId)}.guest-progress-import.v1`;
}

export function GuestProgressTransfer() {
  const router = useRouter();
  const store = useProgressStore();
  const snapshot = useProgressSnapshot();
  const accountId = store.accountId;
  const offer = useSyncExternalStore(subscribeLessonProgress, () => readOffer(accountId), empty);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed" | "later">("idle");

  async function transfer() {
    if (accountId === null || !offer || status === "saving") return;
    const guest: AccountProgress = JSON.parse(offer);
    setStatus("saving");
    try {
      await store.request({ action: "import", ...guest });
    } catch {
      setStatus("failed");
      return;
    }
    if (canSaveAccountLessonStorage(accountId)) {
      try { window.localStorage.setItem(receiptKey(accountId), offer); } catch { /* The server merge can safely be repeated. */ }
    }
    setStatus("saved");
    router.refresh();
  }

  if (status === "saved") return <p className={styles.notice} role="status">Прогресс перенесён в аккаунт.</p>;
  if (!offer || status === "later" || snapshot.status === "stale") return null;
  return <div className={styles.notice}>
    <p>У тебя уже есть прогресс на этом устройстве. Перенести его в аккаунт?</p>
    <div className={styles.actions}>
      <Button type="button" onClick={() => void transfer()} disabled={status === "saving"}>
        {status === "saving" ? "Переносим…" : "Перенести прогресс"}
      </Button>
      <Button type="button" variant="ghost" disabled={status === "saving"} onClick={() => setStatus("later")}>Позже</Button>
    </div>
    {status === "failed" && <p role="alert">Не удалось перенести прогресс. Попробуй ещё раз.</p>}
  </div>;
}
