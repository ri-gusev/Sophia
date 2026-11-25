"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { clearAccountLessonStorage } from "@/features/course-lesson/lesson-resume";
import { accountRequest, navigateAfterAccountChange } from "./account-client";
import styles from "./account.module.css";

const withdrawLabel = "Отозвать согласие и удалить аккаунт";

export function ProfilePrivacy({ accountId }: { accountId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirming || pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await accountRequest("withdraw-consent", { accountId, password: data.get("password"), confirm: data.get("confirm") === "on" });
      clearAccountLessonStorage(accountId);
      navigateAfterAccountChange("/", accountId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось удалить аккаунт.");
      setPending(false);
    }
  }

  return <section className={`glass ${styles.card} ${styles.journey}`} aria-labelledby="profile-privacy-title">
    <h2 id="profile-privacy-title">Персональные данные</h2>
    <p>При удалении аккаунта сохраняемые в нём данные и учебный прогресс удаляются, а вход завершается на всех устройствах.</p>
    {!confirming ? <div className={styles.actions}>
      <Button type="button" variant="outline" onClick={() => setConfirming(true)}>{withdrawLabel}</Button>
    </div> : <form className={styles.nameForm} method="post" onSubmit={submit} aria-busy={pending}>
      <div className={styles.field}>
        <label htmlFor="profile-current-password">Текущий пароль</label>
        <input id="profile-current-password" type="password" name="password" autoComplete="current-password" required />
      </div>
      <label className={styles.legalChoice}>
        <input type="checkbox" name="confirm" required /> Подтверждаю отзыв согласия и удаление аккаунта.
      </label>
      <div role="alert" className={styles.error}>{error}</div>
      <div className={styles.actions}>
        <Button type="submit" disabled={pending}>{withdrawLabel}</Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => { setConfirming(false); setError(""); }}>Отмена</Button>
      </div>
    </form>}
  </section>;
}
