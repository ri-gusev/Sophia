import { appendFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { createEmailService } from "../../../lib/server/email-service.ts";
import { accountSettings } from "./config.ts";
import { accountUnavailable } from "./errors.ts";

type AccountMail = { to: string; kind: "verify" | "reset"; url: string };
type MailTransport = (mail: AccountMail) => Promise<void>;

export function accountMailTransport(): MailTransport {
  const { mode, path } = accountSettings();
  const { ACCOUNT_MAIL_TRANSPORT, ACCOUNT_TEST_OUTBOX } = process.env;
  if (mode === "local" && ACCOUNT_MAIL_TRANSPORT === "test" && ACCOUNT_TEST_OUTBOX && isAbsolute(ACCOUNT_TEST_OUTBOX) &&
      resolve(ACCOUNT_TEST_OUTBOX) !== path) {
    return mail => appendFile(ACCOUNT_TEST_OUTBOX, JSON.stringify(mail) + "\n", { encoding: "utf8", mode: 0o600 });
  }

  if (mode !== "proxy" || ACCOUNT_MAIL_TRANSPORT !== "smtp") throw accountUnavailable();
  const email = createEmailService();
  if (!email) throw accountUnavailable();
  return async mail => {
    const verify = mail.kind === "verify";
    const subject = verify ? "Подтверди почту в Sophia" : "Восстановление доступа к Sophia";
    const text = verify
      ? `Перейди по ссылке, чтобы подтвердить почту и установить пароль. Ссылка действует 24 часа.\n${mail.url}`
      : `Перейди по ссылке, чтобы установить новый пароль. Ссылка действует 30 минут.\n${mail.url}`;
    await email.send({
      to: mail.to, subject, text: `${text}\n\nЕсли ты не отправлял этот запрос, просто проигнорируй письмо.`,
    });
  };
}
