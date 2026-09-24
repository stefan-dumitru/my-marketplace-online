import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.db import get_db
from app.deps import SESSION_COOKIE_NAME, get_current_user
from app.models.email_verification import EmailVerificationToken
from app.models.login_attempt import LoginAttempt
from app.models.session import Session
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, UserPublic, VerifyEmailRequest
from app.security import generate_token, hash_password, verify_password
from app.services.email import send_verification_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
    )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: DBSession = Depends(get_db)) -> dict[str, str]:
    email = payload.email.lower()
    now = datetime.now(UTC)

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        created_at=now,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        ) from exc

    verification_token = EmailVerificationToken(
        token=generate_token(),
        user_id=user.id,
        expires_at=now + timedelta(hours=settings.verification_token_ttl_hours),
    )
    db.add(verification_token)

    try:
        send_verification_email(user.email, verification_token.token)
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to send verification email")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send verification email, please try again",
        ) from exc

    db.commit()
    return {"message": "Check your email to verify your account."}


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: DBSession = Depends(get_db)) -> dict[str, str]:
    now = datetime.now(UTC)
    token_row = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token == payload.token)
        .first()
    )
    if token_row is None or token_row.used_at is not None or token_row.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link",
        )

    user = db.query(User).filter(User.id == token_row.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link",
        )

    token_row.used_at = now
    user.email_verified = True
    db.commit()
    return {"message": "Email verified"}


@router.post("/login", response_model=UserPublic)
def login(payload: LoginRequest, response: Response, db: DBSession = Depends(get_db)) -> User:
    email = payload.email.lower()
    now = datetime.now(UTC)
    user = db.query(User).filter(User.email == email).first()

    if user is not None and user.locked_until is not None and user.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Too many failed attempts. Try again later.",
        )

    credentials_valid = user is not None and verify_password(payload.password, user.password_hash)

    if not credentials_valid:
        if user is not None:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.lockout_max_attempts:
                user.locked_until = now + timedelta(minutes=settings.lockout_duration_minutes)
        db.add(
            LoginAttempt(
                email_attempted=email,
                user_id=user.id if user is not None else None,
                success=False,
            )
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    assert user is not None
    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(LoginAttempt(email_attempted=email, user_id=user.id, success=True))

    if not user.email_verified:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )

    session = Session(
        token=generate_token(),
        user_id=user.id,
        expires_at=now + timedelta(days=settings.session_ttl_days),
    )
    db.add(session)
    db.commit()

    _set_session_cookie(response, session.token)
    return user


@router.post("/logout")
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: DBSession = Depends(get_db),
) -> dict[str, str]:
    if session_token is not None:
        db.query(Session).filter(Session.token == session_token).delete()
        db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
