export type AccountUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
  emailVerifiedAt: number;
};

export const ACCOUNT_LIMITS = {
  inputMax: 50,
  passwordMin: 8,
} as const;

const invalidText = /[\p{Cc}\p{Cs}]/u;
const existingPasswordMax = 128;

export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string" || value.length > ACCOUNT_LIMITS.inputMax || invalidText.test(value) || /\p{Bidi_Control}/u.test(value)) return null;
  const name = value.trim().normalize("NFC");
  return name && name.length <= ACCOUNT_LIMITS.inputMax ? name : null;
}

export function normalizeEmail(value: unknown, maxLength = 254): string | null {
  if (typeof value !== "string") return null;
  if (value.length > maxLength) return null;
  const input = value.trim();
  if (invalidText.test(input)) return null;
  const [local, domain, extra] = input.split("@");
  if (extra !== undefined || !local || local.length > 64 || !domain || /[\s/:?#%\\\[\]]/u.test(domain)) return null;
  if (!/^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/i.test(local)) return null;
  let host: string;
  try {
    host = new URL(`https://${domain}`).hostname;
  } catch {
    return null;
  }
  if (!host || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/.test(host)) return null;
  if (/^\d+(?:\.\d+)+$/.test(host)) return null;
  const email = `${local.toLowerCase()}@${host}`;
  return email.length <= maxLength ? email : null;
}

export function isLoginPassword(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || invalidText.test(value)) return false;
  const length = [...value].length;
  return length >= ACCOUNT_LIMITS.passwordMin && length <= existingPasswordMax;
}

export function passwordError(value: unknown): string | null {
  const length = typeof value === "string" ? [...value].length : 0;
  if (length < ACCOUNT_LIMITS.passwordMin || typeof value !== "string" || !value.trim()) {
    return `Введите пароль длиной от ${ACCOUNT_LIMITS.passwordMin} символов.`;
  }
  if (value.length > ACCOUNT_LIMITS.inputMax) return `Пароль должен содержать не больше ${ACCOUNT_LIMITS.inputMax} символов.`;
  return invalidText.test(value) ? "Пароль содержит недопустимые символы." : null;
}

export function passwordPairError(value: unknown, confirmation: unknown): string | null {
  return passwordError(value) ?? (value !== confirmation ? "Пароли не совпадают." : null);
}
