"""Unit tests for the core business logic in app/crud.py."""
import pytest

from app import crud, schemas


def make_product(db, name="Widget", sku="W-001", price=9.99, stock=10, category_id=None):
    return crud.create_product(
        db,
        schemas.ProductCreate(
            name=name, sku=sku, price=price, stock_quantity=stock, category_id=category_id
        ),
    )


# ---------- Categories ----------
def test_create_and_list_categories(db_session):
    crud.create_category(db_session, schemas.CategoryCreate(name="Tools"))
    crud.create_category(db_session, schemas.CategoryCreate(name="Apparel"))
    names = [c.name for c in crud.list_categories(db_session)]
    assert names == ["Apparel", "Tools"]  # ordered by name


def test_duplicate_category_rejected(db_session):
    crud.create_category(db_session, schemas.CategoryCreate(name="Tools"))
    with pytest.raises(ValueError, match="already exists"):
        crud.create_category(db_session, schemas.CategoryCreate(name="Tools"))


# ---------- Product CRUD ----------
def test_create_product(db_session):
    p = make_product(db_session)
    assert p.id is not None
    assert p.sku == "W-001"


def test_duplicate_sku_rejected(db_session):
    make_product(db_session, sku="DUP")
    with pytest.raises(ValueError, match="already exists"):
        make_product(db_session, name="Other", sku="DUP")


def test_create_with_unknown_category_rejected(db_session):
    with pytest.raises(ValueError, match="does not exist"):
        make_product(db_session, category_id=999)


def test_update_product(db_session):
    p = make_product(db_session)
    updated = crud.update_product(
        db_session, p.id, schemas.ProductUpdate(name="Widget Pro", price=19.99)
    )
    assert updated.name == "Widget Pro"
    assert float(updated.price) == 19.99
    assert updated.sku == "W-001"  # unchanged


def test_update_missing_product(db_session):
    with pytest.raises(ValueError, match="not found"):
        crud.update_product(db_session, 123, schemas.ProductUpdate(name="X"))


def test_delete_product(db_session):
    p = make_product(db_session)
    crud.delete_product(db_session, p.id)
    assert crud.get_product(db_session, p.id) is None


# ---------- Search / Filter ----------
def test_search_by_name_and_sku(db_session):
    make_product(db_session, name="Red Hammer", sku="HAM-1")
    make_product(db_session, name="Blue Screwdriver", sku="SCR-1")
    assert len(crud.list_products(db_session, search="hammer")) == 1
    assert len(crud.list_products(db_session, search="SCR")) == 1
    assert len(crud.list_products(db_session, search="zzz")) == 0


def test_filter_by_category(db_session):
    cat = crud.create_category(db_session, schemas.CategoryCreate(name="Tools"))
    make_product(db_session, name="Hammer", sku="H1", category_id=cat.id)
    make_product(db_session, name="Shirt", sku="S1")
    results = crud.list_products(db_session, category_id=cat.id)
    assert [p.name for p in results] == ["Hammer"]


# ---------- Stock adjustment ----------
def test_increment_and_decrement_stock(db_session):
    p = make_product(db_session, stock=5)
    crud.adjust_stock(db_session, p.id, schemas.StockAdjust(delta=3))
    assert crud.get_product(db_session, p.id).stock_quantity == 8
    crud.adjust_stock(db_session, p.id, schemas.StockAdjust(delta=-2))
    assert crud.get_product(db_session, p.id).stock_quantity == 6


def test_set_absolute_stock(db_session):
    p = make_product(db_session, stock=5)
    crud.adjust_stock(db_session, p.id, schemas.StockAdjust(set=42))
    assert crud.get_product(db_session, p.id).stock_quantity == 42


def test_stock_cannot_go_negative(db_session):
    p = make_product(db_session, stock=1)
    with pytest.raises(ValueError, match="negative"):
        crud.adjust_stock(db_session, p.id, schemas.StockAdjust(delta=-5))


def test_stock_requires_delta_or_set(db_session):
    p = make_product(db_session)
    with pytest.raises(ValueError, match="either|one of"):
        crud.adjust_stock(db_session, p.id, schemas.StockAdjust())
