from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.order import OrderStatus


class OrderLineOut(BaseModel):
    id: int
    product_id: int
    product_name_snapshot: str
    unit_price_snapshot: Decimal
    quantity: int
    line_total: Decimal

    model_config = {"from_attributes": True}


class OrderListItemOut(BaseModel):
    id: int
    seller_id: int
    seller_business_name: str
    status: OrderStatus
    placed_at: datetime
    total_amount: Decimal


class OrderDetailOut(OrderListItemOut):
    shipped_at: datetime | None
    delivered_at: datetime | None
    cancelled_at: datetime | None
    ship_recipient_name: str
    ship_street: str
    ship_city: str
    ship_region: str
    ship_postal_code: str
    ship_country: str
    lines: list[OrderLineOut]
