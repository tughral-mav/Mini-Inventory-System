# Mini Inventory System

A production-ready inventory management MVP built with **Next.js (App Router) + TypeScript + Prisma + PostgreSQL**, designed to deploy to **Vercel** with persistent database storage and no redesign.

- Full CRUD for **Products** and **Categories**
- **Stock management** with increase/decrease, negative-stock prevention, and a low-stock indicator (≤ 5 units)
- **Search & filtering** (case-insensitive name search, category filter, stock-status filter)
- **Audit trail** of every stock movement (`StockMovement`)
- Clean three-layer architecture: **UI → business logic (services) → database (Prisma)**
- REST API **and** server actions
- Unit tests for product creation, stock rules, and category–product relations

---

## 🧱 Tech Stack

| Layer        | Choice                                   |
| ------------ | ---------------------------------------- |
| Framework    | Next.js 15 (App Router), React 19, TS    |
| Data access  | Prisma ORM 6                             |
| Database     | PostgreSQL (Neon / Supabase / Vercel PG) |
| Validation   | Zod                                      |
| Styling      | Tailwind CSS v4                          |
| Tests        | Vitest                                   |
| Hosting      | Vercel                                   |

---

## 📁 Project Structure

```
.
├── Lessons Learned and Prompt History/   # 📄 Project deliverables (separate from code)
│   ├── prompt-history.md          # All prompts used during development
│   └── lessons-learned.md         # Architecture decisions, trade-offs, full error log
├── tests/                         # 🧪 Test cases (Vitest unit tests, separate from src)
│   ├── product.service.test.ts
│   ├── stock.service.test.ts
│   ├── stock-logic.test.ts
│   └── category.service.test.ts
├── prisma/
│   ├── schema.prisma              # Product, Category, StockMovement models + indexes
│   ├── migrations/                # SQL migration incl. non-negative-stock CHECK constraint
│   └── seed.ts                    # Idempotent seed data
├── scripts/
│   └── apply-migration.mjs        # Cold-start-safe migration applier (npm run db:setup)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Dashboard (server component)
│   │   ├── globals.css
│   │   ├── actions/               # Server actions (thin adapters over services)
│   │   │   ├── product.actions.ts
│   │   │   └── category.actions.ts
│   │   └── api/                   # REST API routes
│   │       ├── products/...
│   │       └── categories/...
│   ├── components/                # UI layer (client components)
│   │   ├── ProductTable.tsx
│   │   ├── ProductFormModal.tsx
│   │   ├── CategorySidebar.tsx
│   │   ├── FilterBar.tsx
│   │   ├── Modal.tsx
│   │   └── StatusBadge.tsx
│   └── lib/
│       ├── prisma.ts              # Database layer: shared Prisma client (Neon adapter)
│       ├── services/              # Business logic layer
│       │   ├── product.service.ts
│       │   ├── category.service.ts
│       │   ├── stock.service.ts
│       │   └── stock-logic.ts     # Pure, unit-tested stock rules
│       ├── validators.ts          # Zod schemas
│       ├── dto.ts                 # Serializable DTOs (Decimal → number)
│       ├── errors.ts              # Domain error types
│       ├── action-result.ts       # Uniform result + error mapping
│       └── format.ts
├── .env.example
├── vercel.json
└── package.json
```

> **Deliverables** — the test cases (`tests/`) and the prompt history + lessons learned
> (`Lessons Learned and Prompt History/`) live in dedicated folders, separate from the
> application code.

### Architecture

Each request flows through three clearly separated layers:

1. **UI layer** — server component (`page.tsx`) for data fetching + client components for interactivity. UI never touches Prisma directly.
2. **Business logic layer** — `src/lib/services/*`. Validates input (Zod), enforces business rules (non-negative stock, category-not-empty-before-delete), and is the only code that talks to the database. Both the server actions and the REST API call into the same services, so there is **one source of truth** for business rules.
3. **Database layer** — `src/lib/prisma.ts` (a single pooled client) + the Prisma schema.

Stock is mutated **only** through `stockService`, so every change is wrapped in a transaction and recorded in `StockMovement` for auditability.

---

## 🚀 Getting Started (Local)

### 1. Prerequisites
- Node.js 18.18+ (tested on Node 24)
- A PostgreSQL database. The easiest free option is [Neon](https://neon.tech) or [Supabase](https://supabase.com).

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set `DATABASE_URL` (and optionally `DIRECT_URL`) to your Postgres connection string. **Never commit `.env`.**

### 4. Run migrations + seed
```bash
npm run prisma:migrate     # applies prisma/migrations to your database
npm run db:seed            # optional: loads sample categories & products
```

> **Neon free-tier cold starts:** Neon auto-suspends idle compute, so the first
> connection can time out with `P1001: Can't reach database server` while it
> wakes — and `prisma migrate` makes a one-shot connection with no retry. If you
> hit this, either re-run the command (the DB is warm after the first attempt)
> or use the cold-start-safe applier, which pings until the DB wakes before
> applying the same migration SQL:
> ```bash
> npm run db:setup
> ```

### 5. Start the dev server
```bash
npm run dev
```
Open http://localhost:3000.

---

## 🧪 Testing

```bash
npm test
```

Tests run against the **business logic layer** with a mocked Prisma client (no live database needed), covering:

- **Product creation** — valid create, missing-category rejection, invalid-input rejection
- **Stock rules** — increase/decrease, **negative-stock prevention**, audit-record writes
- **Category–product relation** — product counts, blocking deletion of non-empty categories

---

## 🏗️ Production Build

```bash
npm run build      # runs `prisma generate` then `next build`
npm start
```

---

## ☁️ Deploy to Vercel

1. **Provision a Postgres database** (Neon / Supabase / Vercel Postgres). Copy its connection string.
   - Use the **pooled** connection string for `DATABASE_URL` (serverless functions open many short-lived connections). On Neon that's the `-pooler` host; on Supabase it's the port `6543` PgBouncer URL.
   - Use a **direct** connection string for `DIRECT_URL` (migrations can't run over PgBouncer).

2. **Import the repo into Vercel** (Framework preset: Next.js — auto-detected).

3. **Add environment variables** in Vercel → Project → Settings → Environment Variables:
   - `DATABASE_URL`
   - `DIRECT_URL` (recommended)

4. **Build command.** `vercel.json` sets it to:
   ```
   prisma generate && next build
   ```
   This generates the Prisma client, then builds Next.js (`postinstall` also runs `prisma generate`
   as a safety net). Migrations are intentionally **not** run during the build — apply them once,
   out of band, before/after deploy (`npm run prisma:migrate` locally, or `npm run db:setup` for a
   cold Neon DB). This avoids build-time database failures and is the recommended pattern for
   serverless.

5. **Deploy.** That's it — no local-only dependencies, no SQLite, no in-memory storage.

> **Note on Prisma + serverless:** `next.config.ts` marks Prisma and the Neon
> packages as external so they're bundled correctly for Vercel's Node.js runtime,
> and all API routes declare `runtime = "nodejs"`.
>
> **Important — Neon serverless driver adapter:** the database layer
> ([src/lib/prisma.ts](src/lib/prisma.ts)) uses `@prisma/adapter-neon`, which
> connects to Neon over **HTTPS/WebSocket (port 443)** instead of a raw TCP
> connection on port 5432. A plain TCP connection from Vercel's serverless
> functions is unreliable (IPv6-egress + cold-start timeouts) and fails with
> `P1001: Can't reach database server`. The adapter is the supported fix and the
> reason this app runs on Vercel without redesign. `DATABASE_URL` must be the
> **pooled** Neon URL.

---

## 🔌 REST API

| Method | Endpoint                       | Description                                  |
| ------ | ------------------------------ | -------------------------------------------- |
| GET    | `/api/products`                | List products (`?search=&categoryId=&status=`) |
| POST   | `/api/products`                | Create product                               |
| GET    | `/api/products/:id`            | Get a product                                |
| PUT    | `/api/products/:id`            | Update product (name/desc/price/category)    |
| DELETE | `/api/products/:id`            | Delete product                               |
| POST   | `/api/products/:id/stock`      | Adjust stock `{ delta, note? }`              |
| GET    | `/api/categories`              | List categories with product counts          |
| POST   | `/api/categories`              | Create category                              |
| GET    | `/api/categories/:id`          | Get a category                               |
| PUT    | `/api/categories/:id`          | Update category                              |
| DELETE | `/api/categories/:id`          | Delete category (rejected if non-empty)      |

`status` accepts `all | in_stock | low | out_of_stock`.

---

## 🗄️ Data Model

- **Category** `1 ──< many` **Product**
- **Product** `1 ──< many` **StockMovement** (append-only audit log)
- Indexes on `Product.name`, `Product.categoryId`, `Category.name` for fast search/filter
- `Product.categoryId` uses `ON DELETE RESTRICT` (can't orphan products)
- Database-level `CHECK (stock >= 0)` guarantees stock integrity even outside the app

See `prisma/schema.prisma` and `prisma/migrations/`.
