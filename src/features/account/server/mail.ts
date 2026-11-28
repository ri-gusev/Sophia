import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { createEmailService } from "../../../lib/server/email-service.ts";
import { accountSettings } from "./config.ts";
import { accountUnavailable } from "./errors.ts";

type AccountMail = { to: string; kind: "verify" | "reset"; url: string };
type MailTransport = (mail: AccountMail) => Promise<void>;

function inside(root: string, path: string): boolean {
  const child = relative(root, path);
  return !isAbsolute(child) && child !== ".." && !child.startsWith(".." + sep);
}

async function writeTestMail(path: string, database: string, mail: AccountMail) {
  const directory = await realpath(dirname(path));
  const target = resolve(directory, basename(path));
  const root = await realpath(process.cwd());
  if (inside(root, target) && !inside(resolve(root, "artifacts"), target) && !inside(resolve(root, "storage", "accounts"), target)) {
    throw accountUnavailable();
  }
  const publicRoot = await realpath(resolve(root, "public")).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  if (publicRoot && inside(publicRoot, target)) throw accountUnavailable();
  if (relative(target, await realpath(database)) === "") throw accountUnavailable();
  const parent = await lstat(directory);
  const uid = process.getuid?.();
  if (uid !== undefined && (parent.uid !== uid || (parent.mode & 0o077) !== 0)) throw accountUnavailable();
  const existing = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  if (existing && !existing.isFile()) throw accountUnavailable();
  const file = await open(target, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0), 0o600);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.nlink !== 1 || (uid !== undefined && (stat.uid !== uid || (stat.mode & 0o077) !== 0))) {
      throw accountUnavailable();
    }
    await file.appendFile(JSON.stringify(mail) + "\n", "utf8");
  } finally {
    await file.close();
  }
}

export function accountMailTransport(): MailTransport {
  const { mode, path } = accountSettings();
  const { ACCOUNT_MAIL_TRANSPORT, ACCOUNT_TEST_OUTBOX } = process.env;
  if (mode === "local" && ACCOUNT_MAIL_TRANSPORT === "test" && ACCOUNT_TEST_OUTBOX && isAbsolute(ACCOUNT_TEST_OUTBOX) &&
      resolve(ACCOUNT_TEST_OUTBOX) !== path) {
    return mail => writeTestMail(ACCOUNT_TEST_OUTBOX, path, mail);
  }

  if (mode !== "proxy" || ACCOUNT_MAIL_TRANSPORT !== "smtp") throw accountUnavailable();
  const email = createEmailService();
  if (!email) throw accountUnavailable();
  return async mail => {
    const verify = mail.kind === "verify";
    const subject = verify ? "Подтверди почту в Sophia" : "Восстановление доступа к Sophia";
    const text = verify
      ? `Перейди по ссылке, чтобы подтвердить почту и установить пароль. Ссылка действует в пределах 24 часов с момента подачи заявки.\n${mail.url}`
      : `Перейди по ссылке, чтобы установить новый пароль. Ссылка действует 30 минут.\n${mail.url}`;
    await email.send({
      to: mail.to, subject, text: `${text}\n\nЕсли ты не отправлял этот запрос, просто проигнорируй письмо.`,
    });
  };
}
