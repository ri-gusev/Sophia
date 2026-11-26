"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { accountRequest, navigateAfterAccountChange } from "./account-client";
import { initials } from "./account-display";
import { useAccountViewer } from "./account-viewer";

export function LogoutButton({ accountId, className, label = "Выйти", icon }: {
  accountId: string;
  className?: string;
  label?: string;
  icon?: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function logout() {
    setError(false);
    setPending(true);
    try {
      await accountRequest("logout", { accountId });
      navigateAfterAccountChange("/");
    } catch {
      setError(true);
      setPending(false);
    }
  }
  return <>
    <button className={className} type="button" disabled={pending} onClick={logout}>{icon}{pending ? "Выходим…" : label}</button>
    {error && <p className="account-nav-error" role="alert">Не удалось выйти. Обновите страницу и попробуйте ещё раз.</p>}
  </>;
}

export function AccountNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const viewer = useAccountViewer();
  return <div className="account-nav">
    {viewer ? <>
      <Link className="account-nav-profile" href="/profile" onClick={onNavigate}>
        <span className="account-initials" aria-hidden="true">{initials(viewer.displayName)}</span>Профиль
      </Link>
      <LogoutButton accountId={viewer.id} />
    </> : <Link href="/login" onClick={onNavigate}>Войти</Link>}
  </div>;
}
