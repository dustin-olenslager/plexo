#!/bin/sh
# Run Drizzle migrations then exit.
# Called by the 'migrate' service in compose.yml before the API starts.
set -e

echo "[migrate] Running Drizzle migrations..."
node -e "
import('@plexo/db').then(async ({ db: _db }) => {
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: process.env.MIGRATIONS_DIR ?? './drizzle' });
  await pool.end();
  console.log('[migrate] Done.');
}).catch(e => { console.error('[migrate] Failed:', e.message); process.exit(1); });
"
