from __future__ import annotations

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import aiosmtplib
from jinja2 import Environment, FileSystemLoader

from app.config import Settings

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).resolve().parent.parent.parent / "templates" / "emails"


class EmailSender:
    def __init__(self, settings: Settings):
        self._host = settings.SMTP_HOST
        self._port = settings.SMTP_PORT
        self._user = settings.SMTP_USER
        self._password = settings.SMTP_PASS
        self._from = settings.smtp.from_address
        self._configured = settings.smtp.is_configured
        self._env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)

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
            await aiosmtplib.send(
                msg,
                hostname=self._host,
                port=self._port,
                username=self._user,
                password=self._password,
                start_tls=True,
            )
        except Exception:
            logger.exception("Failed to send email to %s", to)

    def _render(self, template_name: str, **kwargs: object) -> str:
        tpl = self._env.get_template(template_name)
        return tpl.render(**kwargs)

    async def send_verification(self, to: str, link: str, lang: str, user_name: str) -> None:
        html = self._render("verify_email.html", link=link, lang=lang, user_name=user_name)
        await self._send(to, "Verify Your Email Address", html)

    async def send_password_reset(self, to: str, link: str, lang: str) -> None:
        html = self._render("reset_password.html", link=link, lang=lang)
        await self._send(to, "Password Reset Request", html)

    async def send_2fa_code(self, to: str, code: str, lang: str, user_name: str) -> None:
        html = self._render("twofa_code.html", code=code, lang=lang, user_name=user_name)
        await self._send(to, "Your Login Verification Code", html)

    async def send_role_change(self, to: str, lang: str, user_name: str, old_role: str, new_role: str) -> None:
        html = self._render("role_change.html", lang=lang, user_name=user_name, old_role=old_role, new_role=new_role)
        await self._send(to, "Your Role Has Been Updated", html)

    async def send_account_deleted(self, to: str, lang: str, user_name: str, user_email: str) -> None:
        html = self._render("account_deleted.html", lang=lang, user_name=user_name, user_email=user_email)
        await self._send(to, "Your Account Has Been Deleted", html)
