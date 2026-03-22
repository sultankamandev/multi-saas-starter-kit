from pydantic_settings import BaseSettings


class SMTPSettings(BaseSettings):
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = ""

    @property
    def is_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASS)

    @property
    def from_address(self) -> str:
        return self.SMTP_FROM or self.SMTP_USER


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
