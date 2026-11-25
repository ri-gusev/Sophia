"use client";

const requestFailed = "Не удалось выполнить запрос. Попробуйте ещё раз.";

export async function accountRequest(action: string, data: object) {
  const response = await fetch(`/api/account/${action}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => { throw new Error(requestFailed); });
  const result: { ok?: unknown; error?: unknown } | null = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) throw new Error(typeof result?.error === "string" ? result.error : requestFailed);
}

export const accountChangeKey = "sophia.account-session-change";
export const accountErasurePrefix = "erase:";

export function navigateAfterAccountChange(destination: string, erasedAccountId?: string) {
  try {
    const marker = window.crypto.randomUUID();
    // Storage events carry the transient value to open tabs before it is replaced.
    if (erasedAccountId) localStorage.setItem(accountChangeKey, accountErasurePrefix + erasedAccountId);
    localStorage.setItem(accountChangeKey, marker);
  } catch { /* Account changes still refresh the current document. */ }
  window.location.replace(destination);
}

export function refreshAfterIdentityChange() {
  const { pathname, search, hash } = window.location;
  if (pathname === "/learn" && new URLSearchParams(hash.slice(1)).has("lesson")) {
    // Opening the previous account's slide would save it as the new viewer's last position.
    window.history.replaceState(window.history.state, "", pathname + search);
  }
  window.location.reload();
}
