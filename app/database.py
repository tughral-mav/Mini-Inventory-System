"""Database engine and session management.

This module is the single place where the database connection is configured.
Everything else (models, CRUD, routers) goes through the `Base`, `SessionLocal`,
and `get_db` objects defined here, so swapping the backing store (e.g. SQLite ->
PostgreSQL) is a change to *this file only*.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# The connection string. We read it from an env var so tests and future
# deployments can point at a different database without editing code.
# Default: a SQLite file named `inventory.db` in the working directory.
DATABASE_URL = os.environ.get("INVENTORY_DATABASE_URL", "sqlite:///./inventory.db")

# The Engine is SQLAlchemy's connection pool / dialect manager — created once
# and shared for the life of the process.
#
# `check_same_thread=False` is a SQLite-specific quirk: by default SQLite forbids
# using a connection from a thread other than the one that created it. FastAPI may
# serve requests on different threads, so we relax that check. It is only valid for
# SQLite, hence the conditional — other databases get no special connect args.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

# A factory that produces Session objects (one unit-of-work per request).
#   autocommit=False -> we control transaction boundaries explicitly via commit().
#   autoflush=False  -> queries don't silently flush pending changes; we flush when we mean to.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# The declarative base class. Every ORM model subclasses this so SQLAlchemy can
# collect their table definitions on `Base.metadata` (used to create the schema).
Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a request-scoped database session.

    Using a generator with try/finally guarantees the session is closed (and its
    connection returned to the pool) even if the request handler raises. FastAPI
    injects the yielded session into any route that declares `db: Session = Depends(get_db)`.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
