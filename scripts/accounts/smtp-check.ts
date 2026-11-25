import process from "node:process";
import { normalizeEmail } from "../../src/features/account/account-contract.ts";
import { createEmailService, SmtpError } from "../../src/lib/server/email-service.ts";

async function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.length === 1 && args[0] === "--verify";
  const to = args.length === 2 && args[0] === "--to" ? normalizeEmail(args[1]) : null;
  if (!verifyOnly && !to) {
    console.error("Использование: node --env-file=.env.local scripts/accounts/smtp-check.ts --verify | --to email");
    process.exitCode = 1;
    return;
  }

  const service = createEmailService();
  if (process.env.SMTP_HOST?.trim() !== "postbox.cloud.yandex.net" || !service) {
    console.error("Проверьте настройки SMTP Postbox в .env.local: хост, порт 587, отправителя и учётные данные.");
    process.exitCode = 1;
    return;
  }

  await service.verify();
  console.log("SMTP-подключение, STARTTLS с проверкой сертификата и аутентификация прошли.");
  if (to) {
    await service.send({
      to,
      subject: "Sophia — проверка Postbox",
      text: "Это тестовое письмо, отправленное из локальной Sophia через Yandex Cloud Postbox.",
    });
    console.log("Postbox принял тестовое письмо. Проверьте его получение в почтовом ящике.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof SmtpError
    ? [error.message, error.code, error.status].filter(Boolean).join(" / ")
    : "Проверка SMTP завершилась ошибкой.");
  process.exitCode = 1;
});
