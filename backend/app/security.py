import secrets

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return str(pwd_context.hash(password))


def verify_password(password: str, password_hash: str) -> bool:
    return bool(pwd_context.verify(password, password_hash))


def generate_token() -> str:
    return secrets.token_urlsafe(32)
