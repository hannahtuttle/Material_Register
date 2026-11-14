// globalSetup runs in the main Jest process outside the ts-jest transform
// pipeline, so this file is plain CJS JavaScript.
const path = require('path');
const { existsSync } = require('fs');
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');

module.exports = async function globalSetup() {
  const envPath = path.join(__dirname, '../../../.env');
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }

  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set — copy .env.example to .env');

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  await migrate(db, {
    migrationsFolder: path.join(__dirname, '../src/db/migrations'),
  });

  await pool.end();
};
