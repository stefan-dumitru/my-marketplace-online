from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str


class ReviewUpdateRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str


class ReviewOut(BaseModel):
    id: int
    product_id: int
    buyer_id: int
    buyer_name: str
    rating: int
    comment: str
    created_at: datetime
    updated_at: datetime
