"""Integration tests for the HTTP API."""


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_product_crud_flow(client):
    # Create
    resp = client.post("/api/products", json={"name": "Widget", "sku": "W-1", "price": 9.99, "stock_quantity": 5})
    assert resp.status_code == 201
    pid = resp.json()["id"]

    # Read
    assert client.get(f"/api/products/{pid}").json()["name"] == "Widget"

    # Update
    resp = client.put(f"/api/products/{pid}", json={"price": 12.5})
    assert resp.status_code == 200
    assert float(resp.json()["price"]) == 12.5

    # List
    assert len(client.get("/api/products").json()) == 1

    # Delete
    assert client.delete(f"/api/products/{pid}").status_code == 204
    assert client.get(f"/api/products/{pid}").status_code == 404


def test_duplicate_sku_returns_400(client):
    client.post("/api/products", json={"name": "A", "sku": "DUP"})
    resp = client.post("/api/products", json={"name": "B", "sku": "DUP"})
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"]


def test_category_and_filter(client):
    cat_id = client.post("/api/categories", json={"name": "Tools"}).json()["id"]
    client.post("/api/products", json={"name": "Hammer", "sku": "H1", "category_id": cat_id})
    client.post("/api/products", json={"name": "Shirt", "sku": "S1"})

    # Filter by category
    resp = client.get(f"/api/products?category_id={cat_id}")
    assert [p["name"] for p in resp.json()] == ["Hammer"]

    # Search by name
    resp = client.get("/api/products?search=shir")
    assert [p["name"] for p in resp.json()] == ["Shirt"]


def test_stock_adjustment_endpoint(client):
    pid = client.post("/api/products", json={"name": "W", "sku": "W2", "stock_quantity": 10}).json()["id"]

    resp = client.patch(f"/api/products/{pid}/stock", json={"delta": -4})
    assert resp.json()["stock_quantity"] == 6

    resp = client.patch(f"/api/products/{pid}/stock", json={"set": 100})
    assert resp.json()["stock_quantity"] == 100

    # Negative stock rejected
    resp = client.patch(f"/api/products/{pid}/stock", json={"delta": -500})
    assert resp.status_code == 400


def test_stock_on_missing_product_returns_404(client):
    resp = client.patch("/api/products/999/stock", json={"delta": 1})
    assert resp.status_code == 404
