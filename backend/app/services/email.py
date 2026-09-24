import resend

from app.config import settings

resend.api_key = settings.resend_api_key


def send_verification_email(to_email: str, token: str) -> None:
    verify_url = f"{settings.frontend_base_url}/verify-email?token={token}"
    resend.Emails.send(
        {
            "from": settings.email_from,
            "to": [to_email],
            "subject": "Verify your email",
            "html": (
                f"<p>Welcome! Confirm your email to activate your account:</p>"
                f'<p><a href="{verify_url}">{verify_url}</a></p>'
            ),
        }
    )
