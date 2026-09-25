from datetime import datetime

from pydantic import BaseModel


class AddressCreateRequest(BaseModel):
    label: str
    recipient_name: str
    street: str
    city: str
    region: str
    postal_code: str
    country: str


class AddressOut(BaseModel):
    id: int
    label: str
    recipient_name: str
    street: str
    city: str
    region: str
    postal_code: str
    country: str
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}
