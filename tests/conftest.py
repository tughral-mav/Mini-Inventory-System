"""Shared pytest fixtures.

The key idea: every test runs against a brand-new, in-memory SQLite database, so
tests are fully isolated from each other and from the real `inventory.db`. No test
can see another test's data, and the suite leaves no files behind.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401  (imported so its tables register on Base.metadata)
from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def db_session():
    """Yield a Session bound to a fresh in-memory database, one per test."""
    # "sqlite://" (no path) is an in-memory DB. Normally each connection would get
    # its OWN empty memory DB; StaticPool forces every connection to reuse the SAME
    # underlying one, so the tables we create are visible to the request handlers too.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)   # build the schema in the empty DB
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)  # tear down so nothing leaks between tests


@pytest.fixture()
def client(db_session):
    """An API TestClient that shares the test's in-memory session.

    We override the app's `get_db` dependency so that routes use the same session as
    the test body. That means a test can set up data via `db_session` (or via the API)
    and both views agree. The override is cleared afterwards to avoid leaking into
    other tests.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # lifecycle is owned by the db_session fixture, not here

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
