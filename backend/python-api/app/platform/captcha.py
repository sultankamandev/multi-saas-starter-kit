from __future__ import annotations

import httpx


class CaptchaVerifier:
    def __init__(self, secret_key: str):
        self._secret = secret_key

    async def verify(self, token: str) -> bool:
        if not self._secret:
            return True
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={"secret": self._secret, "response": token},
            )
            data = resp.json()
            return data.get("success", False)
