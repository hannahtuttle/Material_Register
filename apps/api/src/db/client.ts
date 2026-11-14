import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Factory so the seed can connect with DATABASE_URL and tests (prompt 05)
// can connect with TEST_DATABASE_URL without a module-level singleton.
export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export type Db = ReturnType<typeof createDb>;
// The drizzle query instance extracted from the factory return — used as the
// context type in tRPC and as the parameter type in test helpers.
export type DbClient = Db['db'];
