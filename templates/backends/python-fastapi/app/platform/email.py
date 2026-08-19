from __future__ import annotations

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

import aiosmtplib

from app.config import Settings
from app.i18n.loader import t

logger = logging.getLogger(__name__)


def _layout(title: str, body_html: str, footer: str) -> str:
    return f"""<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:20px">{escape(title)}</h1>
    {body_html}
    <p style="margin-top:32px;font-size:12px;color:#6b7280">{escape(footer)}</p>
  </div>
</body></html>"""


def _button(href: str, label: str) -> str:
    safe = escape(href, quote=True)
    return (
        f'<p style="margin:24px 0"><a href="{safe}" '
        'style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;'
        f'border-radius:6px;display:inline-block">{escape(label)}</a></p>'
        f'<p style="font-size:12px;color:#6b7280;word-break:break-all">{safe}</p>'
    )


class EmailSender:
    """Renders localized inline HTML (no file templates) and sends over SMTP.

    Templates used to be Go html/template files ({{.Title}} etc.) rendered by
    Jinja2, which threw TemplateSyntaxError and meant no email ever sent. Inline
    HTML built from the same i18n keys the other templates use keeps the three
    backends consistent and removes a broken indirection.
    """

    def __init__(self, settings: Settings):
        self._host = settings.SMTP_HOST
        self._port = settings.SMTP_PORT
        self._user = settings.SMTP_USER
        self._password = settings.SMTP_PASS
        self._from = settings.smtp.from_address
        self._configured = settings.smtp.is_configured

    async def _send(self, to: str, subject: str, html_body: str) -> None:
        if not self._configured:
            logger.warning("SMTP not configured, skipping email to %s: %s", to, subject)
            return

        msg = MIMEMultipart("alternative")
        msg["From"] = self._from
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        try:
            # STARTTLS opportunistically: implicit TLS on 465, upgrade on 587,
            # and neither on a plain dev catcher like Mailpit (1025). Forcing
            # start_tls=True previously failed against non-TLS servers.
            await aiosmtplib.send(
                msg,
                hostname=self._host,
                port=self._port,
                username=self._user or None,
                password=self._password or None,
                use_tls=self._port == 465,
                start_tls=self._port == 587,
            )
        except Exception:
            logger.exception("Failed to send email to %s", to)

    async def send_verification(self, to: str, link: str, lang: str, user_name: str) -> None:
        html = _layout(
            t("EmailVerificationWelcome", lang),
            f'<p>{escape(t("EmailVerificationMessage", lang))}</p>'
            + _button(link, t("EmailVerificationButton", lang))
            + f'<p style="font-size:13px;color:#6b7280">{escape(t("EmailVerificationExpiry", lang))}</p>',
            t("EmailFooterText", lang),
        )
        await self._send(to, t("EmailVerificationTitle", lang), html)

    async def send_password_reset(self, to: str, link: str, lang: str) -> None:
        html = _layout(
            t("EmailResetPasswordHi", lang),
            f'<p>{escape(t("EmailResetPasswordMessage", lang))}</p>'
            + _button(link, t("EmailResetPasswordButton", lang))
            + f'<p style="font-size:13px;color:#6b7280">{escape(t("EmailResetPasswordExpiry", lang))}</p>'
            + f'<p style="font-size:13px;color:#6b7280">{escape(t("EmailResetPasswordIgnore", lang))}</p>',
            t("EmailResetPasswordFooter", lang),
        )
        await self._send(to, t("EmailResetPasswordTitle", lang), html)

    async def send_2fa_code(self, to: str, code: str, lang: str, user_name: str) -> None:
        html = _layout(
            t("Email2FATitle", lang),
            f'<p>{escape(t("Email2FAMessage", lang))}</p>'
            f'<p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:24px 0">{escape(code)}</p>'
            f'<p style="font-size:13px;color:#6b7280">{escape(t("Email2FAExpiry", lang))}</p>'
            f'<p style="font-size:13px;color:#6b7280">{escape(t("Email2FASecurity", lang))}</p>',
            t("Email2FAClosing", lang),
        )
        await self._send(to, t("Email2FATitle", lang), html)

    async def send_role_change(self, to: str, lang: str, user_name: str, old_role: str, new_role: str) -> None:
        html = _layout(
            t("EmailRoleChangeTitle", lang),
            f'<p>{escape(t("EmailGreeting", lang))} {escape(user_name)},</p>'
            f'<p>{escape(t("EmailRoleChangeMessage", lang))}</p>'
            f'<p><strong>{escape(t("EmailRoleChangeLabel", lang))}:</strong> '
            f'{escape(old_role)} &rarr; {escape(new_role)}</p>',
            t("EmailFooterText", lang),
        )
        await self._send(to, t("EmailRoleChangeTitle", lang), html)

    async def send_account_deleted(self, to: str, lang: str, user_name: str, user_email: str) -> None:
        html = _layout(
            t("EmailAccountDeletedTitle", lang),
            f'<p>{escape(t("EmailGreeting", lang))} {escape(user_name)},</p>'
            f'<p>{escape(t("EmailAccountDeletedMessage", lang))}</p>'
            f'<p><strong>{escape(t("EmailAccountLabel", lang))}:</strong> {escape(user_email)}</p>',
            t("EmailFooterText", lang),
        )
        await self._send(to, t("EmailAccountDeletedTitle", lang), html)
