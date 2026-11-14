# Prompt 05 — API server, test setup and a first `materials.list`

## Goal

Stand up the API with **one procedure**, `materials.list`. In this first version it returns a page of materials, with the plant and manufacturer joined in, plus the total count. Search, filters and sorting come in prompt 06. Add the server basics (request ID, CORS, safe errors, `/health`), Jest against `materials_test`, and one test file for the procedure.

## Context

- The API is CommonJS, runs with `tsx`, and loads the root `.env` via `--env-file` (see the `db:seed` script).
- `apps/api/src/db/client.ts` exports `createDb(connectionString)` → `{ db, pool }` and the `Db` type.
- `packages/shared` is source-only TypeScript (no build) and exports `MATERIAL_TYPES` and `MATERIAL_STATUSES`.
- Jest + ts-jest already work (the smoke test from prompt 01).
- **Decisions:** the API has exactly one procedure, `materials.list`. There are no lookup procedures for plants or manufacturers. The filters will be Type and Status, with options from the shared constants. The web app calls the API directly across origins (CORS); there is no proxy.
- **Do only what this prompt asks.** Check the current docs for **tRPC v11** (server, Express adapter, `errorFormatter`, `createCallerFactory`), **Zod** (latest major) and the Drizzle node-postgres migrator. Don't rely on memory.

## Scope

### 1. Dependencies

- `apps/api`: `express`, `@types/express`, `@trpc/server`, `cors`, `@types/cors`. No logger library (`console` is enough).
- `packages/shared`: `zod`.

### 2. Shared input schema (`packages/shared/src/materials.ts`, re-exported from `index.ts`)

- `PAGE_SIZES = [10, 25, 50, 100] as const`
- `materialsListInput`, a Zod object with:
  - `page`: integer ≥ 1, default `1`
  - `pageSize`: one of `PAGE_SIZES`, default `25`
- Use `z.coerce.number()` for both. The front end will parse URL query strings (which are always strings) with this **same** schema in a later prompt. Don't add any URL logic now.
- Export the inferred type `MaterialsListInput`.
- Prompt 06 adds search, filters and sort to this schema.

### 3. `apps/api/src/trpc.ts`

- `Context` type: `{ db: Db; requestId: string }`. **Routers get the DB from `ctx.db`, never by importing a global**, which lets the tests pass in the test DB.
- `initTRPC.context<Context>().create({ errorFormatter })`:
  - Always add `requestId` to `shape.data`.
  - For `INTERNAL_SERVER_ERROR`: replace the message with `'Something went wrong'`.
  - Always remove `stack` from `shape.data`.
  - Leave other codes (e.g. `BAD_REQUEST`) as they are.
- Export `router`, `publicProcedure` and `createCallerFactory`.

### 4. `apps/api/src/routers/materials.ts`

`list` query, with `materialsListInput` as its input:

- **One query with `innerJoin`** on `plants` and `manufacturers` (no N+1). Select only these **flat** fields: `id, materialNumber, description, materialType, status, manufacturerPartNumber, unitOfMeasure, unitPrice, quantityOnHand, updatedAt, plantCode, plantName, manufacturerName`.
- `orderBy(materialNumber asc, id asc)`. The `id` tie-breaker goes in **now**, so prompt 06's sorting keeps it.
- `limit(pageSize)`, `offset((page - 1) * pageSize)`.
- A `count()` query on `materials` (no joins needed), run **in parallel** with the page query via `Promise.all`.
- Returns `{ items, total, page, pageSize }`.
- A one-line comment pointing to its section in `docs/API.md`.

`apps/api/src/routers/index.ts`: `appRouter = router({ materials })` and `export type AppRouter = typeof appRouter`. The web app will import only this **type**.

### 5. `apps/api/src/server.ts` (replaces the placeholder)

- Read `DATABASE_URL` (throw if missing) and call `createDb`. `PORT` defaults to `3001`.
- Middleware, in this order:
  1. **Request ID:** `crypto.randomUUID().slice(0, 8)` on `res.locals.requestId`, returned as an `X-Request-Id` header.
  2. **CORS:** allow only `WEB_ORIGIN` (default `http://localhost:5173`), with `exposedHeaders: ['X-Request-Id']`. No wildcard.
- `GET /health` → `{ status: 'ok' }`.
- `app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext, onError }))`:
  - `createContext({ res })` → `{ db, requestId: res.locals.requestId }`.
  - `onError({ error, path, ctx })` → `console.error` with the request ID, path, code and the **full** error (including the cause).
- Log the port on startup.
- `apps/api` `dev` script: `tsx watch --env-file=../../.env src/server.ts`.
- Add `WEB_ORIGIN=http://localhost:5173` to `.env.example`.

### 6. Test setup (`apps/api/tests/`)

- **`.env` loading:** Jest workers don't reliably see env vars set in `globalSetup`, so load the root `.env` (`process.loadEnvFile`, only if the file exists) in **both** `globalSetup` and a `setupFiles` entry. Throw a clear error if `TEST_DATABASE_URL` is unset.
- **`globalSetup`:** apply migrations to `TEST_DATABASE_URL` with Drizzle's node-postgres `migrate()` (`src/db/migrations`), then close the pool.
- **`tests/helpers.ts`:** `createTestDb()`, `truncateAll(db)` (`TRUNCATE materials, manufacturers, plants RESTART IDENTITY CASCADE`), and `createTestCaller(db)` (context `{ db, requestId: 'test' }`).
- **`tests/fixtures.ts`:** `insertFixtures(db)` inserts 2 plants, 2 manufacturers and **12 materials** with fixed, readable values. Insert the materials **out of** `materialNumber` order, so the tests prove the `ORDER BY`.
- `jest.config.js`: add `globalSetup` and `setupFiles`; `maxWorkers: 1` (tests share one DB and truncate it).

### 7. `tests/materials.test.ts`: one suite

`beforeAll` creates the DB, `beforeEach` runs truncate + fixtures, `afterAll` closes the pool. Cases:

1. **Happy path:** `{ page: 1, pageSize: 10 }` returns 10 items ordered by `materialNumber`, `total: 12`, and the first item `toEqual` the exact expected row (proving the joined plant and manufacturer fields and that only the listed fields are returned).
2. **Page 2:** returns the remaining 2 items.
3. **Validation:** `pageSize: 7` throws a `BAD_REQUEST` `TRPCError`.

Delete the prompt 01 smoke test (this suite now proves the shared package resolves in Jest).

### 8. `docs/API.md`

- Intro: the HTTP shape (`GET /trpc/materials.list?input=<url-encoded JSON>`), the error shape including `data.requestId`, and `GET /health`.
- A `materials.list` section using the template. Complexity: the count is O(n); the page uses the unique index on `material_number` for ordering, plus O(offset) for skipped rows; the joins are PK lookups.

### 9. `AGENTS.md`

- Commands: `npm test` needs the DB running (`docker compose up -d`).
- Rules: routers use `ctx.db` · tests use `createCaller` + small fixtures, never the seed data · tests run serially.

### 10. `docs/AI_LOG.md`

Append this prompt's entry.

## Files you may touch

`packages/shared/src/*`, `packages/shared/package.json`, `apps/api/src/trpc.ts`, `apps/api/src/server.ts`, `apps/api/src/routers/*`, `apps/api/tests/*`, `apps/api/jest.config.js`, `apps/api/package.json`, `.env.example`, `docs/API.md`, `AGENTS.md`, `docs/AI_LOG.md`, `package-lock.json`.

## Out of scope

Search, filters, sorting (prompt 06), any other procedure, the web app, README.

## Verify (run these and show me the output)

1. `npm test`: all tests pass.
2. With `npm run dev -w apps/api` running:
   - `curl -i localhost:3001/health` → 200 with an `X-Request-Id` header.
   - `curl -s 'localhost:3001/trpc/materials.list'` → 25 items, `total: 5000`, starting at `MAT-000001`.
   - `curl -s 'localhost:3001/trpc/materials.list?input=%7B%22page%22%3A2%2C%22pageSize%22%3A10%7D'` → `MAT-000011` to `MAT-000020`.
   - `curl -s 'localhost:3001/trpc/materials.list?input=%7B%22pageSize%22%3A7%7D'` → `BAD_REQUEST` with a `requestId`.
   - `curl -i -H 'Origin: http://localhost:5173' localhost:3001/health` → `Access-Control-Allow-Origin: http://localhost:5173` and `Access-Control-Expose-Headers: X-Request-Id`; with `-H 'Origin: http://evil.example'` → no `Access-Control-Allow-Origin` header.
3. **Error path:** `docker compose stop db`, then call `materials.list`. The client gets `'Something went wrong'` with a `requestId` and no stack or SQL; the server log shows the full error with the **same** request ID. Then `docker compose start db`.
4. `npm run typecheck` and `npm run lint` pass.

## Walkthrough expectations (I'm new to tRPC and Drizzle queries)

Keep it focused. In the end-of-task summary, explain:

- tRPC: `initTRPC`, context, `publicProcedure.input().query()`, `router()`, and how the `AppRouter` **type** gives the front end typed calls without code generation.
- How `/trpc/materials.list?input=...` reaches the procedure, and where Zod validation happens.
- `errorFormatter` (what the client sees) vs `onError` (our server log), and the request ID's path: middleware → `res.locals` → context → log + error response.
- CORS: why the origin is allow-listed, why `exposedHeaders` is needed, and why `curl` ignores CORS.
- The Drizzle query line by line: `select({...})`, `innerJoin`, `orderBy`, `limit/offset`, `count()`, and `Promise.all`.
- `createCaller`, and why the Jest setup uses `globalSetup` + `setupFiles` and runs serially.

## Definition of done

- All verify steps pass.
- API.md, AGENTS.md and AI_LOG.md updated.
- Do not commit. End with the walkthrough and anything I should review closely.
