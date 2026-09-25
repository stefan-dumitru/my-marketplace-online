from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import get_current_user
from app.models.cart_item import CartItem
from app.models.product import Product
from app.models.seller_profile import SellerProfile
from app.models.user import User
from app.schemas.cart import AddToCartRequest, CartItemOut, CartOut, UpdateCartItemRequest
from app.services.catalog import get_visible_product

router = APIRouter(prefix="/cart", tags=["cart"])


def _load_cart(db: DBSession, user_id: int) -> CartOut:
    rows = (
        db.query(CartItem, Product, SellerProfile.business_name)
        .join(Product, CartItem.product_id == Product.id)
        .join(SellerProfile, Product.seller_id == SellerProfile.id)
        .filter(CartItem.user_id == user_id)
        .all()
    )
    items = [
        CartItemOut(
            product_id=product.id,
            product_name=product.name,
            unit_price=product.price,
            quantity=cart_item.quantity,
            line_total=product.price * cart_item.quantity,
            seller_id=product.seller_id,
            seller_business_name=business_name,
            available_stock=product.stock_quantity,
        )
        for cart_item, product, business_name in rows
    ]
    total = sum((item.line_total for item in items), start=Decimal("0"))
    return CartOut(items=items, total=total)


@router.get("", response_model=CartOut)
def get_cart(
    current_user: User = Depends(get_current_user), db: DBSession = Depends(get_db)
) -> CartOut:
    return _load_cart(db, current_user.id)


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    payload: AddToCartRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> CartOut:
    if payload.quantity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be at least 1"
        )

    product = get_visible_product(db, payload.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing = (
        db.query(CartItem)
        .filter(CartItem.user_id == current_user.id, CartItem.product_id == payload.product_id)
        .first()
    )
    if existing is not None:
        existing.quantity += payload.quantity
    else:
        db.add(
            CartItem(
                user_id=current_user.id, product_id=payload.product_id, quantity=payload.quantity
            )
        )
    db.commit()
    return _load_cart(db, current_user.id)


@router.patch("/items/{product_id}", response_model=CartOut)
def update_cart_item(
    product_id: int,
    payload: UpdateCartItemRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> CartOut:
    if payload.quantity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be at least 1"
        )

    item = (
        db.query(CartItem)
        .filter(CartItem.user_id == current_user.id, CartItem.product_id == product_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart")

    item.quantity = payload.quantity
    db.commit()
    return _load_cart(db, current_user.id)


@router.delete("/items/{product_id}", response_model=CartOut)
def remove_from_cart(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> CartOut:
    db.query(CartItem).filter(
        CartItem.user_id == current_user.id, CartItem.product_id == product_id
    ).delete()
    db.commit()
    return _load_cart(db, current_user.id)
