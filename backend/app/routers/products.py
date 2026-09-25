from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Query as SAQuery
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.models.category import Category
from app.models.product import ModerationStatus, Product
from app.models.product_image import ProductImage
from app.models.seller_profile import SellerProfile, SellerStatus
from app.schemas.catalog import Page, ProductDetailOut, ProductImageOut, ProductListItemOut
from app.services.storage import image_url

router = APIRouter(tags=["catalog"])


def _visible_products_query(db: DBSession) -> SAQuery[Any]:
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


def _category_and_descendant_ids(db: DBSession, category_id: int) -> set[int]:
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


@router.get("/products", response_model=Page[ProductListItemOut])
def list_products(
    q: str | None = None,
    category_id: int | None = None,
    seller_id: int | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: DBSession = Depends(get_db),
) -> Page[ProductListItemOut]:
    query = _visible_products_query(db)

    if q:
        like = f"%{q}%"
        query = query.filter(or_(Product.name.ilike(like), Product.description.ilike(like)))
    if category_id is not None:
        query = query.filter(Product.category_id.in_(_category_and_descendant_ids(db, category_id)))
    if seller_id is not None:
        query = query.filter(Product.seller_id == seller_id)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    total = query.count()
    rows = (
        query.order_by(Product.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        ProductListItemOut(
            id=product.id,
            name=product.name,
            price=product.price,
            stock_quantity=product.stock_quantity,
            category_id=product.category_id,
            category_name=category_name,
            seller_id=product.seller_id,
            seller_business_name=business_name,
        )
        for product, category_name, business_name in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/products/{product_id}", response_model=ProductDetailOut)
def get_product(product_id: int, db: DBSession = Depends(get_db)) -> ProductDetailOut:
    row = _visible_products_query(db).filter(Product.id == product_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product, category_name, business_name = row
    images = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product.id)
        .order_by(ProductImage.display_order)
        .all()
    )

    return ProductDetailOut(
        id=product.id,
        name=product.name,
        price=product.price,
        stock_quantity=product.stock_quantity,
        category_id=product.category_id,
        category_name=category_name,
        seller_id=product.seller_id,
        seller_business_name=business_name,
        description=product.description,
        images=[
            ProductImageOut(
                id=image.id,
                storage_key=image.storage_key,
                display_order=image.display_order,
                url=image_url(image.storage_key),
            )
            for image in images
        ],
        created_at=product.created_at,
    )
