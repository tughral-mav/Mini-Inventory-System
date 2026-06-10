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

## Deploying to Vercel

This repo is Vercel-ready:
- [`api/index.py`](api/index.py) exposes the ASGI `app` (Vercel doesn't run uvicorn — it wraps the app itself).
- [`vercel.json`](vercel.json) rewrites every path to that function and bundles the `static/` UI.
- On Vercel the project filesystem is **read-only except `/tmp`**, so the app automatically
  writes its SQLite file to `/tmp` when it detects the `VERCEL` env var (see `app/database.py`).

Deploy with the CLI:
```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

> ⚠️ **Data persistence on Vercel.** `/tmp` is **ephemeral and per-instance** — the database
> resets on every cold start and isn't shared between concurrent instances. The seeded demo
> catalog always appears, but products you add through the UI won't survive long-term.
> **To persist data, use a hosted database** (e.g. Vercel Postgres, Neon, Supabase) and set:
> ```
> INVENTORY_DATABASE_URL=postgresql://USER:PASS@HOST:5432/DBNAME
> ```
> in the Vercel project's Environment Variables (add `psycopg2-binary` to `requirements.txt`).
> No code changes are needed — the app reads that variable directly.
>
> For a stateful app with a persistent disk and a normal long-running process, **Render**,
> **Railway**, or **Fly.io** are a more natural fit than serverless and let SQLite persist as-is.

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
