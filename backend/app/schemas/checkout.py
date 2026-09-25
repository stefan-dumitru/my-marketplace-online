from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    address_id: int


class SkippedItem(BaseModel):
    product_id: int
    product_name: str
    reason: str


class CheckoutResponse(BaseModel):
    order_ids: list[int]
    skipped: list[SkippedItem]
