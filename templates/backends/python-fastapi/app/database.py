from contextvars import ContextVar
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=10, max_overflow=20)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)

_session_ctx: ContextVar[AsyncSession | None] = ContextVar("_session_ctx", default=None)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    existing = _session_ctx.get()
    if existing is not None:
        yield existing
        return
    async with async_session_factory() as session:
        token = _session_ctx.set(session)
        try:
            yield session
        finally:
            _session_ctx.reset(token)


class TxManager:
    """Simple transaction manager that works with context-var sessions."""

    async def __call__(self, session: AsyncSession):
        async with session.begin():
            yield session
