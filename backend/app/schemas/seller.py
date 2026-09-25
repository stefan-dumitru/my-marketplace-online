from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.seller_profile import SellerStatus


class SellerApplyRequest(BaseModel):
    business_name: str


class SellerApplicationOut(BaseModel):
    id: int
    business_name: str
    status: SellerStatus
    submitted_at: datetime
    decided_at: datetime | None

    model_config = {"from_attributes": True}


class SellerRejectRequest(BaseModel):
    reason: str | None = None


class ProductCreateRequest(BaseModel):
    name: str
    description: str
    price: Decimal
    category_id: int
    stock_quantity: int = 0


class ProductUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    category_id: int | None = None
    stock_quantity: int | None = None
    is_active: bool | None = None


class SellerProductOut(BaseModel):
    id: int
    name: str
    description: str
    price: Decimal
    stock_quantity: int
    category_id: int
    is_active: bool
    moderation_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
