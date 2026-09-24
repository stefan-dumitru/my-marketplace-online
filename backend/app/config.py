from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    cors_allowed_origins: list[str] = ["http://localhost:5173"]

    resend_api_key: str = ""
    email_from: str = "onboarding@resend.dev"

    session_ttl_days: int = 7
    verification_token_ttl_hours: int = 24
    lockout_max_attempts: int = 5
    lockout_duration_minutes: int = 15

    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    frontend_base_url: str = "http://localhost:5173"


settings = Settings()
