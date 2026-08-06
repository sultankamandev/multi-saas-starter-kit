import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { t } from "../i18n.js";

/**
 * SMTP sender. When SMTP_HOST is empty the transport is not created and every
 * send is logged instead of thrown — a missing mail server must not turn
 * registration into a 500. See docs/getting-started.md for a local catcher.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(env.smtp.host);
}

function layout(title: string, bodyHtml: string, footer: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#6b7280">${footer}</p>
  </div>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0">
    <a href="${href}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block">${label}</a>
  </p>
  <p style="font-size:12px;color:#6b7280;word-break:break-all">${href}</p>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(`[email] SMTP not configured; skipped "${subject}" to ${to}`);
    return;
  }
  try {
    await tx.sendMail({ from: env.smtp.from, to, subject, html });
  } catch (err) {
    // Never let a mail failure break the request that triggered it.
    console.error(`[email] failed to send "${subject}" to ${to}:`, err);
  }
}

export async function sendVerificationEmail(to: string, token: string, lang: string) {
  const url = `${env.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await send(
    to,
    t(lang, "EmailVerificationTitle"),
    layout(
      t(lang, "EmailVerificationWelcome"),
      `<p>${t(lang, "EmailVerificationMessage")}</p>` +
        button(url, t(lang, "EmailVerificationButton")) +
        `<p style="font-size:13px;color:#6b7280">${t(lang, "EmailVerificationExpiry")}</p>`,
      t(lang, "EmailFooterText")
    )
  );
}

export async function sendPasswordResetEmail(to: string, token: string, lang: string) {
  const url = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await send(
    to,
    t(lang, "EmailResetPasswordTitle"),
    layout(
      t(lang, "EmailResetPasswordHi"),
      `<p>${t(lang, "EmailResetPasswordMessage")}</p>` +
        button(url, t(lang, "EmailResetPasswordButton")) +
        `<p style="font-size:13px;color:#6b7280">${t(lang, "EmailResetPasswordExpiry")}</p>` +
        `<p style="font-size:13px;color:#6b7280">${t(lang, "EmailResetPasswordIgnore")}</p>`,
      t(lang, "EmailResetPasswordFooter")
    )
  );
}

export async function send2FACodeEmail(to: string, code: string, lang: string) {
  await send(
    to,
    t(lang, "Email2FATitle"),
    layout(
      t(lang, "Email2FATitle"),
      `<p>${t(lang, "Email2FAMessage")}</p>
       <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:24px 0">${code}</p>
       <p style="font-size:13px;color:#6b7280">${t(lang, "Email2FAExpiry")}</p>
       <p style="font-size:13px;color:#6b7280">${t(lang, "Email2FASecurity")}</p>`,
      t(lang, "Email2FAClosing")
    )
  );
}
