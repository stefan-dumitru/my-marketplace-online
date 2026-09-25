from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.deps import require_admin
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.catalog import CategoryCreateRequest, CategoryOut, CategoryUpdateRequest
from app.services.catalog import category_and_descendant_ids

router = APIRouter(tags=["catalog"])


def build_category_tree(categories: list[Category]) -> list[CategoryOut]:
    nodes = {
        category.id: CategoryOut(
            id=category.id, name=category.name, slug=category.slug, parent_id=category.parent_id
        )
        for category in categories
    }
    roots: list[CategoryOut] = []
    for category in categories:
        node = nodes[category.id]
        if category.parent_id is None:
            roots.append(node)
        else:
            parent = nodes.get(category.parent_id)
            if parent is not None:
                parent.children.append(node)
    return roots


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: DBSession = Depends(get_db)) -> list[CategoryOut]:
    categories = db.query(Category).order_by(Category.name).all()
    return build_category_tree(categories)


@router.post("/admin/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreateRequest,
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> Category:
    if payload.parent_id is not None:
        parent = db.query(Category).filter(Category.id == payload.parent_id).first()
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Parent category not found"
            )

    category = Category(name=payload.name, slug=payload.slug, parent_id=payload.parent_id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/admin/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdateRequest,
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    updates = payload.model_dump(exclude_unset=True)
    if "parent_id" in updates and updates["parent_id"] is not None:
        parent = db.query(Category).filter(Category.id == updates["parent_id"]).first()
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Parent category not found"
            )
    for field, value in updates.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/admin/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
) -> None:
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    referenced_ids = category_and_descendant_ids(db, category_id)
    in_use = db.query(Product).filter(Product.category_id.in_(referenced_ids)).first()
    if in_use is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a category that still has products in it or its subcategories",
        )

    db.delete(category)
    db.commit()
