from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: int | None
    children: list["CategoryOut"] = []

    model_config = {"from_attributes": True}


class ProductListItemOut(BaseModel):
    id: int
    name: str
    price: Decimal
    stock_quantity: int
    category_id: int
    category_name: str
    seller_id: int
    seller_business_name: str

    model_config = {"from_attributes": True}


class ProductImageOut(BaseModel):
    id: int
    storage_key: str
    display_order: int
    url: str


class ProductDetailOut(ProductListItemOut):
    description: str
    images: list[ProductImageOut]
    created_at: datetime


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int
