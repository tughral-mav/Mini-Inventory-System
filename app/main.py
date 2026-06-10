"""FastAPI application entry point for the Mini Inventory System.

This module wires the pieces together: it creates the schema, seeds initial data,
registers the routers, and serves the static web UI. Run it with:
    uvicorn app.main:app --reload
"""
import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import Base, SessionLocal, engine
from app.routers import categories, products
from app.seed import seed_if_empty

# Create any missing tables from the ORM model definitions. This is a simple
# MVP-grade "migration": fine for creating a fresh schema, but it does NOT alter
# existing tables when models change — a real project would use Alembic for that.
Base.metadata.create_all(bind=engine)

# Populate demo categories/products so the app isn't empty on first run.
# seed_if_empty is idempotent (it no-ops when products already exist), so this is
# safe to run on every startup. We open a short-lived session just for the seed.
with SessionLocal() as _db:
    seed_if_empty(_db)

app = FastAPI(
    title="Mini Inventory System",
    description="A lightweight inventory MVP: products, categories, stock, search.",
    version="1.0.0",
)

# Mount the feature routers. Each owns its own URL prefix (/api/products, /api/categories).
app.include_router(products.router)
app.include_router(categories.router)


@app.get("/health", tags=["meta"])
def health():
    """Liveness probe — handy for tests and uptime checks."""
    return {"status": "ok"}


# Serve the single-page web UI. We mount it LAST, at the root path, so it acts as a
# catch-all for non-API routes. html=True makes "/" return index.html automatically.
# The directory check keeps the app working even if the static folder is absent.
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
