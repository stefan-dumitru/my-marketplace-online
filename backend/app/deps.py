from datetime import UTC, datetime, timedelta

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.db import get_db
from app.models.session import Session
from app.models.user import User

SESSION_COOKIE_NAME = "session_token"


def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: DBSession = Depends(get_db),
) -> User:
    if session_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    session = db.query(Session).filter(Session.token == session_token).first()
    now = datetime.now(UTC)
    if session is None or session.expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user = db.query(User).filter(User.id == session.user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    session.last_used_at = now
    session.expires_at = now + timedelta(days=settings.session_ttl_days)
    db.commit()

    return user
