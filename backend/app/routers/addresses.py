from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import get_current_user
from app.models.address import Address
from app.models.user import User
from app.schemas.address import AddressCreateRequest, AddressOut

router = APIRouter(prefix="/addresses", tags=["addresses"])


@router.get("", response_model=list[AddressOut])
def list_addresses(
    current_user: User = Depends(get_current_user), db: DBSession = Depends(get_db)
) -> list[Address]:
    return db.query(Address).filter(Address.user_id == current_user.id).all()


@router.post("", response_model=AddressOut, status_code=status.HTTP_201_CREATED)
def create_address(
    payload: AddressCreateRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> Address:
    address = Address(user_id=current_user.id, **payload.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address
