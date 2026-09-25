from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import get_current_user
from app.models.address import Address
from app.models.cart_item import CartItem
from app.models.order import Order, OrderStatus
from app.models.order_line import OrderLine
from app.models.order_status_history import OrderStatusHistory
from app.models.product import ModerationStatus, Product
from app.models.seller_profile import SellerProfile, SellerStatus
from app.models.user import User
from app.schemas.checkout import CheckoutRequest, CheckoutResponse, SkippedItem

router = APIRouter(tags=["checkout"])


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> CheckoutResponse:
    address = (
        db.query(Address)
        .filter(Address.id == payload.address_id, Address.user_id == current_user.id)
        .first()
    )
    if address is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid shipping address"
        )

    cart_rows = (
        db.query(CartItem, Product, SellerProfile)
        .join(Product, CartItem.product_id == Product.id)
        .join(SellerProfile, Product.seller_id == SellerProfile.id)
        .filter(CartItem.user_id == current_user.id)
        .all()
    )
    if not cart_rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    by_seller: dict[int, list[tuple[CartItem, Product, SellerProfile]]] = defaultdict(list)
    for cart_item, product, seller in cart_rows:
        by_seller[product.seller_id].append((cart_item, product, seller))

    order_ids: list[int] = []
    skipped: list[SkippedItem] = []

    for seller_id, group in by_seller.items():
        seller = group[0][2]

        if seller.status != SellerStatus.approved:
            for _cart_item, product, _seller in group:
                skipped.append(
                    SkippedItem(
                        product_id=product.id,
                        product_name=product.name,
                        reason="No longer available",
                    )
                )
            db.commit()
            continue

        surviving_lines: list[tuple[CartItem, Product]] = []
        for cart_item, product, _seller in group:
            updated = (
                db.query(Product)
                .filter(
                    Product.id == product.id,
                    Product.is_active.is_(True),
                    Product.moderation_status == ModerationStatus.active,
                    Product.stock_quantity >= cart_item.quantity,
                )
                .update(
                    {Product.stock_quantity: Product.stock_quantity - cart_item.quantity},
                    synchronize_session=False,
                )
            )
            if updated == 1:
                surviving_lines.append((cart_item, product))
            else:
                fresh = db.query(Product).filter(Product.id == product.id).first()
                if (
                    fresh is None
                    or not fresh.is_active
                    or fresh.moderation_status != ModerationStatus.active
                ):
                    reason = "No longer available"
                else:
                    reason = "Out of stock"
                skipped.append(
                    SkippedItem(product_id=product.id, product_name=product.name, reason=reason)
                )

        if not surviving_lines:
            db.commit()
            continue

        total = sum(
            (product.price * cart_item.quantity for cart_item, product in surviving_lines),
            start=Decimal("0"),
        )
        order = Order(
            buyer_id=current_user.id,
            seller_id=seller_id,
            status=OrderStatus.placed,
            total_amount=total,
            ship_recipient_name=address.recipient_name,
            ship_street=address.street,
            ship_city=address.city,
            ship_region=address.region,
            ship_postal_code=address.postal_code,
            ship_country=address.country,
        )
        db.add(order)
        db.flush()

        for cart_item, product in surviving_lines:
            db.add(
                OrderLine(
                    order_id=order.id,
                    product_id=product.id,
                    product_name_snapshot=product.name,
                    unit_price_snapshot=product.price,
                    quantity=cart_item.quantity,
                    line_total=product.price * cart_item.quantity,
                )
            )
            db.delete(cart_item)

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                from_status=None,
                to_status=OrderStatus.placed,
                changed_by=current_user.id,
            )
        )

        order_ids.append(order.id)
        db.commit()

    return CheckoutResponse(order_ids=order_ids, skipped=skipped)
