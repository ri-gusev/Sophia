"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { confirmationKinds, legalConfirmations, legalDocuments, registrationClosed, type ConfirmationKind, type LegalVersions } from "@/features/legal/contract";
import { accountRequest, navigateAfterAccountChange } from "./account-client";
import {
  ACCOUNT_LIMITS, APPROVED_ACCOUNT_EMAIL_DOMAINS, UNSUPPORTED_ACCOUNT_EMAIL_MESSAGE, isApprovedAccountEmail, isLoginPassword,
  normalizeDisplayName, normalizeEmail, passwordError, passwordPairError,
} from "./account-contract";
import styles from "./account.module.css";

type Mode = "register" | "login" | "forgot" | "verify" | "reset";
type Field = "displayName" | "email" | "password" | "confirmPassword";

const forms = {
  register: {
    title: "Регистрация", action: "Создать аккаунт",
    fields: ["displayName", "email", "password", "confirmPassword"],
    success: "Проверьте почту. Если адрес можно зарегистрировать, мы отправим ссылку для подтверждения.",
  },
  login: { title: "Вход в Sophia", action: "Войти", fields: ["email", "password"], success: "" },
  forgot: {
    title: "Восстановление доступа", action: "Отправить ссылку", fields: ["email"],
    success: "Если для этого email есть аккаунт, мы отправим ссылку для восстановления.",
  },
  verify: {
    title: "Подтверждение email", action: "Подтвердить email", fields: ["password", "confirmPassword"],
    description: "Установите пароль для аккаунта. Можно ввести ту же парольную фразу, которую вы указали при регистрации.",
    success: "Email подтверждён. Теперь можно войти в Sophia.",
  },
  reset: {
    title: "Новый пароль", action: "Сохранить пароль", fields: ["password", "confirmPassword"],
    success: "Пароль обновлён. Войдите с новым паролем.",
  },
} satisfies Record<Mode, { title: string; action: string; fields: Field[]; description?: string; success: string }>;

const fieldLabels: Record<Field, string> = {
  displayName: "Отображаемое имя", email: "Email", password: "Пароль", confirmPassword: "Повтор пароля",
};

const subscribeToken = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get("token");
const initialToken = () => undefined;

function validate(mode: Mode, form: Partial<Record<Field, string>>) {
  const errors: Partial<Record<Field, string>> = {};
  if (mode === "register" && !normalizeDisplayName(form.displayName)) {
    errors.displayName = `Введите имя длиной до ${ACCOUNT_LIMITS.inputMax} символов.`;
  }
  if (mode === "register") {
    if (!form.email || !normalizeEmail(form.email, ACCOUNT_LIMITS.inputMax)) {
      errors.email = `Введите корректный email длиной до ${ACCOUNT_LIMITS.inputMax} символов.`;
    } else if (!isApprovedAccountEmail(form.email)) {
      errors.email = UNSUPPORTED_ACCOUNT_EMAIL_MESSAGE;
    }
  }
  if ((mode === "login" || mode === "forgot") && !normalizeEmail(form.email)) {
    errors.email = "Введите корректный email.";
  }
  if (mode === "login") {
    if (!isLoginPassword(form.password)) errors.password = "Введите пароль.";
  } else if (mode !== "forgot") {
    const invalidPassword = passwordError(form.password);
    if (invalidPassword) errors.password = invalidPassword;
    if (!invalidPassword) {
      const invalidConfirmation = passwordPairError(form.password, form.confirmPassword);
      if (invalidConfirmation) errors.confirmPassword = invalidConfirmation;
    }
  }
  return errors;
}

export function AccountForm({ mode, destination = "/profile", recoveryComplete = false, legalVersions }: {
  mode: Mode; destination?: string; recoveryComplete?: boolean; legalVersions?: LegalVersions | null;
}) {
  const token = useSyncExternalStore<string | null | undefined>(subscribeToken, readToken, initialToken);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [missingConfirmations, setMissingConfirmations] = useState<ConfirmationKind[]>([]);
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendAccepted, setResendAccepted] = useState(false);
  const form: { title: string; action: string; fields: Field[]; description?: string; success: string } = forms[mode];
  const needsToken = mode === "verify" || mode === "reset";
  const hasToken = typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
  const registration = mode === "register" || mode === "verify";
  const closed = registration && !legalVersions;
  const canSubmit = !closed && (!needsToken || hasToken);
  // Access to existing accounts can require credentials saved under the earlier limits.
  const maxLength = mode === "login" || mode === "forgot" ? undefined : ACCOUNT_LIMITS.inputMax;
  const status = resendAccepted ? "Если адрес ожидает подтверждения, мы отправим ссылку ещё раз."
    : done ? form.success : recoveryComplete ? forms.reset.success : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canSubmit) return;
    const element = event.currentTarget;
    const data = new FormData(element);
    const values = Object.fromEntries(form.fields.map(field => [field, String(data.get(field) ?? "")]));
    const validation = validate(mode, values);
    const missing = legalVersions ? confirmationKinds.filter(kind => data.get(kind) !== "on") : [];
    setErrors(validation);
    setMissingConfirmations(missing);
    setFailure("");
    const invalidField = form.fields.find(field => validation[field]) ?? missing[0];
    if (invalidField) {
      setFailure("Проверьте отмеченные поля.");
      const input = element.elements.namedItem(invalidField);
      if (input instanceof HTMLElement) input.focus();
      return;
    }

    setPending(true);
    try {
      const confirmations = legalVersions ? { age: true, terms: true, consent: true, legalVersions } : {};
      const body = { ...values, ...confirmations, ...(needsToken && { token }) };
      await accountRequest(mode, body);
      element.reset();
      if (mode === "login" || mode === "reset") {
        navigateAfterAccountChange(mode === "reset" ? "/login?reset=success" : destination);
        return;
      }
      if (needsToken) window.history.replaceState(window.history.state, "", window.location.pathname);
      if (mode === "register") setVerificationEmail(normalizeEmail(values.email, ACCOUNT_LIMITS.inputMax));
      setDone(true);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Не удалось выполнить запрос. Попробуйте ещё раз.");
    }
    setPending(false);
  }

  async function resend() {
    if (pending || !verificationEmail) return;
    setPending(true);
    setFailure("");
    setResendAccepted(false);
    try {
      await accountRequest("resend-verification", { email: verificationEmail });
      setResendAccepted(true);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Не удалось повторить отправку.");
    } finally {
      setPending(false);
    }
  }

  return <main id="main" className={`container ${styles.formPage}`}>
    <div className={`glass ${styles.card} ${styles.authCard}`}>
      <h1>{form.title}</h1>
      {form.description && !done && !closed && <p className={styles.description}>{form.description}</p>}
      <div className={styles.notice} role="status">{closed ? registrationClosed : status}</div>
      {!done && canSubmit && <form className={styles.form} method="post" noValidate onSubmit={submit} aria-busy={pending}>
        {form.fields.map(field => {
          const isPassword = field === "password" || field === "confirmPassword";
          const hint = field === "password" && mode !== "login";
          const domainHint = mode === "register" && field === "email";
          const error = errors[field];
          const inputId = `account-${field}`;
          return <div className={styles.field} key={field}>
            <label htmlFor={inputId}>{fieldLabels[field]}</label>
            <input id={inputId} name={field} type={isPassword ? "password" : field === "email" ? "email" : "text"}
              autoComplete={isPassword ? mode === "login" ? "current-password" : "new-password" : field === "email" ? mode === "login" ? "username" : "email" : "name"}
              maxLength={maxLength}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={[(hint || domainHint) ? `${inputId}-hint` : "", error ? `${inputId}-error` : ""].filter(Boolean).join(" ") || undefined} />
            {hint && <p id={`${inputId}-hint`} className={styles.hint}>От {ACCOUNT_LIMITS.passwordMin} до {ACCOUNT_LIMITS.inputMax} символов. Можно использовать парольную фразу.</p>}
            {domainHint && <p id={`${inputId}-hint`} className={styles.hint}>Поддерживаемые домены: {APPROVED_ACCOUNT_EMAIL_DOMAINS.join(", ")}.</p>}
            {error && <p className={styles.error} id={`${inputId}-error`}>{error}</p>}
          </div>;
        })}
        {legalVersions && <fieldset className={styles.legalChoices}>
          <legend>{mode === "verify" ? "Подтвердите условия ещё раз" : "Условия регистрации"}</legend>
          {confirmationKinds.map(kind => {
            const missing = missingConfirmations.includes(kind);
            return <div className={styles.legalChoice} key={kind}>
              <input type="checkbox" autoComplete="off" id={`account-${kind}`} name={kind} required
                aria-invalid={missing || undefined} aria-describedby={missing ? "account-legal-error" : undefined}
                onChange={() => setMissingConfirmations(current => current.filter(item => item !== kind))} />
              <label htmlFor={`account-${kind}`}>{legalConfirmations[kind]}</label>
            </div>;
          })}
          {missingConfirmations.length > 0 && <p className={styles.error} id="account-legal-error">Отметьте каждое из трёх подтверждений.</p>}
        </fieldset>}
        <div role="alert" className={styles.error}>{failure}</div>
        <Button type="submit" disabled={pending || token === undefined}>{pending ? "Подождите…" : form.action}</Button>
      </form>}
      {done && verificationEmail && <div className={styles.form}>
        <Button type="button" variant="outline" disabled={pending} onClick={resend}>
          {pending ? "Отправляем…" : "Отправить повторно"}
        </Button>
        {failure && <p role="alert" className={styles.error}>{failure}</p>}
      </div>}
      <noscript><p className={styles.description}>Для работы с аккаунтом включите JavaScript.</p></noscript>
      {needsToken && !closed && token !== undefined && !hasToken && !done && <p role="alert" className={styles.error}>Откройте ссылку целиком из письма Sophia.</p>}
      <div className={styles.formLinks}>
        {mode === "login" ? <>
          <Link href="/forgot-password">Забыли пароль?</Link>
          <p className={styles.registrationPrompt}>Нет аккаунта? <Link href="/register">Зарегистрироваться</Link></p>
        </> : <Link href="/login">Войти</Link>}
        {registration && Object.values(legalDocuments).map(({ href, title }) => <Link key={href} href={href}>{title}</Link>)}
        {mode === "verify" && !done && !closed && <Link href="/register">Запросить новую ссылку</Link>}
        {mode === "reset" && !done && <Link href="/forgot-password">Запросить новую ссылку</Link>}
      </div>
    </div>
  </main>;
}
