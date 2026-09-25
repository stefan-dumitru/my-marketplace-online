from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import get_current_user
from app.models.order import Order, OrderStatus
from app.models.order_line import OrderLine
from app.models.product import Product
from app.models.review import Review
from app.models.user import User
from app.schemas.catalog import Page
from app.schemas.review import ReviewCreateRequest, ReviewOut, ReviewUpdateRequest

router = APIRouter(prefix="/products/{product_id}/reviews", tags=["reviews"])


def _get_product_or_404(db: DBSession, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _to_review_out(review: Review, buyer_name: str) -> ReviewOut:
    return ReviewOut(
        id=review.id,
        product_id=review.product_id,
        buyer_id=review.buyer_id,
        buyer_name=buyer_name,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.get("", response_model=Page[ReviewOut])
def list_reviews(
    product_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: DBSession = Depends(get_db),
) -> Page[ReviewOut]:
    _get_product_or_404(db, product_id)

    query = (
        db.query(Review, User.full_name)
        .join(User, Review.buyer_id == User.id)
        .filter(Review.product_id == product_id)
    )
    total = query.count()
    rows = (
        query.order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [_to_review_out(review, buyer_name) for review, buyer_name in rows]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/me", response_model=ReviewOut)
def get_my_review(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> ReviewOut:
    review = (
        db.query(Review)
        .filter(Review.product_id == product_id, Review.buyer_id == current_user.id)
        .first()
    )
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No review found")
    return _to_review_out(review, current_user.full_name)


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    product_id: int,
    payload: ReviewCreateRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> ReviewOut:
    _get_product_or_404(db, product_id)

    existing = (
        db.query(Review)
        .filter(Review.product_id == product_id, Review.buyer_id == current_user.id)
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="You already reviewed this product"
        )

    qualifying_order = (
        db.query(Order)
        .join(OrderLine, OrderLine.order_id == Order.id)
        .filter(
            Order.buyer_id == current_user.id,
            Order.status == OrderStatus.delivered,
            OrderLine.product_id == product_id,
        )
        .first()
    )
    if qualifying_order is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can review this product after your order for it is delivered",
        )

    review = Review(
        product_id=product_id,
        buyer_id=current_user.id,
        order_id=qualifying_order.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _to_review_out(review, current_user.full_name)


@router.patch("/me", response_model=ReviewOut)
def update_my_review(
    product_id: int,
    payload: ReviewUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> ReviewOut:
    review = (
        db.query(Review)
        .filter(Review.product_id == product_id, Review.buyer_id == current_user.id)
        .first()
    )
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No review found")

    review.rating = payload.rating
    review.comment = payload.comment
    db.commit()
    db.refresh(review)
    return _to_review_out(review, current_user.full_name)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_review(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> None:
    review = (
        db.query(Review)
        .filter(Review.product_id == product_id, Review.buyer_id == current_user.id)
        .first()
    )
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No review found")

    db.delete(review)
    db.commit()
