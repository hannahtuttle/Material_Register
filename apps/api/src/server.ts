import { randomUUID } from 'crypto';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createDb } from './db/client';
import { appRouter } from './routers';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const PORT = process.env.PORT ?? '3001';
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

const { db, pool } = createDb(DATABASE_URL);

const app = express();

// Attach a short random ID to every request so errors can be correlated
// across the client response and the server log.
app.use((_req, res, next) => {
  const requestId = randomUUID().slice(0, 8);
  res.locals.requestId = requestId;
  res.set('X-Request-Id', requestId);
  next();
});

// Allow only the configured origin; send no CORS headers for other origins.
// Using the callback form so non-matching origins receive no header at all.
// exposedHeaders lets the browser read X-Request-Id on matched responses.
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      callback(null, requestOrigin === WEB_ORIGIN);
    },
    exposedHeaders: ['X-Request-Id'],
  }),
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ res }) => ({
      db,
      requestId: res.locals.requestId as string,
    }),
    onError: ({ error, path, ctx }) => {
      console.error(`[${ctx?.requestId ?? 'unknown'}] ${path ?? 'unknown'} ${error.code}:`, error);
    },
  }),
);

const server = app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => pool.end());
});
