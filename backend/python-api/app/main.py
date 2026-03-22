from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.deps import get_analytics_service
from app.i18n.loader import load_locales
from app.middleware.rate_limiter import RateLimiter
from app.middleware.role import require_role
from app.platform.captcha import CaptchaVerifier
from app.platform.email import EmailSender
from app.platform.geoip import GeoIPResolver
from app.platform.jwt import JWTManager, Claims
from app.router import auth, user, admin_users, admin_analytics, admin_settings, admin_blocked_ips
from app.service.analytics_service import AnalyticsService


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_locales()

    app.state.jwt_manager = JWTManager(settings.JWT_SECRET, settings.JWT_ISSUER, settings.JWT_AUDIENCE)
    app.state.email_sender = EmailSender(settings)
    app.state.captcha_verifier = CaptchaVerifier(settings.RECAPTCHA_SECRET_KEY)
    app.state.geoip_resolver = GeoIPResolver()
    app.state.rate_limiter = RateLimiter(max_requests=100, window_seconds=60, block_seconds=300)
    app.state.rate_limiter.start_cleanup()
    app.state.google_client_id = settings.GOOGLE_CLIENT_ID
    app.state.frontend_url = settings.FRONTEND_URL

    yield


def create_app() -> FastAPI:
    app = FastAPI(title="SaaS Starter API", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Origin", "Content-Type", "Accept", "Authorization", "Accept-Language"],
        expose_headers=["Content-Length", "X-Total-Count"],
        max_age=43200,
    )

    app.include_router(auth.router)
    app.include_router(user.router)
    app.include_router(admin_users.router)
    app.include_router(admin_analytics.router)
    app.include_router(admin_settings.router)
    app.include_router(admin_blocked_ips.router)

    @app.get("/ping")
    async def ping():
        return {"message": "pong"}

    @app.get("/api/admin/summary")
    async def admin_summary(
        claims: Claims = Depends(require_role("admin")),
        analytics_svc: AnalyticsService = Depends(get_analytics_service),
    ):
        return await analytics_svc.summary()

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
