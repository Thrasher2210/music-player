/**
 * Migration runner that works in both modes:
 *   - DATABASE_URL set  → Postgres via drizzle-kit migrate (uses drizzle/*.sql)
 *   - no DATABASE_URL   → embedded PGlite: applies drizzle/*.sql directly
 *
 * Run with: pnpm db:migrate   (from repo root)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const drizzleDir = join(here, "..", "drizzle");

// Try loading .env or .env.local from repo root if DATABASE_URL not in environment
if (!process.env.DATABASE_URL) {
  const root = join(here, "..", "..", "..");
  const envLocal = join(root, ".env.local");
  const env = join(root, ".env");
  if (existsSync(envLocal)) {
    try { process.loadEnvFile(envLocal); } catch {}
  } else if (existsSync(env)) {
    try { process.loadEnvFile(env); } catch {}
  }
}

async function migratePglite() {
  const { getDb, getPglitePath } = await import("../src/index.js");
  const db = getDb();
  const pglite = (db as unknown as { $client: import("@electric-sql/pglite").PGlite })
    .$client;

  if (!existsSync(drizzleDir)) {
    console.error("[migrate] no drizzle/ folder — run `pnpm --filter @mp/db generate` first");
    process.exit(1);
  }

  // Journal + sql files, applied in order (drizzle journal is the source of truth)
  const journalPath = join(drizzleDir, "meta/_journal.json");
  let entries: Array<{ tag: string }> = [];
  if (existsSync(journalPath)) {
    entries = JSON.parse(readFileSync(journalPath, "utf8")).entries;
  } else {
    entries = readdirSync(drizzleDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => ({ tag: f.replace(/\.sql$/, "") }));
  }

  // Track applied migrations in the same shape drizzle-kit expects
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    );
  `).catch(async () => {
    await pglite.exec(`CREATE SCHEMA IF NOT EXISTS drizzle;`);
    await pglite.exec(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      );
    `);
  });

  const applied = new Set(
    (
      await pglite.query<{ hash: string }>(
        "SELECT hash FROM drizzle.__drizzle_migrations",
      )
    ).rows.map((r) => r.hash),
  );

  for (const entry of entries) {
    const hash = entry.tag;
    if (applied.has(hash)) continue;
    const sqlPath = join(drizzleDir, `${hash}.sql`);
    if (!existsSync(sqlPath)) continue;
    const sql = readFileSync(sqlPath, "utf8");
    console.log(`[migrate] applying ${hash}…`);
    await pglite.exec(sql);
    await pglite.query("INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)", [
      hash,
      Date.now(),
    ]);
  }
  console.log(`[migrate] done (PGlite at ${getPglitePath()})`);
}

async function migratePostgres() {
  // Delegate to drizzle-kit, which handles transactions, journal and locks
  const { execSync } = await import("node:child_process");
  const dbRoot = join(here, "..");
  execSync("npx drizzle-kit migrate --config=drizzle.config.ts", {
    stdio: "inherit",
    cwd: dbRoot,
    env: process.env,
  });
}

const isPglite = !process.env.DATABASE_URL;
if (isPglite) {
  await migratePglite();
} else {
  await migratePostgres();
}
