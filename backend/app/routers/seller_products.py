from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.db import get_db
from app.deps import require_approved_seller
from app.models.category import Category
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.seller_profile import SellerProfile
from app.schemas.catalog import Page
from app.schemas.seller import ProductCreateRequest, ProductUpdateRequest, SellerProductOut
from app.services.storage import upload_image

router = APIRouter(prefix="/sellers/me/products", tags=["sellers"])


def _get_own_product_or_404(db: DBSession, seller: SellerProfile, product_id: int) -> Product:
    product = (
        db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.get("", response_model=Page[SellerProductOut])
def list_my_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    seller: SellerProfile = Depends(require_approved_seller),
    db: DBSession = Depends(get_db),
) -> Page[SellerProductOut]:
    query = db.query(Product).filter(Product.seller_id == seller.id)
    total = query.count()
    rows = (
        query.order_by(Product.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page(
        items=[SellerProductOut.model_validate(p) for p in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=SellerProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreateRequest,
    seller: SellerProfile = Depends(require_approved_seller),
    db: DBSession = Depends(get_db),
) -> Product:
    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if category is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")

    product = Product(
        seller_id=seller.id,
        category_id=payload.category_id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        stock_quantity=payload.stock_quantity,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=SellerProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdateRequest,
    seller: SellerProfile = Depends(require_approved_seller),
    db: DBSession = Depends(get_db),
) -> Product:
    product = _get_own_product_or_404(db, seller, product_id)

    updates = payload.model_dump(exclude_unset=True)
    if "category_id" in updates:
        category = db.query(Category).filter(Category.id == updates["category_id"]).first()
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found"
            )
    for field, value in updates.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.post("/{product_id}/images", status_code=status.HTTP_201_CREATED)
def upload_product_image(
    product_id: int,
    file: UploadFile,
    seller: SellerProfile = Depends(require_approved_seller),
    db: DBSession = Depends(get_db),
) -> dict[str, int]:
    product = _get_own_product_or_404(db, seller, product_id)

    if file.content_type not in settings.allowed_image_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type. Use JPEG, PNG, or WebP.",
        )

    file_bytes = file.file.read()
    if len(file_bytes) > settings.max_image_size_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large")

    storage_key = upload_image(file_bytes, file.content_type)

    max_order = db.query(ProductImage).filter(ProductImage.product_id == product.id).count()
    image = ProductImage(
        product_id=product.id,
        storage_key=storage_key,
        original_filename=file.filename or "upload",
        display_order=max_order,
    )
    db.add(image)
    db.commit()
    return {"id": image.id}
