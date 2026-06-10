"""Category HTTP endpoints.

Same thin-router pattern as products.py: declare routes, get a session, delegate
to `crud`, and translate domain errors into HTTP responses.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=List[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return crud.list_categories(db)


@router.post("", response_model=schemas.CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: schemas.CategoryCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_category(db, payload)
    except ValueError as exc:
        # Only failure mode here is a duplicate name -> a client error -> 400.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
