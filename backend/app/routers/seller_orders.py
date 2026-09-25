from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import require_approved_seller
from app.models.order import Order
from app.models.seller_profile import SellerProfile
from app.models.user import User
from app.schemas.catalog import Page
from app.schemas.order import OrderListItemOut, OrderStatusUpdateRequest
from app.services.email import send_order_status_changed_email
from app.services.orders import transition_order_status

router = APIRouter(prefix="/sellers/me/orders", tags=["sellers"])


@router.get("", response_model=Page[OrderListItemOut])
def list_my_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    seller: SellerProfile = Depends(require_approved_seller),
    db: DBSession = Depends(get_db),
) -> Page[OrderListItemOut]:
    query = db.query(Order).filter(Order.seller_id == seller.id)
    total = query.count()
    rows = (
        query.order_by(Order.placed_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    )
    items = [
        OrderListItemOut(
            id=order.id,
            seller_id=order.seller_id,
            seller_business_name=seller.business_name,
            status=order.status,
            placed_at=order.placed_at,
            total_amount=order.total_amount,
        )
        for order in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.patch("/{order_id}/status", response_model=OrderListItemOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdateRequest,
    seller: SellerProfile = Depends(require_approved_seller),
    db: DBSession = Depends(get_db),
) -> OrderListItemOut:
    order = db.query(Order).filter(Order.id == order_id, Order.seller_id == seller.id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    try:
        transition_order_status(db, order, payload.status, seller.user_id, payload.note)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db.commit()
    db.refresh(order)

    buyer: User | None = db.query(User).filter(User.id == order.buyer_id).first()
    if buyer is not None:
        send_order_status_changed_email(buyer.email, order)

    return OrderListItemOut(
        id=order.id,
        seller_id=order.seller_id,
        seller_business_name=seller.business_name,
        status=order.status,
        placed_at=order.placed_at,
        total_amount=order.total_amount,
    )
