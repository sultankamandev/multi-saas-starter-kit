from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.base import Base


class AdminAction(Base):
    __tablename__ = "admin_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    admin_id: Mapped[int] = mapped_column(Integer, index=True)
    admin_email: Mapped[str | None] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    target_user_id: Mapped[int | None] = mapped_column(Integer, index=True)
    target_email: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
