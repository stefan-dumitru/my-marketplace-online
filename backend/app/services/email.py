import logging

import resend

from app.config import settings
from app.models.order import Order
from app.models.seller_profile import SellerProfile, SellerStatus

logger = logging.getLogger(__name__)

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


def send_order_placed_email(to_email: str, order: Order) -> None:
    """Best-effort — per operations.md, a failed send here never blocks the order."""
    try:
        resend.Emails.send(
            {
                "from": settings.email_from,
                "to": [to_email],
                "subject": f"Order #{order.id} placed",
                "html": (
                    f"<p>Thanks! Your order #{order.id} ({order.total_amount} lei) "
                    "has been placed.</p>"
                ),
            }
        )
    except Exception:
        logger.exception("Failed to send order-placed email for order %s", order.id)


def send_order_status_changed_email(to_email: str, order: Order) -> None:
    """Best-effort — per operations.md, a failed send here never blocks the status change."""
    try:
        resend.Emails.send(
            {
                "from": settings.email_from,
                "to": [to_email],
                "subject": f"Order #{order.id} update: {order.status.value}",
                "html": (
                    f"<p>Your order #{order.id} is now "
                    f"<strong>{order.status.value}</strong>.</p>"
                ),
            }
        )
    except Exception:
        logger.exception("Failed to send order-status-changed email for order %s", order.id)


def send_seller_decision_email(to_email: str, seller: SellerProfile) -> None:
    """Best-effort — per operations.md, a failed send here never blocks the admin's decision."""
    decision = "approved" if seller.status == SellerStatus.approved else "rejected"
    try:
        resend.Emails.send(
            {
                "from": settings.email_from,
                "to": [to_email],
                "subject": f"Your seller application was {decision}",
                "html": f'<p>Your application for "{seller.business_name}" was {decision}.</p>',
            }
        )
    except Exception:
        logger.exception("Failed to send seller-decision email for seller profile %s", seller.id)
