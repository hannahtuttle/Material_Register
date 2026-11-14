import { existsSync } from 'fs';
import path from 'path';

// Runs in each test worker process — load .env so TEST_DATABASE_URL is
// available when test files import helpers.ts at module evaluation time.
const envPath = path.join(__dirname, '../../../.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set — copy .env.example to .env at the repo root');
}
