from pydantic import BaseModel

from app.models.product_moderation_log import ModerationAction


class ModerateProductRequest(BaseModel):
    action: ModerationAction
    reason: str | None = None


class AdminProductOut(BaseModel):
    id: int
    name: str
    seller_id: int
    seller_business_name: str
    category_id: int
    is_active: bool
    moderation_status: str
