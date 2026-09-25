"""Seed local dev data for browsing the Phase 2 catalog.

There's no write-path through the API yet to create sellers/products (that's Phase 3), so this
inserts directly via the ORM. Run with: python -m scripts.seed_dev_data
Safe to re-run — every insert is get-or-create keyed on its natural unique field.
"""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.category import Category
from app.models.product import Product
from app.models.seller_profile import SellerProfile, SellerStatus
from app.models.user import User
from app.security import hash_password


def get_or_create_user(db: Session, email: str, full_name: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user is not None:
        return user
    user = User(
        email=email,
        password_hash=hash_password("password123"),
        full_name=full_name,
        email_verified=True,
        created_at=datetime.now(UTC),
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_seller(db: Session, user: User, business_name: str) -> SellerProfile:
    seller = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
    if seller is not None:
        return seller
    seller = SellerProfile(
        user_id=user.id,
        business_name=business_name,
        status=SellerStatus.approved,
        decided_at=datetime.now(UTC),
    )
    db.add(seller)
    db.flush()
    return seller


def get_or_create_category(
    db: Session, name: str, slug: str, parent: Category | None = None
) -> Category:
    category = db.query(Category).filter(Category.slug == slug).first()
    if category is not None:
        return category
    category = Category(name=name, slug=slug, parent_id=parent.id if parent else None)
    db.add(category)
    db.flush()
    return category


def get_or_create_product(
    db: Session,
    seller: SellerProfile,
    category: Category,
    name: str,
    description: str,
    price: str,
    stock_quantity: int,
) -> Product:
    product = db.query(Product).filter(Product.name == name).first()
    if product is not None:
        return product
    product = Product(
        seller_id=seller.id,
        category_id=category.id,
        name=name,
        description=description,
        price=Decimal(price),
        stock_quantity=stock_quantity,
    )
    db.add(product)
    db.flush()
    return product


def main() -> None:
    db = SessionLocal()
    try:
        user = get_or_create_user(db, "seller@example.com", "Demo Seller")
        seller = get_or_create_seller(db, user, "Demo Electronics & Books")

        electronics = get_or_create_category(db, "Electronics", "electronics")
        laptops = get_or_create_category(db, "Laptops", "laptops", parent=electronics)
        phones = get_or_create_category(db, "Phones", "phones", parent=electronics)
        books = get_or_create_category(db, "Books", "books")

        get_or_create_product(
            db,
            seller,
            laptops,
            "ThinkPad X1 Carbon",
            "A light, sturdy business laptop.",
            "1500.00",
            10,
        )
        get_or_create_product(
            db,
            seller,
            laptops,
            "MacBook Air",
            "Apple's thin-and-light laptop.",
            "1200.00",
            5,
        )
        get_or_create_product(
            db,
            seller,
            phones,
            "iPhone 15",
            "Apple's latest phone.",
            "999.99",
            20,
        )
        get_or_create_product(
            db,
            seller,
            phones,
            "Samsung Galaxy S24",
            "Samsung's flagship phone.",
            "899.99",
            15,
        )
        get_or_create_product(
            db,
            seller,
            books,
            "Clean Code",
            "A handbook of agile software craftsmanship.",
            "35.50",
            100,
        )
        get_or_create_product(
            db,
            seller,
            books,
            "The Pragmatic Programmer",
            "From journeyman to master.",
            "40.00",
            50,
        )

        db.commit()
        print("Seed data ready.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
