from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.review import Review
from app.schemas.catalog import Page, ProductDetailOut, ProductImageOut, ProductListItemOut
from app.services.catalog import category_and_descendant_ids, visible_products_query
from app.services.storage import image_url

router = APIRouter(tags=["catalog"])


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
    query = visible_products_query(db)

    if q:
        like = f"%{q}%"
        query = query.filter(or_(Product.name.ilike(like), Product.description.ilike(like)))
    if category_id is not None:
        query = query.filter(Product.category_id.in_(category_and_descendant_ids(db, category_id)))
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
    row = visible_products_query(db).filter(Product.id == product_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product, category_name, business_name = row
    images = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product.id)
        .order_by(ProductImage.display_order)
        .all()
    )

    average_rating, review_count = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.product_id == product.id)
        .one()
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
        average_rating=float(average_rating) if average_rating is not None else None,
        review_count=review_count,
    )
