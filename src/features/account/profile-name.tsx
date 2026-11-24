"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { accountRequest } from "./account-client";
import { ACCOUNT_LIMITS, normalizeDisplayName } from "./account-contract";
import styles from "./account.module.css";

export function ProfileName({ accountId, displayName }: { accountId: string; displayName: string }) {
  const router = useRouter();
  const editButton = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function stopEditing() {
    setEditing(false);
    setError("");
    requestAnimationFrame(() => editButton.current?.focus());
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const name = normalizeDisplayName(new FormData(event.currentTarget).get("displayName"));
    if (!name) {
      setError(`Введите имя длиной до ${ACCOUNT_LIMITS.inputMax} символов.`);
      nameInput.current?.focus();
      return;
    }
    setError("");
    setPending(true);
    try {
      await accountRequest("profile", { accountId, displayName: name });
      stopEditing();
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось сохранить имя.");
    }
    setPending(false);
  }

  if (!editing) return <Button ref={editButton} variant="outline" size="sm" onClick={() => {
    setEditing(true);
    requestAnimationFrame(() => nameInput.current?.focus());
  }}>Изменить имя</Button>;

  return <form className={styles.nameForm} method="post" noValidate onSubmit={save}>
    <div className={styles.field}>
      <label htmlFor="profile-name">Отображаемое имя</label>
      <input ref={nameInput} id="profile-name" name="displayName"
        defaultValue={displayName.length <= ACCOUNT_LIMITS.inputMax ? displayName : ""}
        autoComplete="name" maxLength={ACCOUNT_LIMITS.inputMax} required
        aria-invalid={!!error || undefined} aria-describedby={error ? "profile-name-error" : undefined} />
      {error && <p id="profile-name-error" className={styles.error} role="alert">{error}</p>}
    </div>
    <div className={styles.actions}>
      <Button size="sm" type="submit" disabled={pending}>Сохранить имя</Button>
      <Button variant="ghost" size="sm" type="button" disabled={pending} onClick={stopEditing}>Отмена</Button>
    </div>
  </form>;
}
