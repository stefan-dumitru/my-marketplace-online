from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import get_current_user
from app.models.seller_profile import SellerProfile, SellerStatus
from app.models.user import User
from app.schemas.seller import SellerApplicationOut, SellerApplyRequest

router = APIRouter(prefix="/sellers", tags=["sellers"])


@router.post("/apply", response_model=SellerApplicationOut, status_code=status.HTTP_201_CREATED)
def apply(
    payload: SellerApplyRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> SellerProfile:
    seller = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()

    if seller is None:
        seller = SellerProfile(
            user_id=current_user.id,
            business_name=payload.business_name,
            status=SellerStatus.pending,
        )
        db.add(seller)
    elif seller.status == SellerStatus.rejected:
        seller.business_name = payload.business_name
        seller.status = SellerStatus.pending
        seller.submitted_at = datetime.now(UTC)
        seller.decided_at = None
        seller.decided_by = None
    else:
        detail = (
            "Application already pending"
            if seller.status == SellerStatus.pending
            else "Already an approved seller"
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

    db.commit()
    db.refresh(seller)
    return seller


@router.get("/me/application", response_model=SellerApplicationOut)
def my_application(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> SellerProfile:
    seller = db.query(SellerProfile).filter(SellerProfile.user_id == current_user.id).first()
    if seller is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No application found")
    return seller
