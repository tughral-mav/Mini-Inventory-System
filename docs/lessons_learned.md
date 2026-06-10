# Lessons Learned — Mini Inventory System MVP

A summary of technical takeaways, the architectural choices made for this MVP, and the
bottlenecks to watch when scaling beyond a prototype.

## Decision log — the "why" behind each core choice

Each row records what was decided, *why*, and the main alternative that was rejected.

| # | Decision | Why | Alternative rejected |
|---|----------|-----|----------------------|
| 1 | **Python + FastAPI** | Async-ready, minimal boilerplate, and gives typed request validation + auto-generated OpenAPI docs for free. User-selected stack. | Flask (no built-in validation/docs); Node/Express (user preferred Python). |
| 2 | **SQLite for storage** | Zero install, single-file DB, perfect for an MVP that must "just run". | Postgres/MySQL — operational overhead not justified at this scale. |
| 3 | **SQLAlchemy ORM over raw `sqlite3`** | Abstracts the dialect so moving to Postgres later is mostly a connection-string change; models double as living schema docs. | Raw SQL — faster to write tiny apps, but ties us to SQLite and hand-rolled mapping. |
| 4 | **Layered architecture** (models / schemas / crud / routers) | Each layer has one job; the logic layer stays HTTP-agnostic and therefore unit-testable without a server. | A single `main.py` with inline SQL — quick but untestable and hard to grow. |
| 5 | **Separate Pydantic schemas from ORM models** | API shape can validate input and evolve independently of the table layout (hide fields, partial updates). | Returning ORM objects directly — couples the wire format to the DB and skips validation. |
| 6 | **Domain errors as `ValueError`, mapped to HTTP in routers** | Keeps business rules free of framework types; one consistent place translates errors to 400/404. | Raising `HTTPException` inside the logic — drags HTTP concerns into testable core code. |
| 7 | **`Numeric(10,2)` for price (not `float`)** | Binary floats can't represent values like `0.10` exactly, causing money rounding bugs. | `Float` — simpler but unsafe for currency. |
| 8 | **Stock via dedicated `PATCH /stock` with `delta` or `set`** | Encodes *intent* ("sold 2" vs "recount = 40") and gives a single choke point for the non-negative guard. | Letting clients PUT an arbitrary `stock_quantity` — loses intent and scatters validation. |
| 9 | **Partial updates via `model_dump(exclude_unset=True)`** | Distinguishes "field omitted" from "field set to null", so a PUT with one field won't wipe the rest. | A fixed update schema — can't tell omitted from explicitly-null. |
| 10 | **DB-level unique constraints on SKU & category name** | The database is the last line of defence; guarantees hold even if an app check is bypassed or races. | App-only checks — vulnerable to race conditions and direct DB writes. |
| 11 | **Idempotent startup seeding (`seed_if_empty`)** | App is demo-ready on first run, yet restarts never duplicate data. | Always-insert seed (duplicates on restart) or a manual seed script (extra step). |
| 12 | **In-memory SQLite + dependency override for tests** | Total isolation, no leftover files, ~0.8s for 20 tests; the API and test share one session via `StaticPool`. | Testing against the real `inventory.db` — slow, order-dependent, pollutes dev data. |
| 13 | **`create_all()` for schema setup** | One line, no tooling — appropriate for an MVP with a fixed schema. | Alembic migrations — correct long-term, but premature overhead here (noted below). |
| 14 | **Plain-HTML/JS UI served by FastAPI static mount** | Zero build step, no framework; one file to demo the whole API. | React/Vue SPA — build tooling and complexity unwarranted for an MVP console. |

## Architectural choices

### Layered structure
The code is split into thin, single-responsibility layers:

| Layer | File(s) | Responsibility |
|-------|---------|----------------|
| Models | `app/models.py` | SQLAlchemy ORM tables |
| Schemas | `app/schemas.py` | Pydantic validation & serialization |
| Logic (CRUD) | `app/crud.py` | Business rules, no HTTP knowledge |
| Routes | `app/routers/` | HTTP wiring, error → status mapping |
| App | `app/main.py` | Wiring, table creation, static UI mount |

**Why it matters:** the business logic in `crud.py` is framework-agnostic — it raises plain
`ValueError`s and the router layer translates them into HTTP status codes. This keeps the
core testable without spinning up a web server (see `tests/test_crud.py`).

### SQLite + SQLAlchemy
- SQLite needs zero setup and lives in a single file — ideal for an MVP.
- Going through SQLAlchemy (rather than raw `sqlite3`) means swapping to PostgreSQL later is
  mostly a connection-string change, not a rewrite.
- `Numeric(10,2)` is used for price to avoid floating-point rounding on money.

### Stock as an explicit operation
Rather than letting clients PUT an arbitrary `stock_quantity`, stock changes go through a
dedicated `PATCH /stock` endpoint accepting either a relative `delta` or an absolute `set`.
This models intent ("sold 2 units" vs. "recount = 40") and centralizes the non-negative guard.

### Test isolation
Each test gets a fresh in-memory SQLite database via a `StaticPool` engine and a FastAPI
dependency override. Tests are fully isolated, order-independent, and fast (~1.5s for 20 tests).

## Key takeaways
- **Validate at the edge, enforce in the core.** Pydantic catches malformed input; `crud.py`
  enforces domain invariants (unique SKU, valid category, non-negative stock). Both matter.
- **Map domain errors to HTTP at one seam.** A single `ValueError`→`HTTPException` convention
  keeps routers tidy and consistent.
- **`exclude_unset=True` enables true partial updates** — only fields the client actually sent
  are written, so a PUT with just `{price}` won't blank out the name.

## Potential scaling bottlenecks (future work)

1. **SQLite write concurrency.** SQLite serializes writes with a database-level lock. Fine for
   one user/MVP; under concurrent writers, migrate to PostgreSQL (connection-string swap).
2. **`create_all` is not a migration system.** It creates missing tables but ignores schema
   *changes*. For evolving schemas, adopt **Alembic** migrations.
3. **Unbounded list endpoint.** `GET /api/products` returns every row. Add **pagination**
   (`limit`/`offset` or keyset) before catalogs grow large.
4. **`LIKE '%term%'` search doesn't scale.** It can't use a standard index for leading
   wildcards. For large datasets, move to full-text search (Postgres `tsvector`, or a search
   engine like Meilisearch/Elasticsearch).
5. **No auth / multi-tenancy.** The API is open. Production needs authentication, authorization,
   and likely per-tenant data scoping.
6. **No stock audit trail.** Current stock is a single mutable number. A real system usually
   wants an append-only ledger of stock movements for traceability and reconciliation.
7. **No optimistic locking.** Concurrent stock adjustments could race. A version column or
   atomic `UPDATE ... SET qty = qty + :delta WHERE qty + :delta >= 0` would harden this.
