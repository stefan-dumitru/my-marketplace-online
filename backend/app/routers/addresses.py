from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import get_current_user
from app.models.address import Address
from app.models.user import User
from app.schemas.address import AddressCreateRequest, AddressOut, AddressUpdateRequest

router = APIRouter(prefix="/addresses", tags=["addresses"])


def _unset_other_defaults(db: DBSession, user_id: int, exclude_id: int | None = None) -> None:
    query = db.query(Address).filter(Address.user_id == user_id, Address.is_default.is_(True))
    if exclude_id is not None:
        query = query.filter(Address.id != exclude_id)
    query.update({Address.is_default: False}, synchronize_session=False)


def _get_own_address_or_404(db: DBSession, user_id: int, address_id: int) -> Address:
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == user_id).first()
    if address is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    return address


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
    has_existing = db.query(Address).filter(Address.user_id == current_user.id).first() is not None
    is_default = payload.is_default or not has_existing
    if is_default and has_existing:
        _unset_other_defaults(db, current_user.id)

    data = payload.model_dump(exclude={"is_default"})
    address = Address(user_id=current_user.id, is_default=is_default, **data)
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.patch("/{address_id}", response_model=AddressOut)
def update_address(
    address_id: int,
    payload: AddressUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> Address:
    address = _get_own_address_or_404(db, current_user.id, address_id)

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("is_default") is True:
        _unset_other_defaults(db, current_user.id, exclude_id=address.id)
    for field, value in updates.items():
        setattr(address, field, value)

    db.commit()
    db.refresh(address)
    return address


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> None:
    address = _get_own_address_or_404(db, current_user.id, address_id)
    was_default = address.is_default
    db.delete(address)
    db.flush()

    if was_default:
        next_default = (
            db.query(Address)
            .filter(Address.user_id == current_user.id)
            .order_by(Address.created_at.desc())
            .first()
        )
        if next_default is not None:
            next_default.is_default = True

    db.commit()
