import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/server/settings/smtp";

// SMTP adapter — isolates the provider-specific bits (nodemailer's
// transport config) from the worker that calls it. Swapping providers
// later touches only this file.

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super("SMTP is not configured — set it under Admin > Settings > SMTP.");
    this.name = "MailNotConfiguredError";
  }
}

export async function sendMail(input: SendMailInput): Promise<void> {
  const config = await getSmtpConfig();
  if (!config) {
    throw new MailNotConfiguredError();
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.password } : undefined,
  });

  await transport.sendMail({
    from: `"${config.fromName}" <${config.fromAddress}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
