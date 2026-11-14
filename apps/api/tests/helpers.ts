import { sql } from 'drizzle-orm';
import { createDb, type DbClient } from '../src/db/client';
import { createCallerFactory } from '../src/trpc';
import { appRouter } from '../src/routers';

export function createTestDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set');
  return createDb(url);
}

export async function truncateAll(db: DbClient) {
  await db.execute(sql`TRUNCATE materials, manufacturers, plants RESTART IDENTITY CASCADE`);
}

export function createTestCaller(db: DbClient) {
  return createCallerFactory(appRouter)({ db, requestId: 'test' });
}
