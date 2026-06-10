# Prompt History — Mini Inventory System

A brief log of the major steps and prompts used to build this MVP during the session.

## Session summary

1. **Initial request — "create a simple HTML page."**
   - A starter `index.html` was generated (later removed once the real app took shape).

2. **Main task — Build a Mini Inventory System MVP.**
   The user provided a detailed brief: manage products (name, description, SKU, price,
   stock, category), group by category, track/adjust stock, and search/filter — plus
   tests and documentation. A 5-step execution plan was requested.

3. **Step 1 — Propose architecture (approval gate).**
   - Analyzed the environment: empty workspace, Node.js v24 and Python 3.13 both available.
   - Proposed a stack and file layout, then asked the user to choose via two questions.
   - **User decisions:**
     - Tech stack → **Python / FastAPI + SQLite**
     - Interface → **REST API + minimal web UI**

4. **Step 2 — Database schema & core logic.**
   - Created SQLAlchemy models (`Category`, `Product`) in `app/models.py`.
   - Set up the SQLite engine/session in `app/database.py`.
   - Defined Pydantic schemas in `app/schemas.py`.
   - Implemented CRUD in `app/crud.py` with domain validation (duplicate SKU,
     unknown category, not-found).

5. **Step 3 — Search, filtering & stock adjustment.**
   - `list_products(search=, category_id=)` — case-insensitive match on name/SKU + category filter.
   - `adjust_stock()` — relative `delta` or absolute `set`, with a non-negative guard.
   - Exposed everything via FastAPI routers (`app/routers/products.py`, `categories.py`).
   - Built a single-page web UI in `static/index.html` (add/search/filter/adjust/delete).

6. **Step 4 — Tests.**
   - `tests/test_crud.py` — unit tests for business logic.
   - `tests/test_api.py` — integration tests over the HTTP layer using FastAPI `TestClient`.
   - Isolated in-memory SQLite per test via `tests/conftest.py`.
   - Result: **20 tests passing.**

7. **Step 5 — Documentation.**
   - Generated this file plus `lessons_learned.md` and a project `README.md`.

## How to reproduce

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m pytest -q          # run the test suite
.venv/Scripts/python.exe -m uvicorn app.main:app --reload   # run the app
```
