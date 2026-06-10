// Applies the SQL migration via Prisma Client's query engine (which works on
// this machine) instead of the blocked schema-engine binary, then records it
// in _prisma_migrations so `prisma migrate deploy` treats it as already applied.
import { readFileSync, readdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

// Load .env
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (m) process.env[m[1]] = m[2];
}

const migrationsDir = "prisma/migrations";
const folder = readdirSync(migrationsDir).find((f) => /^\d+_/.test(f));
const sqlPath = join(migrationsDir, folder, "migration.sql");
const sql = readFileSync(sqlPath, "utf8");
const checksum = createHash("sha256").update(readFileSync(sqlPath)).digest("hex");

// Split into individual statements (no embedded semicolons in this migration).
const statements = sql
  .split(";")
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter(Boolean);

const prisma = new PrismaClient();

// Neon free-tier compute auto-suspends; the first cold connection often times
// out (P1001) while it wakes. Retry a lightweight ping until the DB responds.
async function warmup(attempts = 15) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await prisma.$queryRaw`select 1`;
      console.log(`Database awake (attempt ${i}).`);
      return;
    } catch {
      console.log(`Cold start... waking database (attempt ${i}/${attempts})`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("Database did not wake up after several attempts.");
}

try {
  await warmup();
  console.log(`Applying ${folder} (${statements.length} statements)...`);
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }

  // Bookkeeping table Prisma uses to track applied migrations.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations"
       ("id","checksum","finished_at","migration_name","started_at","applied_steps_count")
     VALUES ($1,$2,now(),$3,now(),1)
     ON CONFLICT ("id") DO NOTHING;`,
    randomUUID(),
    checksum,
    folder,
  );

  console.log("Migration applied and recorded successfully.");
} catch (e) {
  console.error("Failed to apply migration:", e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
