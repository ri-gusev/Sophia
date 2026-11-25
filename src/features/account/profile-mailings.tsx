"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { legalDocuments } from "@/features/legal/contract";
import { accountRequest } from "./account-client";
import styles from "./account.module.css";

export function ProfileMailings({ accountId, consent }: { accountId: string; consent: boolean | undefined }) {
  const termsLink = useRef<HTMLAnchorElement>(null);
  const [withdrawn, setWithdrawn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function withdraw() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await accountRequest("withdraw-mailing-consent", { accountId });
      setWithdrawn(true);
      termsLink.current?.focus();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось отозвать согласие на рассылки.");
    } finally {
      setPending(false);
    }
  }

  return <section className={`glass ${styles.card} ${styles.journey}`} aria-labelledby="profile-mailings-title">
    <h2 id="profile-mailings-title">Рассылки</h2>
    <p role="status">{consent === undefined ? "Статус согласия временно недоступен."
      : withdrawn ? "Согласие на рассылки отозвано."
      : consent ? "Согласие на рассылки предоставлено." : "Рассылки отключены."}</p>
    <div className={styles.actions}>
      {consent && !withdrawn && <Button type="button" variant="outline" size="sm" onClick={withdraw} disabled={pending}>
        {pending ? "Сохраняем…" : "Отозвать согласие на рассылки"}
      </Button>}
      <Link ref={termsLink} href={legalDocuments.mailings.href}>Условия рассылок</Link>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
