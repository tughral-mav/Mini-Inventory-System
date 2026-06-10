# Prompt History

This file records the prompts used to drive development of the Mini Inventory System,
in chronological order, along with a short note on what each produced.

---

## 1. Initial build prompt

> Build a production-ready Mini Inventory System MVP that is fully deployable on Vercel
> with persistent database storage.
>
> **Tech Stack (mandatory):** Next.js (App Router) + TypeScript; Prisma ORM; PostgreSQL
> (Neon/Supabase-ready, env-var connection string, no hardcoded credentials); hosted on Vercel.
>
> **Core features:**
> - Products module: create/update/delete/list with name, description, price, stock quantity,
>   category relation.
> - Categories module: create/update/delete/list; each category has many products.
> - Stock management: increase/decrease quantity, prevent negative stock, low-stock indicator (< 5).
> - Search & filtering: case-insensitive name search, filter by category, filter by stock status
>   (low / in stock / out of stock).
>
> **Database:** Prisma relational schema (Product, Category, optional StockMovement audit trail),
> foreign keys, indexed search fields (name, categoryId), data integrity (no negative stock),
> migration files included.
>
> **Architecture:** Next.js API routes or server actions; separate UI / business logic / database
> layers; modular, maintainable code.
>
> **UI:** minimal clean dashboard — products table, category sidebar/dropdown filter, add/edit
> modal or page; usability over styling.
>
> **Testing:** product creation logic, stock update logic (incl. negative prevention),
> category–product relation; lightweight framework.
>
> **Deployment readiness:** `npm run dev`, `npm run build`, documented env vars in `.env.example`
> (`DATABASE_URL`, Prisma serverless-compatible, no local-only DB deps).
>
> **Deliverables:** working app, Prisma schema + migrations + seed, 3–6 tests, `prompt-history.md`,
> `lessons-learned.md`. Provide full structure, setup, and Vercel deployment steps; everything must
> work end-to-end.

**Outcome:** Full project scaffolded from scratch (the directory previously held an unrelated
Python prototype, which was replaced). Produced:
- Prisma schema with `Product`, `Category`, `StockMovement`, indexes, and a hand-written migration
  adding a `CHECK (stock >= 0)` constraint.
- Three-layer architecture: `src/lib/services/*` (business logic), `src/lib/prisma.ts` (DB),
  `src/app` + `src/components` (UI).
- Server actions (`src/app/actions`) and a REST API (`src/app/api`) both calling the same services.
- Tailwind dashboard: stat cards, category sidebar, filter bar, products table with inline
  stock +/- controls, add/edit modal.
- Vitest unit tests for stock rules, product creation, and category–product relations.
- `.env.example`, `vercel.json`, and this documentation.

---

## Follow-up / iteration prompts

Use this section to log any further prompts as the project evolves, e.g.:

- "Add pagination to the products table."
- "Add authentication with NextAuth before deploying."
- "Add a stock-movement history drawer per product."

_(none yet — MVP delivered in the initial pass)_
