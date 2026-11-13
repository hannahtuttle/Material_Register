import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs from apps/api; ../../.env is the repo-root .env file.
try {
  process.loadEnvFile('../../.env');
} catch {
  throw new Error(
    'Could not load .env — copy .env.example to .env at the repo root and fill it in.',
  );
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set in .env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: { url },
});
