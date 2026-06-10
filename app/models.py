"""SQLAlchemy ORM models — the database tables expressed as Python classes.

These define the *persistence* shape of the data (columns, types, constraints,
relationships). They are deliberately separate from the Pydantic schemas in
`schemas.py`, which define the *API* shape. Keeping the two apart means we can
change the wire format without touching the database layout, and vice versa.
"""
from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Category(Base):
    """A grouping for products (e.g. "Electronics"). Names are unique."""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    # unique=True enforces "no two categories with the same name" at the DB level —
    # a guarantee the database keeps even if application checks are ever bypassed.
    name = Column(String(100), nullable=False, unique=True, index=True)

    # ORM-level convenience: `category.products` lazily loads the related rows.
    # `back_populates` keeps both sides of the relationship in sync in memory.
    products = relationship("Product", back_populates="category")


class Product(Base):
    """A single inventory item."""
    __tablename__ = "products"
    # A named unique constraint on SKU. SKUs are business identifiers and must be
    # unique; enforcing it here makes duplicates impossible at the storage layer.
    __table_args__ = (UniqueConstraint("sku", name="uq_product_sku"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)        # indexed: we search/sort by it
    description = Column(Text, nullable=True)                       # free-form, optional
    sku = Column(String(64), nullable=False, index=True)           # indexed: we search by it
    # Numeric(10, 2) stores money as an exact fixed-point decimal (up to 99,999,999.99).
    # We deliberately avoid Float here — binary floats can't represent values like 0.10
    # exactly, which causes rounding errors in prices/totals.
    price = Column(Numeric(10, 2), nullable=False, default=0)
    stock_quantity = Column(Integer, nullable=False, default=0)
    # Nullable FK: a product may be uncategorised. ForeignKey ties it to categories.id
    # so the database can enforce referential integrity.
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    category = relationship("Category", back_populates="products")
