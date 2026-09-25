from decimal import Decimal

from pydantic import BaseModel


class AddToCartRequest(BaseModel):
    product_id: int
    quantity: int = 1


class UpdateCartItemRequest(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    product_id: int
    product_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal
    seller_id: int
    seller_business_name: str
    available_stock: int


class CartOut(BaseModel):
    items: list[CartItemOut]
    total: Decimal
