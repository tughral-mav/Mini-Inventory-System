"""Product HTTP endpoints: CRUD, search/filter, and stock adjustment.

This layer is thin on purpose. Its only jobs are:
  1. Declare the routes and their request/response shapes (FastAPI + schemas).
  2. Pull a DB session from the `get_db` dependency.
  3. Call into `crud` (where the real logic lives) and translate any domain
     `ValueError` into the appropriate HTTP status code.
Keeping logic out of here is what lets `crud` be tested without HTTP.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

# prefix means every route below is mounted under /api/products.
# tags groups them together in the auto-generated /docs page.
router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=List[schemas.ProductOut])
def list_products(
    # Declaring these as Query params makes them show up (typed + documented) in /docs.
    search: Optional[str] = Query(None, description="Match on product name or SKU"),
    category_id: Optional[int] = Query(None, description="Filter by category id"),
    db: Session = Depends(get_db),
):
    return crud.list_products(db, search=search, category_id=category_id)


@router.post("", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_product(db, payload)
    except ValueError as exc:
        # Creation errors here (duplicate SKU, bad category) are client mistakes -> 400.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)
):
    try:
        return crud.update_product(db, product_id, payload)
    except ValueError as exc:
        # One seam, two outcomes: "not found" is a 404; anything else (e.g. duplicate
        # SKU) is a 400. We disambiguate on the message the CRUD layer raised.
        status_code = (
            status.HTTP_404_NOT_FOUND
            if "not found" in str(exc)
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=str(exc))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    # 204 No Content is the conventional response for a successful delete with no body.
    try:
        crud.delete_product(db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{product_id}/stock", response_model=schemas.ProductOut)
def adjust_stock(
    product_id: int, payload: schemas.StockAdjust, db: Session = Depends(get_db)
):
    # PATCH (not PUT) because this is a partial, targeted modification of one field.
    try:
        return crud.adjust_stock(db, product_id, payload)
    except ValueError as exc:
        status_code = (
            status.HTTP_404_NOT_FOUND
            if "not found" in str(exc)
            else status.HTTP_400_BAD_REQUEST  # e.g. negative stock, both/neither delta+set
        )
        raise HTTPException(status_code=status_code, detail=str(exc))
