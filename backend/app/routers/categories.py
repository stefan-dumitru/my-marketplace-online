from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.models.category import Category
from app.schemas.catalog import CategoryOut

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
