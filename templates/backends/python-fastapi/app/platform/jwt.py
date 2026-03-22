from __future__ import annotations

from datetime import datetime, timedelta, timezone
from dataclasses import dataclass

from jose import JWTError, jwt


@dataclass
class Claims:
    user_id: int
    role: str
    exp: datetime
    iat: datetime
    nbf: datetime
    iss: str
    aud: str


class JWTManager:
    def __init__(self, secret: str, issuer: str, audience: str):
        self._secret = secret
        self._issuer = issuer
        self._audience = audience

    def generate(self, user_id: int, role: str, duration: timedelta) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "user_id": user_id,
            "role": role,
            "iss": self._issuer,
            "aud": self._audience,
            "exp": now + duration,
            "iat": now,
            "nbf": now,
        }
        return jwt.encode(payload, self._secret, algorithm="HS256")

    def validate(self, token: str) -> Claims:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=["HS256"],
                audience=self._audience,
                issuer=self._issuer,
            )
        except JWTError as e:
            raise ValueError(f"Invalid token: {e}") from e

        return Claims(
            user_id=payload["user_id"],
            role=payload["role"],
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
            iat=datetime.fromtimestamp(payload["iat"], tz=timezone.utc),
            nbf=datetime.fromtimestamp(payload["nbf"], tz=timezone.utc),
            iss=payload["iss"],
            aud=payload["aud"],
        )
