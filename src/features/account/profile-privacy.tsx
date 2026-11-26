"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { clearAccountLessonStorage } from "@/features/course-lesson/lesson-resume";
import { accountRequest, navigateAfterAccountChange } from "./account-client";
import styles from "./account.module.css";
import settings from "./profile-settings.module.css";

const withdrawLabel = "Отозвать согласие и удалить аккаунт";

export function ProfilePrivacy({ accountId }: { accountId: string }) {
  const withdrawButton = useRef<HTMLButtonElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
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

  return <section className={settings.danger} aria-labelledby="profile-privacy-title">
    <h3 id="profile-privacy-title">Удаление аккаунта</h3>
    <p>При удалении аккаунта сохраняемые в нём данные и учебный прогресс удаляются, а вход завершается на всех устройствах.</p>
    {!confirming ? <div className={styles.actions}>
      <Button ref={withdrawButton} className={settings.dangerButton} type="button" variant="outline" size="sm" onClick={() => {
        setConfirming(true);
        requestAnimationFrame(() => passwordInput.current?.focus());
      }}>{withdrawLabel}</Button>
    </div> : <form className={styles.nameForm} method="post" onSubmit={submit} aria-busy={pending}>
      <div className={styles.field}>
        <label htmlFor="profile-current-password">Текущий пароль</label>
        <input ref={passwordInput} id="profile-current-password" type="password" name="password" autoComplete="current-password" required />
      </div>
      <label className={styles.legalChoice}>
        <input type="checkbox" name="confirm" required /> Подтверждаю отзыв согласия и удаление аккаунта.
      </label>
      <div role="alert" className={styles.error}>{error}</div>
      <div className={styles.actions}>
        <Button className={settings.dangerButton} type="submit" variant="outline" size="sm" disabled={pending}>{withdrawLabel}</Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => {
          setConfirming(false);
          setError("");
          requestAnimationFrame(() => withdrawButton.current?.focus());
        }}>Отмена</Button>
      </div>
    </form>}
  </section>;
}
