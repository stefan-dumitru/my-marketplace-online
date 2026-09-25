from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import get_current_user
from app.models.order import Order
from app.models.order_line import OrderLine
from app.models.seller_profile import SellerProfile
from app.models.user import User
from app.schemas.catalog import Page
from app.schemas.order import OrderDetailOut, OrderLineOut, OrderListItemOut

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=Page[OrderListItemOut])
def list_my_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> Page[OrderListItemOut]:
    query = (
        db.query(Order, SellerProfile.business_name)
        .join(SellerProfile, Order.seller_id == SellerProfile.id)
        .filter(Order.buyer_id == current_user.id)
    )
    total = query.count()
    rows = (
        query.order_by(Order.placed_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    )
    items = [
        OrderListItemOut(
            id=order.id,
            seller_id=order.seller_id,
            seller_business_name=business_name,
            status=order.status,
            placed_at=order.placed_at,
            total_amount=order.total_amount,
        )
        for order, business_name in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/{order_id}", response_model=OrderDetailOut)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> OrderDetailOut:
    row = (
        db.query(Order, SellerProfile.business_name)
        .join(SellerProfile, Order.seller_id == SellerProfile.id)
        .filter(Order.id == order_id, Order.buyer_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order, business_name = row
    lines = db.query(OrderLine).filter(OrderLine.order_id == order.id).all()

    return OrderDetailOut(
        id=order.id,
        seller_id=order.seller_id,
        seller_business_name=business_name,
        status=order.status,
        placed_at=order.placed_at,
        total_amount=order.total_amount,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
        cancelled_at=order.cancelled_at,
        ship_recipient_name=order.ship_recipient_name,
        ship_street=order.ship_street,
        ship_city=order.ship_city,
        ship_region=order.ship_region,
        ship_postal_code=order.ship_postal_code,
        ship_country=order.ship_country,
        lines=[OrderLineOut.model_validate(line) for line in lines],
    )
