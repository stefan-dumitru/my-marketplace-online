from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import require_admin
from app.models.product import ModerationStatus, Product
from app.models.product_moderation_log import ModerationAction, ProductModerationLog
from app.models.seller_profile import SellerProfile
from app.models.user import User
from app.schemas.catalog import Page
from app.schemas.moderation import AdminProductOut, ModerateProductRequest

router = APIRouter(prefix="/admin/products", tags=["admin"])

_ACTION_TO_STATUS = {
    ModerationAction.removed: ModerationStatus.removed_by_admin,
    ModerationAction.suspended: ModerationStatus.suspended_by_admin,
    ModerationAction.reinstated: ModerationStatus.active,
}


@router.get("", response_model=Page[AdminProductOut])
def list_products_for_moderation(
    moderation_status: ModerationStatus | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> Page[AdminProductOut]:
    query = db.query(Product, SellerProfile.business_name).join(
        SellerProfile, Product.seller_id == SellerProfile.id
    )
    if moderation_status is not None:
        query = query.filter(Product.moderation_status == moderation_status)

    total = query.count()
    rows = (
        query.order_by(Product.id).offset((page - 1) * page_size).limit(page_size).all()
    )
    items = [
        AdminProductOut(
            id=product.id,
            name=product.name,
            seller_id=product.seller_id,
            seller_business_name=business_name,
            category_id=product.category_id,
            is_active=product.is_active,
            moderation_status=product.moderation_status.value,
        )
        for product, business_name in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("/{product_id}/moderate", response_model=AdminProductOut)
def moderate_product(
    product_id: int,
    payload: ModerateProductRequest,
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> AdminProductOut:
    row = (
        db.query(Product, SellerProfile.business_name)
        .join(SellerProfile, Product.seller_id == SellerProfile.id)
        .filter(Product.id == product_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product, business_name = row

    product.moderation_status = _ACTION_TO_STATUS[payload.action]
    db.add(
        ProductModerationLog(
            product_id=product.id,
            admin_id=admin.id,
            action=payload.action,
            reason=payload.reason,
        )
    )
    db.commit()
    db.refresh(product)

    return AdminProductOut(
        id=product.id,
        name=product.name,
        seller_id=product.seller_id,
        seller_business_name=business_name,
        category_id=product.category_id,
        is_active=product.is_active,
        moderation_status=product.moderation_status.value,
    )
