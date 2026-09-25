from datetime import UTC, datetime

from sqlalchemy.orm import Session as DBSession

from app.models.order import Order, OrderStatus
from app.models.order_line import OrderLine
from app.models.order_status_history import OrderStatusHistory
from app.models.product import Product

VALID_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.placed: {OrderStatus.shipped, OrderStatus.cancelled},
    OrderStatus.shipped: {OrderStatus.delivered, OrderStatus.cancelled},
    OrderStatus.delivered: set(),
    OrderStatus.cancelled: set(),
}


def transition_order_status(
    db: DBSession,
    order: Order,
    new_status: OrderStatus,
    changed_by_id: int,
    note: str | None = None,
) -> None:
    if new_status not in VALID_TRANSITIONS.get(order.status, set()):
        raise ValueError(f"Cannot transition an order from {order.status} to {new_status}")

    old_status = order.status
    now = datetime.now(UTC)
    order.status = new_status

    if new_status == OrderStatus.shipped:
        order.shipped_at = now
    elif new_status == OrderStatus.delivered:
        order.delivered_at = now
    elif new_status == OrderStatus.cancelled:
        order.cancelled_at = now
        lines = db.query(OrderLine).filter(OrderLine.order_id == order.id).all()
        for line in lines:
            db.query(Product).filter(Product.id == line.product_id).update(
                {Product.stock_quantity: Product.stock_quantity + line.quantity},
                synchronize_session=False,
            )

    db.add(
        OrderStatusHistory(
            order_id=order.id,
            from_status=old_status,
            to_status=new_status,
            changed_by=changed_by_id,
            note=note,
        )
    )
