from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.category import Category
from app.models.email_verification import EmailVerificationToken
from app.models.product import Product
from app.models.seller_profile import SellerProfile, SellerStatus
from app.models.user import User

DEFAULT_PASSWORD = "correct horse battery staple"


def signup_verify_login(
    client: TestClient,
    db_session: DBSession,
    monkeypatch,
    email: str,
    *,
    is_admin: bool = False,
    full_name: str = "Test User",
) -> User:
    """Sign up, verify, and log in a fresh user, leaving the session cookie on `client`."""
    monkeypatch.setattr("app.routers.auth.send_verification_email", lambda *a, **k: None)

    response = client.post(
        "/auth/signup",
        json={"email": email, "password": DEFAULT_PASSWORD, "full_name": full_name},
    )
    assert response.status_code == 201, response.text

    user = db_session.query(User).filter(User.email == email).one()
    if is_admin:
        user.is_admin = True
        db_session.commit()

    token_row = (
        db_session.query(EmailVerificationToken)
        .filter(EmailVerificationToken.user_id == user.id)
        .one()
    )
    verify_response = client.post("/auth/verify-email", json={"token": token_row.token})
    assert verify_response.status_code == 200, verify_response.text

    login_response = client.post("/auth/login", json={"email": email, "password": DEFAULT_PASSWORD})
    assert login_response.status_code == 200, login_response.text

    return user


def make_approved_seller(
    client: TestClient, db_session: DBSession, monkeypatch, email: str
) -> SellerProfile:
    """Sign up, verify, log in, and approve a seller — leaves `client` logged in as them."""
    user = signup_verify_login(client, db_session, monkeypatch, email)
    apply_response = client.post("/sellers/apply", json={"business_name": f"{email}'s Shop"})
    assert apply_response.status_code == 201, apply_response.text

    seller = db_session.query(SellerProfile).filter(SellerProfile.user_id == user.id).one()
    seller.status = SellerStatus.approved
    db_session.commit()
    return seller


def make_category(db_session: DBSession, name: str = "Gadgets", slug: str = "gadgets") -> Category:
    category = db_session.query(Category).filter(Category.slug == slug).first()
    if category is not None:
        return category
    category = Category(name=name, slug=slug)
    db_session.add(category)
    db_session.commit()
    return category


def make_product(
    db_session: DBSession,
    seller: SellerProfile,
    category: Category,
    *,
    name: str = "Widget",
    price: str = "10.00",
    stock_quantity: int = 5,
) -> Product:
    product = Product(
        seller_id=seller.id,
        category_id=category.id,
        name=name,
        description=f"A fine {name.lower()}",
        price=price,
        stock_quantity=stock_quantity,
    )
    db_session.add(product)
    db_session.commit()
    return product
