# Lessons Learned

Notes on the architecture, the trade-offs taken to keep this an MVP, problems encountered,
and what would change before this carries real production load.

---

## Architecture decisions

### 1. Strict three-layer separation (UI → service → database)
All business rules live in `src/lib/services/*`. Both the **server actions** (`src/app/actions`)
and the **REST API** (`src/app/api`) are thin adapters that call the same services. This means
there is exactly one place where "you can't have negative stock" or "you can't delete a category
that still has products" is enforced — no duplicated rules drifting apart between the UI path and
the API path.

### 2. Server actions as the primary write path, REST API as a secondary surface
The dashboard uses **server actions** + `revalidatePath`, which is the idiomatic App Router
approach and avoids hand-writing fetch calls and client-side cache invalidation. A parallel REST
API is included for integrations and for anyone who wants to script against the system. Both are
intentionally tiny because the logic lives in the service layer.

### 3. Stock changes go through one funnel and are audited
Product `update` deliberately does **not** change stock. The only way to change stock is
`stockService.adjust`, which runs inside a `prisma.$transaction`, recomputes the new value with a
pure function (`computeNewStock`), and writes a `StockMovement` row. This gives a complete,
append-only audit trail and makes the negative-stock rule impossible to bypass through normal
product edits.

### 4. Defense in depth for the "no negative stock" rule
The rule is enforced in **three** places:
1. Zod validation rejects obviously bad input at the edge.
2. `computeNewStock` throws `InsufficientStockError` in the business layer.
3. A database `CHECK (stock >= 0)` constraint (added in the migration) is the final backstop —
   even a buggy future query or a direct SQL write cannot create negative stock.

### 5. Pure functions for the testable core
`stock-logic.ts` (`computeNewStock`, `getStockStatus`) has no Prisma/IO dependency, so the most
important rules are unit-tested directly without mocking a database. The service tests mock the
Prisma client, keeping the whole suite fast and runnable in CI with **no live database**.

### 6. DTO serialization boundary
Prisma's `Decimal` (for `price`) and `Date` values are not safely serializable across the React
Server Component boundary or as clean JSON. `dto.ts` converts entities to plain DTOs
(`Decimal → number`, `Date → ISO string`) at the boundary, so the UI and API always deal with
simple, predictable shapes.

---

## Trade-offs (because this is an MVP)

- **No authentication / multi-tenancy.** Anyone who can reach the app can edit inventory. This is
  the single biggest thing to add before real use (see below).
- **`price` as `Decimal(10,2)` exposed as a JS `number`.** Fine for display and an MVP, but money
  math in floating point is risky. A production system should keep money as integer minor units
  (cents) or use a decimal library end-to-end.
- **`force-dynamic` on the dashboard.** Always-fresh data, but no caching — every page load hits
  the database. Acceptable for an internal tool; a high-traffic app would add tagged caching and
  `revalidateTag`.
- **Optimistic-free UI.** Stock +/- and deletes use `useTransition` and wait for the server round
  trip rather than optimistic updates. Simpler and correct; slightly less snappy.
- **Single shared Prisma client, no explicit connection-pool tuning.** Works on serverless via the
  pooled connection string, but a busy deployment should use Prisma Accelerate or a dedicated
  pooler and tune limits.
- **No pagination.** `findMany` returns all matching products. Fine for hundreds of rows; needs
  cursor pagination beyond that.

---

## Issues faced & how they were handled

- **Prisma on Vercel serverless.** The Prisma query engine must be present in the serverless
  bundle and generated at build time. Handled by: `serverExternalPackages: ["@prisma/client"]` in
  `next.config.ts`, `prisma generate` in both `build` and `postinstall`, and `runtime = "nodejs"`
  on every API route (Prisma can't run on the Edge runtime).
- **Migrations vs. connection pooling.** PgBouncer-style pooled connections can't run migrations.
  Solved by documenting a separate `DIRECT_URL` for `prisma migrate` while the app uses the pooled
  `DATABASE_URL`.
- **Decimal across the RSC boundary.** Passing a Prisma `Decimal` straight to a client component
  throws a serialization error; the DTO layer converts it to a `number` first.
- **Connection exhaustion in dev.** Next.js hot-reload would spawn a new `PrismaClient` per reload;
  the `globalThis` singleton in `prisma.ts` prevents that.

- **Neon free-tier cold starts caused phantom `P1001` errors.** During first-time setup, every
  `prisma migrate dev` failed with `P1001: Can't reach database server ...:5432`. This *looked* like
  a networking/credential problem, and a lot of time can be lost chasing the wrong cause. Diagnosis
  ruled those out one by one: DNS resolved (both A/IPv4 and AAAA/IPv6 records), raw TCP to port 5432
  connected on both families, and the in-process Prisma **query** engine ran `select 1` successfully
  once it got through. The real cause was **Neon's auto-suspend**: idle compute is paused, and the
  first cold connection times out while it wakes. `prisma migrate` opens a single connection with no
  retry, so it consistently lost the wake-up race. Two adjacent red herrings were also eliminated:
  the `channel_binding=require` query param (Prisma's driver doesn't handle it — removed it) and a
  near-full system drive (unrelated, but it had earlier broken `npm install`/`next build` with OOM).

  **Resolution / takeaway:** treat `P1001` against a serverless Postgres as "wake the database
  first," not "the network is down." The project now has a warm-up retry loop (`select 1` until the
  compute responds) in both the seed script and a cold-start-safe migration applier
  (`scripts/apply-migration.mjs`, exposed as `npm run db:setup`), which applies the migration SQL
  through the working query engine and records it in `_prisma_migrations` so `prisma migrate deploy`
  stays consistent. Same lesson applies to deployment: the first request/build against a cold Neon
  branch may need a retry. For production traffic, enabling Neon's "always-on"/min-compute setting or
  using Prisma Accelerate removes the cold-start window entirely.

- **Deployed to Vercel and every page failed with `P1001: Can't reach database server`.** The app
  worked perfectly locally but the serverless functions could not reach Neon on port 5432. Root
  cause: **a raw TCP connection to Postgres is unreliable from Vercel's serverless functions** —
  they hit IPv6-egress limitations and connection cold-start timeouts that a normal long-lived
  server doesn't. This is a well-known Prisma + Neon + serverless gotcha, and it is *not* fixed by
  changing the connection string or env vars (the function clearly had the right `DATABASE_URL` —
  the error printed the correct host).

  **Resolution:** switch the database layer to Prisma's **Neon serverless driver adapter**
  (`@prisma/adapter-neon` + `@neondatabase/serverless`). Instead of TCP/5432 it talks to Neon over
  **HTTPS fetch (queries) and WebSocket (transactions) on port 443**, which serverless platforms
  support cleanly. `src/lib/prisma.ts` now builds the client with `new PrismaNeon({ connectionString })`,
  sets `neonConfig.webSocketConstructor = ws` (Node has no global WebSocket) and
  `neonConfig.poolQueryViaFetch = true` (route plain queries over HTTPS for the fastest, most
  reliable cold starts). The adapter version **must match the Prisma Client major version**
  (`@prisma/adapter-neon@6.19` for `@prisma/client@6.19`) — npm initially pulled adapter v7 against
  client v6, which would have broken at runtime. **Takeaway:** for any Prisma app targeting
  Vercel/serverless with Neon, use the driver adapter from day one rather than the default TCP
  connection.

---

## Improvements for production scaling

1. **Authentication & authorization** — add NextAuth/Clerk and role-based access (viewer vs.
   editor), plus per-action checks in the service layer.
2. **Money as integer cents** or a decimal type all the way to the UI to eliminate float drift.
3. **Pagination + server-side sorting** on the products list (cursor-based).
4. **Optimistic UI** for stock adjustments with rollback on error.
5. **Caching strategy** — tag product/category reads and use `revalidateTag` instead of
   `force-dynamic`, or move hot reads behind a cache.
6. **Concurrency safety on stock** — the current transaction reads-then-writes; under very high
   contention an atomic conditional update (`UPDATE ... SET stock = stock + :d WHERE stock + :d >= 0`)
   would avoid even the small race window.
7. **Observability** — structured logging, error tracking (Sentry), and request tracing.
8. **Integration/E2E tests** against a disposable Postgres (Testcontainers or a CI service
   container) to complement the current unit tests, plus Playwright for the UI.
9. **Stock-movement UI** — expose the existing `StockMovement` audit trail as a per-product history
   view (the data is already captured).
10. **Bulk operations & CSV import/export** for real inventory workflows.
