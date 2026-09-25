import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SellerStatus(enum.StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"


class SellerProfile(Base):
    __tablename__ = "seller_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[SellerStatus] = mapped_column(
        Enum(SellerStatus, name="seller_status"), nullable=False, default=SellerStatus.pending
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
