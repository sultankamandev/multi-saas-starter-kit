from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str | None] = mapped_column(String(30), unique=True, index=True)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'user'"))
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    two_fa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    two_fa_secret: Mapped[str | None] = mapped_column(String(255))
    language: Mapped[str | None] = mapped_column(String(5), default="en")
    country: Mapped[str | None] = mapped_column(String(10))
    address: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)

    __table_args__ = (
        Index("idx_users_email_lower", func.lower(email), unique=True),
        Index("idx_users_username_lower", func.lower(username), unique=True),
    )

    @property
    def full_name(self) -> str:
        parts = [self.first_name or "", self.last_name or ""]
        return " ".join(p for p in parts if p).strip()

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
