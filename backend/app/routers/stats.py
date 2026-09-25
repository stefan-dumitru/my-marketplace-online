from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import require_admin, require_approved_seller
from app.models.order import Order, OrderStatus
from app.models.order_line import OrderLine
from app.models.product import Product
from app.models.seller_profile import SellerProfile
from app.models.user import User
from app.schemas.stats import AdminStatsOut, SellerStatsOut, TopProductOut

router = APIRouter(tags=["stats"])


@router.get("/sellers/me/stats", response_model=SellerStatsOut)
def get_seller_stats(
    seller: SellerProfile = Depends(require_approved_seller),
    db: DBSession = Depends(get_db),
) -> SellerStatsOut:
    total_orders = db.query(Order).filter(Order.seller_id == seller.id).count()

    total_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.seller_id == seller.id, Order.status != OrderStatus.cancelled)
        .scalar()
    )

    top_rows = (
        db.query(
            OrderLine.product_id,
            Product.name,
            func.sum(OrderLine.quantity).label("qty"),
        )
        .join(Order, OrderLine.order_id == Order.id)
        .join(Product, OrderLine.product_id == Product.id)
        .filter(Order.seller_id == seller.id, Order.status != OrderStatus.cancelled)
        .group_by(OrderLine.product_id, Product.name)
        .order_by(func.sum(OrderLine.quantity).desc())
        .limit(5)
        .all()
    )

    return SellerStatsOut(
        total_orders=total_orders,
        total_revenue=Decimal(total_revenue),
        top_products=[
            TopProductOut(product_id=product_id, product_name=name, quantity_sold=int(qty))
            for product_id, name, qty in top_rows
        ],
    )


@router.get("/admin/stats", response_model=AdminStatsOut)
def get_admin_stats(
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> AdminStatsOut:
    total_sellers = db.query(SellerProfile).count()

    sellers_by_status_rows = (
        db.query(SellerProfile.status, func.count(SellerProfile.id))
        .group_by(SellerProfile.status)
        .all()
    )
    sellers_by_status = {status.value: count for status, count in sellers_by_status_rows}

    total_products = db.query(Product).count()
    total_orders = db.query(Order).count()

    total_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.status != OrderStatus.cancelled)
        .scalar()
    )

    orders_by_status_rows = (
        db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
    )
    orders_by_status = {status.value: count for status, count in orders_by_status_rows}

    return AdminStatsOut(
        total_sellers=total_sellers,
        sellers_by_status=sellers_by_status,
        total_products=total_products,
        total_orders=total_orders,
        total_revenue=Decimal(total_revenue),
        orders_by_status=orders_by_status,
    )
