import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SellerAction(enum.StrEnum):
    approved = "approved"
    rejected = "rejected"


class SellerActionLog(Base):
    __tablename__ = "seller_action_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    seller_profile_id: Mapped[int] = mapped_column(ForeignKey("seller_profiles.id"), nullable=False)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    action: Mapped[SellerAction] = mapped_column(
        Enum(SellerAction, name="seller_action"), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
