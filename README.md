# Mini Inventory System

A lightweight inventory management MVP — **FastAPI + SQLite** with a minimal single-page web UI.

Manage products and categories, track stock levels, and search/filter the catalog.

## Features
- **Products** — full CRUD (name, description, SKU, price, stock quantity, category).
- **Categories** — group products; unique names.
- **Stock** — increment/decrement (`delta`) or overwrite (`set`), with a non-negative guard.
- **Search & filter** — case-insensitive match on name/SKU, plus filter by category.
- **Web UI** — add products/categories, live search, filter, adjust stock, delete.

## Quick start

```bash
# 1. Create a virtual environment
python -m venv .venv

# 2. Install dependencies
.venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt  # macOS/Linux

# 3. Run the app
.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

Then open:
- **Web UI** → http://127.0.0.1:8000/
- **Interactive API docs (Swagger)** → http://127.0.0.1:8000/docs

## Running tests

```bash
.venv/Scripts/python.exe -m pytest -q
```

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/products` | List products. Query: `?search=`, `?category_id=` |
| POST   | `/api/products` | Create a product |
| GET    | `/api/products/{id}` | Get one product |
| PUT    | `/api/products/{id}` | Partial update |
| DELETE | `/api/products/{id}` | Delete a product |
| PATCH  | `/api/products/{id}/stock` | Adjust stock: `{"delta": n}` or `{"set": n}` |
| GET    | `/api/categories` | List categories |
| POST   | `/api/categories` | Create a category |
| GET    | `/health` | Health check |

### Example

```bash
# Create a category and a product, then sell one unit
curl -X POST localhost:8000/api/categories -H "Content-Type: application/json" -d '{"name":"Tools"}'
curl -X POST localhost:8000/api/products  -H "Content-Type: application/json" \
  -d '{"name":"Hammer","sku":"HAM-1","price":12.99,"stock_quantity":50,"category_id":1}'
curl -X PATCH localhost:8000/api/products/1/stock -H "Content-Type: application/json" -d '{"delta":-1}'
```

## Project structure

```
app/
  database.py        SQLite engine & session
  models.py          SQLAlchemy models (Product, Category)
  schemas.py         Pydantic schemas
  crud.py            Core logic: CRUD, search/filter, stock
  routers/           HTTP endpoints
static/index.html    Minimal web UI
tests/               pytest unit + integration tests
docs/                prompt_history.md, lessons_learned.md
```

See [`docs/lessons_learned.md`](docs/lessons_learned.md) for architecture notes and scaling considerations.
