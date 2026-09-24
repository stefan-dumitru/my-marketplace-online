import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
def health_check(db: Session = Depends(get_db)) -> JSONResponse:
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check failed: database unreachable")
        return JSONResponse(
            status_code=503,
            content={"status": "error", "db": "unreachable"},
        )
    return JSONResponse(status_code=200, content={"status": "ok", "db": "ok"})
