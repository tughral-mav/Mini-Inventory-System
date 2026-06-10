"""Pydantic schemas — the validated request/response shapes for the API.

Why a separate set of classes from the ORM models?
  * Validation: Pydantic checks types and constraints (min length, >= 0, ...) at
    the edge of the system, so bad input is rejected before it reaches our logic.
  * Decoupling: the API contract can differ from the table layout and evolve
    independently (e.g. hide a column, rename a field) without a DB migration.
  * Serialization: FastAPI uses these to produce the JSON responses and the
    auto-generated OpenAPI docs.
"""
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Category ----------
class CategoryBase(BaseModel):
    # min_length=1 rejects empty names; max_length mirrors the DB column width.
    name: str = Field(..., min_length=1, max_length=100)


class CategoryCreate(CategoryBase):
    """Input shape for creating a category (just inherits `name`)."""
    pass


class CategoryOut(CategoryBase):
    """Output shape — includes the DB-assigned id."""
    # from_attributes=True lets Pydantic read values off an ORM object's attributes
    # (e.g. category.id), so we can return SQLAlchemy instances directly from routes.
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Product ----------
class ProductBase(BaseModel):
    """Fields shared by create and output. Constraints double as input validation."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    sku: str = Field(..., min_length=1, max_length=64)
    price: Decimal = Field(default=Decimal("0"), ge=0)        # ge=0: price can't be negative
    stock_quantity: int = Field(default=0, ge=0)              # ge=0: stock can't start negative
    category_id: Optional[int] = None


class ProductCreate(ProductBase):
    """Input shape for POST /products."""
    pass


class ProductUpdate(BaseModel):
    """Input shape for PUT /products/{id}.

    Every field is Optional so callers can send a *partial* update — only the keys
    present in the request body are changed. The CRUD layer uses
    `model_dump(exclude_unset=True)` to tell "field omitted" apart from
    "field explicitly set to null", which a fixed schema couldn't express.
    """
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    sku: Optional[str] = Field(default=None, min_length=1, max_length=64)
    price: Optional[Decimal] = Field(default=None, ge=0)
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    category_id: Optional[int] = None


class StockAdjust(BaseModel):
    """Input shape for PATCH /products/{id}/stock.

    Two mutually-exclusive modes (validated in the CRUD layer):
      * delta -> relative change, e.g. {"delta": -2} sold two units.
      * set   -> absolute override, e.g. {"set": 40} after a physical recount.
    Modelling these as intent (rather than a plain stock field on PUT) makes the
    operation self-documenting and gives one place to guard against negative stock.
    """
    delta: Optional[int] = None
    set: Optional[int] = Field(default=None, ge=0)


class ProductOut(ProductBase):
    """Output shape — adds the id and the nested category object."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    # Nested category so clients get the name without a second request.
    category: Optional[CategoryOut] = None
