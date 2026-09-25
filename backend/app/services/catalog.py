from typing import Any

from sqlalchemy.orm import Query as SAQuery
from sqlalchemy.orm import Session as DBSession

from app.models.category import Category
from app.models.product import ModerationStatus, Product
from app.models.seller_profile import SellerProfile, SellerStatus


def visible_products_query(db: DBSession) -> SAQuery[Any]:
    """Products a guest is actually allowed to see/buy: active, not moderated, approved seller."""
    return (
        db.query(Product, Category.name, SellerProfile.business_name)
        .join(Category, Product.category_id == Category.id)
        .join(SellerProfile, Product.seller_id == SellerProfile.id)
        .filter(
            Product.is_active.is_(True),
            Product.moderation_status == ModerationStatus.active,
            SellerProfile.status == SellerStatus.approved,
        )
    )


def get_visible_product(db: DBSession, product_id: int) -> Product | None:
    row = (
        db.query(Product)
        .join(SellerProfile, Product.seller_id == SellerProfile.id)
        .filter(
            Product.id == product_id,
            Product.is_active.is_(True),
            Product.moderation_status == ModerationStatus.active,
            SellerProfile.status == SellerStatus.approved,
        )
        .first()
    )
    return row


def category_and_descendant_ids(db: DBSession, category_id: int) -> set[int]:
    """category_id plus every category nested under it, however deep."""
    rows = db.query(Category.id, Category.parent_id).all()
    children_by_parent: dict[int, list[int]] = {}
    for cid, pid in rows:
        if pid is not None:
            children_by_parent.setdefault(pid, []).append(cid)

    result: set[int] = set()
    stack = [category_id]
    while stack:
        current = stack.pop()
        if current in result:
            continue
        result.add(current)
        stack.extend(children_by_parent.get(current, []))
    return result
