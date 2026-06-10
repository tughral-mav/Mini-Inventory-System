"""Core business logic: CRUD, search/filter, and stock adjustment.

This is the heart of the application and it is intentionally **framework-agnostic**:
it knows about the database (via a SQLAlchemy Session) but nothing about HTTP.
Domain errors are signalled by raising `ValueError`; the router layer (the only
HTTP-aware code) catches these and maps them to the right status codes.

Why this split? It means the rules here can be unit-tested by calling functions
directly with a Session — no web server, no request mocking (see tests/test_crud.py).
"""
from typing import List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas


# ---------- Categories ----------
def create_category(db: Session, data: schemas.CategoryCreate) -> models.Category:
    # Pre-check for a friendly error message. The DB unique constraint is the real
    # safety net (it also covers races); this just gives a clearer message first.
    if db.query(models.Category).filter(models.Category.name == data.name).first():
        raise ValueError(f"Category '{data.name}' already exists")
    category = models.Category(name=data.name)
    db.add(category)
    db.commit()          # persist the INSERT
    db.refresh(category)  # reload so category.id (assigned by the DB) is populated
    return category


def list_categories(db: Session) -> List[models.Category]:
    # Sorted by name for a stable, predictable order in the UI and tests.
    return db.query(models.Category).order_by(models.Category.name).all()


def get_category(db: Session, category_id: int) -> Optional[models.Category]:
    # Session.get() is a primary-key lookup; returns None if the id doesn't exist.
    return db.get(models.Category, category_id)


# ---------- Products ----------
def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
    # Guard 1: SKUs must be unique (business identifier).
    if db.query(models.Product).filter(models.Product.sku == data.sku).first():
        raise ValueError(f"SKU '{data.sku}' already exists")
    # Guard 2: if a category was given, it must actually exist — otherwise the FK
    # would point at nothing. We fail early with a clear message.
    if data.category_id is not None and get_category(db, data.category_id) is None:
        raise ValueError(f"Category id {data.category_id} does not exist")

    # model_dump() turns the validated schema into a plain dict of column values.
    product = models.Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_product(db: Session, product_id: int) -> Optional[models.Product]:
    return db.get(models.Product, product_id)


def list_products(
    db: Session,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
) -> List[models.Product]:
    """List products with optional free-text search (name OR SKU) and category filter.

    The filters compose: passing both narrows to products that match the search
    *and* belong to the category. Omitting a filter (None) leaves it unapplied.
    """
    query = db.query(models.Product)

    if search:
        # ilike = case-insensitive LIKE. The %term% wildcards match anywhere in the
        # string. or_(...) means a hit on either the name or the SKU qualifies.
        like = f"%{search}%"
        query = query.filter(
            or_(models.Product.name.ilike(like), models.Product.sku.ilike(like))
        )
    if category_id is not None:
        query = query.filter(models.Product.category_id == category_id)

    return query.order_by(models.Product.name).all()


def update_product(
    db: Session, product_id: int, data: schemas.ProductUpdate
) -> models.Product:
    product = get_product(db, product_id)
    if product is None:
        raise ValueError(f"Product id {product_id} not found")

    # exclude_unset=True -> only the fields the caller actually sent. This is what
    # makes partial updates work: a PUT with just {"price": 5} won't blank the name.
    fields = data.model_dump(exclude_unset=True)

    # If the SKU is changing, re-check uniqueness (skip if unchanged to allow
    # "save with same SKU" no-ops).
    new_sku = fields.get("sku")
    if new_sku and new_sku != product.sku:
        if db.query(models.Product).filter(models.Product.sku == new_sku).first():
            raise ValueError(f"SKU '{new_sku}' already exists")

    # If the category is changing, validate the new one exists.
    new_cat = fields.get("category_id")
    if new_cat is not None and get_category(db, new_cat) is None:
        raise ValueError(f"Category id {new_cat} does not exist")

    # Apply each provided field onto the ORM object, then commit the UPDATE.
    for key, value in fields.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    if product is None:
        raise ValueError(f"Product id {product_id} not found")
    db.delete(product)
    db.commit()


def adjust_stock(db: Session, product_id: int, adjust: schemas.StockAdjust) -> models.Product:
    """Change stock either relatively (`delta`) or absolutely (`set`).

    Exactly one mode must be supplied. The single non-negative guard lives here so
    no code path — API, seed, or future caller — can drive stock below zero.
    """
    product = get_product(db, product_id)
    if product is None:
        raise ValueError(f"Product id {product_id} not found")

    # Enforce "exactly one of delta/set". Both or neither is ambiguous, so reject it.
    if adjust.set is not None and adjust.delta is not None:
        raise ValueError("Provide either 'delta' or 'set', not both")
    if adjust.set is None and adjust.delta is None:
        raise ValueError("Provide one of 'delta' or 'set'")

    if adjust.set is not None:
        new_qty = adjust.set                              # absolute override
    else:
        new_qty = product.stock_quantity + adjust.delta   # relative change

    # Stock represents physical units; it can never be negative.
    if new_qty < 0:
        raise ValueError("Stock quantity cannot go negative")

    product.stock_quantity = new_qty
    db.commit()
    db.refresh(product)
    return product
