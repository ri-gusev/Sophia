"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { legalDocuments, mailingConsentVersion } from "@/features/legal/contract";
import { accountRequest } from "./account-client";
import styles from "./account.module.css";
import settings from "./profile-settings.module.css";

export function ProfileMailings({ accountId, consent, canGrant }: { accountId: string; consent: boolean | undefined; canGrant: boolean }) {
  const termsLink = useRef<HTMLAnchorElement>(null);
  const [choice, setChoice] = useState<boolean>();
  const active = choice ?? consent;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function changeConsent() {
    if (pending || active === undefined) return;
    setPending(true);
    setError("");
    try {
      if (active) await accountRequest("withdraw-mailing-consent", { accountId });
      else await accountRequest("grant-mailing-consent", { accountId, mailingConsentVersion });
      setChoice(!active);
      termsLink.current?.focus();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось изменить согласие на рассылки.");
    } finally {
      setPending(false);
    }
  }

  return <div className={settings.mailings}>
    <p role="status">{active === undefined ? "Статус согласия временно недоступен."
      : active ? "Согласие на рассылки предоставлено."
      : choice === false ? "Согласие на рассылки отозвано." : "Рассылки отключены."}</p>
    <div className={styles.actions}>
      {(active === true || (active === false && canGrant)) && <Button type="button" variant="outline" size="sm" onClick={changeConsent} disabled={pending}>
        {pending ? "Сохраняем…" : active ? "Отозвать согласие на рассылки" : "Дать согласие на рассылки"}
      </Button>}
      <Link ref={termsLink} className={settings.link} href={legalDocuments.mailings.href}>Условия рассылок</Link>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}
