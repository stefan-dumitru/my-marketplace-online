from decimal import Decimal

from pydantic import BaseModel


class TopProductOut(BaseModel):
    product_id: int
    product_name: str
    quantity_sold: int


class SellerStatsOut(BaseModel):
    total_orders: int
    total_revenue: Decimal
    top_products: list[TopProductOut]


class AdminStatsOut(BaseModel):
    total_sellers: int
    sellers_by_status: dict[str, int]
    total_products: int
    total_orders: int
    total_revenue: Decimal
    orders_by_status: dict[str, int]
