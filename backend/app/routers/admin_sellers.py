from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import require_admin
from app.models.seller_action_log import SellerAction, SellerActionLog
from app.models.seller_profile import SellerProfile, SellerStatus
from app.models.user import User
from app.schemas.seller import SellerApplicationOut, SellerRejectRequest

router = APIRouter(prefix="/admin/sellers", tags=["admin"])


@router.get("", response_model=list[SellerApplicationOut])
def list_sellers(
    status_filter: SellerStatus | None = None,
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> list[SellerProfile]:
    query = db.query(SellerProfile)
    if status_filter is not None:
        query = query.filter(SellerProfile.status == status_filter)
    return query.order_by(SellerProfile.submitted_at).all()


def _get_seller_or_404(db: DBSession, seller_id: int) -> SellerProfile:
    seller = db.query(SellerProfile).filter(SellerProfile.id == seller_id).first()
    if seller is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seller not found")
    return seller


@router.post("/{seller_id}/approve", response_model=SellerApplicationOut)
def approve_seller(
    seller_id: int,
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> SellerProfile:
    seller = _get_seller_or_404(db, seller_id)
    now = datetime.now(UTC)
    seller.status = SellerStatus.approved
    seller.decided_at = now
    seller.decided_by = admin.id
    db.add(
        SellerActionLog(
            seller_profile_id=seller.id, admin_id=admin.id, action=SellerAction.approved
        )
    )
    db.commit()
    db.refresh(seller)
    return seller


@router.post("/{seller_id}/reject", response_model=SellerApplicationOut)
def reject_seller(
    seller_id: int,
    payload: SellerRejectRequest,
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> SellerProfile:
    seller = _get_seller_or_404(db, seller_id)
    now = datetime.now(UTC)
    seller.status = SellerStatus.rejected
    seller.decided_at = now
    seller.decided_by = admin.id
    db.add(
        SellerActionLog(
            seller_profile_id=seller.id,
            admin_id=admin.id,
            action=SellerAction.rejected,
            reason=payload.reason,
        )
    )
    db.commit()
    db.refresh(seller)
    return seller
