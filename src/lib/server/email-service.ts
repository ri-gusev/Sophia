import process from "node:process";
import nodemailer, { type SMTPTransportOptions } from "nodemailer";

type EmailMessage = { to: string; subject: string; text: string };
type EmailService = { send(message: EmailMessage): Promise<void> };

export function createEmailService(): EmailService | undefined {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const host = SMTP_HOST?.trim();
  const user = SMTP_USER?.trim();
  const pass = SMTP_PASSWORD?.trim();
  const from = SMTP_FROM?.trim();
  if (!host || SMTP_PORT?.trim() !== "587" || !user || !pass || !from || /[\r\n]/.test(from)) return;

  const options: SMTPTransportOptions = {
    host,
    port: 587,
    secure: false,
    requireTLS: true,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    auth: { user, pass },
    dnsTimeout: 5_000,
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
    logger: false,
    debug: false,
  };
  const transport = nodemailer.createTransport(options);

  return {
    async send({ to, subject, text }) {
      try {
        await transport.sendMail({ from, to: { name: "", address: to }, subject, text });
      } catch {
        // The SMTP error can include addresses, server replies, and transport details.
        throw new Error("SMTP delivery failed");
      }
    },
  };
}
