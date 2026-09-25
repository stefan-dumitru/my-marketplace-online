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
    is_default: bool = False


class AddressUpdateRequest(BaseModel):
    label: str | None = None
    recipient_name: str | None = None
    street: str | None = None
    city: str | None = None
    region: str | None = None
    postal_code: str | None = None
    country: str | None = None
    is_default: bool | None = None


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
