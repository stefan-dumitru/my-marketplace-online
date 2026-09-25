from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import require_admin
from app.models.order import Order
from app.models.seller_profile import SellerProfile
from app.models.user import User
from app.schemas.order import OrderListItemOut, OrderStatusUpdateRequest
from app.services.email import send_order_status_changed_email
from app.services.orders import transition_order_status

router = APIRouter(prefix="/admin/orders", tags=["admin"])


@router.patch("/{order_id}/status", response_model=OrderListItemOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdateRequest,
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> OrderListItemOut:
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    try:
        transition_order_status(db, order, payload.status, admin.id, payload.note)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db.commit()
    db.refresh(order)

    seller = db.query(SellerProfile).filter(SellerProfile.id == order.seller_id).first()
    buyer = db.query(User).filter(User.id == order.buyer_id).first()
    if buyer is not None:
        send_order_status_changed_email(buyer.email, order)

    return OrderListItemOut(
        id=order.id,
        seller_id=order.seller_id,
        seller_business_name=seller.business_name if seller else "",
        status=order.status,
        placed_at=order.placed_at,
        total_amount=order.total_amount,
    )
