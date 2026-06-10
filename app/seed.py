"""Seed the database with preexisting categories and products.

Runs on startup and is idempotent: it only inserts data when the tables are
empty, so restarting the app won't create duplicates.
"""
from sqlalchemy.orm import Session

from app import models

# category name -> list of products
SEED_DATA = {
    "Electronics": [
        {"name": "Wireless Mouse", "sku": "ELEC-001", "price": 19.99, "stock_quantity": 120,
         "description": "Ergonomic 2.4GHz wireless mouse"},
        {"name": "Mechanical Keyboard", "sku": "ELEC-002", "price": 79.99, "stock_quantity": 45,
         "description": "RGB backlit mechanical keyboard, blue switches"},
        {"name": "USB-C Hub", "sku": "ELEC-003", "price": 34.50, "stock_quantity": 80,
         "description": "7-in-1 USB-C hub with HDMI and card reader"},
    ],
    "Office Supplies": [
        {"name": "Stapler", "sku": "OFF-001", "price": 6.25, "stock_quantity": 200,
         "description": "Standard desktop stapler"},
        {"name": "A4 Paper Ream", "sku": "OFF-002", "price": 4.99, "stock_quantity": 500,
         "description": "500 sheets, 80gsm white paper"},
        {"name": "Ballpoint Pens (12pk)", "sku": "OFF-003", "price": 3.49, "stock_quantity": 0,
         "description": "Pack of 12 blue ballpoint pens"},
    ],
    "Tools": [
        {"name": "Claw Hammer", "sku": "TOOL-001", "price": 12.99, "stock_quantity": 60,
         "description": "16oz steel claw hammer"},
        {"name": "Screwdriver Set", "sku": "TOOL-002", "price": 24.95, "stock_quantity": 35,
         "description": "Precision screwdriver set, 32 pieces"},
    ],
    "Apparel": [
        {"name": "Cotton T-Shirt", "sku": "APP-001", "price": 9.99, "stock_quantity": 150,
         "description": "Unisex crew-neck cotton t-shirt"},
        {"name": "Baseball Cap", "sku": "APP-002", "price": 14.00, "stock_quantity": 90,
         "description": "Adjustable cotton baseball cap"},
    ],
}


def seed_if_empty(db: Session) -> None:
    """Insert seed data only if there are no products yet."""
    if db.query(models.Product).count() > 0:
        return

    for category_name, products in SEED_DATA.items():
        category = (
            db.query(models.Category).filter(models.Category.name == category_name).first()
        )
        if category is None:
            category = models.Category(name=category_name)
            db.add(category)
            db.flush()  # assign category.id without a full commit

        for product in products:
            db.add(models.Product(category_id=category.id, **product))

    db.commit()
