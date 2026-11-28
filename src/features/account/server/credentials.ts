import { argon2, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { AccountError } from "./errors.ts";

const ARGON_VERSION = "$argon2id$v=19$m=65536,t=3,p=1$";
const HASH_PATTERN = /^([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/;
const DUMMY_SALT = randomBytes(16);
let activeHashes = 0;

export const newToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const validToken = (token: unknown): token is string => typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);

async function derive(password: string, salt: Buffer, onAdmission?: () => void): Promise<Buffer> {
  // Two bounded worker tasks reserve at most 128 MiB per server process for hashing.
  if (activeHashes >= 2) throw new AccountError(429, "Слишком много запросов. Попробуй чуть позже.", 2);
  activeHashes++;
  try {
    onAdmission?.();
    return await new Promise((resolve, reject) => {
      argon2("argon2id", { message: password, nonce: salt, memory: 65536, passes: 3, parallelism: 1, tagLength: 32 },
        (error, hash) => error ? reject(error) : resolve(hash));
    });
  } finally {
    activeHashes--;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return ARGON_VERSION + salt.toString("base64").replace(/=+$/, "") + "$" + hash.toString("base64").replace(/=+$/, "");
}

export async function matchesPassword(password: string, stored?: string, onAdmission?: () => void): Promise<boolean> {
  const encoded = stored?.startsWith(ARGON_VERSION) ? HASH_PATTERN.exec(stored.slice(ARGON_VERSION.length)) : null;
  const derived = await derive(password, encoded ? Buffer.from(encoded[1], "base64") : DUMMY_SALT, onAdmission);
  return encoded !== null && timingSafeEqual(derived, Buffer.from(encoded[2], "base64"));
}
