import process from "node:process";
import nodemailer, { type SMTPTransportOptions } from "nodemailer";

type EmailMessage = { to: string; subject: string; text: string };
type EmailService = { verify(): Promise<void>; send(message: EmailMessage): Promise<void> };

const safeErrorCodes = new Set([
  "EAUTH", "ENOAUTH", "EDNS", "ECONNECTION", "ETIMEDOUT", "ESOCKET", "ETLS", "EPROTOCOL", "EENVELOPE", "EMESSAGE",
]);

export class SmtpError extends Error {
  readonly code?: string;
  readonly status?: string;

  constructor(message: string, failure: unknown) {
    super(message);
    // SMTP replies may include addresses, transport details, and credentials.
    if (!(failure instanceof Error)) return;
    if ("code" in failure && typeof failure.code === "string" && safeErrorCodes.has(failure.code)) {
      this.code = failure.code;
    }
    if ("responseCode" in failure && typeof failure.responseCode === "number" &&
        Number.isInteger(failure.responseCode) && failure.responseCode >= 400 && failure.responseCode < 600) {
      this.status = String(failure.responseCode);
      const enhanced = "response" in failure && typeof failure.response === "string"
        ? /^[45]\d\d[ -]([45]\.\d{1,3}\.\d{1,3})(?=\s|$)/.exec(failure.response)?.[1]
        : undefined;
      if (enhanced) this.status += ` ${enhanced}`;
    }
  }
}

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
    forceAuth: true,
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
    async verify() {
      try {
        await transport.verify();
      } catch (error) {
        throw new SmtpError("SMTP verification failed", error);
      }
    },
    async send({ to, subject, text }) {
      try {
        await transport.sendMail({ from, to: { name: "", address: to }, subject, text });
      } catch (error) {
        throw new SmtpError("SMTP delivery failed", error);
      }
    },
  };
}
