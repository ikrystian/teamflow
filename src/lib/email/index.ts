import "server-only";
import { render } from "@react-email/components";
import nodemailer, { type Transporter } from "nodemailer";
import { createElement } from "react";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { SimpleEmail } from "./templates";

type SimpleEmailProps = Parameters<typeof SimpleEmail>[0];

let transporter: Transporter | null = null;
let resend: Resend | null = null;

function smtp() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

/**
 * Wysyła e-mail transakcyjny przez Resend (gdy skonfigurowany) albo SMTP.
 * Błąd wysyłki jest logowany, ale nie przerywa operacji biznesowej.
 */
export async function sendEmail(to: string, subject: string, content: SimpleEmailProps): Promise<boolean> {
  try {
    const element = createElement(SimpleEmail, content);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    if (env.RESEND_API_KEY) {
      resend ??= new Resend(env.RESEND_API_KEY);
      const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html, text });
      if (error) throw new Error(error.message);
    } else if (env.SMTP_HOST) {
      await smtp().sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
    } else {
      logger.warn("email.not_configured", { subject });
      return false;
    }
    logger.info("email.sent", { subject });
    return true;
  } catch (error) {
    logger.error("email.failed", { subject, error });
    return false;
  }
}

export const appUrl = (path: string) => new URL(path, env.APP_URL).toString();

/** Test konfiguracji wysyłki (Ustawienia → SMTP): Resend jest uznawany za skonfigurowany, SMTP jest weryfikowany połączeniem. */
export async function testEmailTransport(): Promise<boolean> {
  if (env.RESEND_API_KEY) return true;
  if (!env.SMTP_HOST) return false;
  try {
    await smtp().verify();
    return true;
  } catch (error) {
    logger.warn("email.smtp_verify_failed", { error });
    return false;
  }
}
