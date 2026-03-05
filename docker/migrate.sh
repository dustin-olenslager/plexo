#!/bin/sh
# Run Drizzle migrations then exit.
# Called by the 'migrate' service in compose.yml before the API starts.
set -e

echo "[migrate] Running Drizzle migrations..."

node --input-type=module << 'EOF'
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('[migrate] DATABASE_URL not set'); process.exit(1); }

const migrationsFolder = process.env.MIGRATIONS_DIR ?? './drizzle';

const pool = new Pool({ connectionString });
const db = drizzle(pool);
await migrate(db, { migrationsFolder });
await pool.end();
console.log('[migrate] Done.');
EOF
