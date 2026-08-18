from pydantic import field_validator
from pydantic_settings import BaseSettings

# The shortest JWT_SECRET the server will start with. Long enough to reject
# every placeholder that ships in this repo — the .env.example value, the
# compose default — so nobody boots a signing key that was never actually
# chosen. Go and Node enforce the same number.
MIN_SECRET_LEN = 32


class SMTPSettings(BaseSettings):
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = ""

    @property
    def is_configured(self) -> bool:
        # Only the host is required. Auth is optional: internal relays and dev
        # catchers like Mailpit accept mail with no credentials. Requiring
        # USER/PASS here meant those setups silently sent nothing. Matches the
        # Go and Node templates, which also gate on the host alone.
        return bool(self.SMTP_HOST)

    @property
    def from_address(self) -> str:
        return self.SMTP_FROM or self.SMTP_USER or "noreply@example.com"


class Settings(BaseSettings):
    PORT: int = 8000
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ISSUER: str = "saas-api"
    JWT_AUDIENCE: str = "saas-app"
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"
    GOOGLE_CLIENT_ID: str = ""
    RECAPTCHA_SECRET_KEY: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("JWT_SECRET")
    @classmethod
    def _secret_is_long_enough(cls, v: str) -> str:
        if len(v) < MIN_SECRET_LEN:
            raise ValueError(
                f"JWT_SECRET must be at least {MIN_SECRET_LEN} characters "
                f"(got {len(v)}) — generate one with: openssl rand -base64 48"
            )
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def smtp(self) -> SMTPSettings:
        return SMTPSettings(
            SMTP_HOST=self.SMTP_HOST,
            SMTP_PORT=self.SMTP_PORT,
            SMTP_USER=self.SMTP_USER,
            SMTP_PASS=self.SMTP_PASS,
            SMTP_FROM=self.SMTP_FROM,
        )


settings = Settings()  # type: ignore[call-arg]
