# AI Change Log

Each entry records what was asked, what changed, and any decisions made. The developer adds corrections or notes below each entry.

**Entry format:**

```
## <date> — <prompt file>
**Asked:** one-line summary
**Files changed:** list
**Decisions:** any non-obvious choices
**Developer notes:** (left blank for the developer to fill in)
```

---

## 2026-11-13 — Prompt 01 (Initial setup)

**Asked:** Set up the monorepo skeleton: npm workspaces, three packages, strict TypeScript, ESLint, Prettier, root scripts, AGENTS.md, and doc stubs. Prove `packages/shared` can be imported from the API at runtime and in Jest.

**Files changed:**

- `package.json` — root workspace config, root scripts, devDependencies
- `tsconfig.base.json` — shared strict TypeScript base
- `eslint.config.js` — ESLint 10 flat config
- `.prettierrc`, `.prettierignore` — Prettier config
- `.gitignore`, `.env.example`
- `AGENTS.md` — agent context and rules
- `packages/shared/package.json`, `tsconfig.json`, `src/index.ts`, `src/enums.ts`
- `apps/api/package.json`, `tsconfig.json`, `jest.config.js`, `src/server.ts`, `tests/shared-import.test.ts`
- `apps/web/package.json`
- `docs/API.md`, `docs/AI_LOG.md`

**Decisions:**

- TypeScript pinned to `^6.0.3` (latest version satisfying both ts-jest `<7` and typescript-eslint `<6.1.0`; TypeScript 7.x exists but is outside both peer dep ranges).
- `packages/shared` is source-only: `main`, `types`, and `exports["."]` all point to `./src/index.ts`. No build step needed; tsx and ts-jest follow the workspace symlink to the TypeScript source directly.
- API tsconfig uses `module: "node16"` / `moduleResolution: "node16"` to enforce Node.js 16+ module rules. Local imports will need explicit `.js` extensions in future files; bare-specifier package imports (like `@material-register/shared`) do not.
- `eslint.config.js` uses ESM `import`/`export default` syntax. ESLint 10 uses jiti 2 to load config files, so ESM syntax works in a `.js` file even without `"type": "module"`. Root `package.json` was given `"type": "module"` to eliminate Node.js's ESM-detection performance warning. `jest.config.js` in `apps/api` stays CJS (its own package.json has no `"type": "module"`); the ESLint config adds `sourceType: "commonjs"` for `apps/api/**/*.js` to suppress `no-undef` for `module`/`exports`.
- `jiti@^2.7.0` added to root devDependencies to satisfy ESLint 10's peer dependency (needed for `eslint.config.ts` support, though we use `.js`).
- No `moduleNameMapper` in `jest.config.js`: Jest 30 resolves workspace symlinks to real paths before checking `transformIgnorePatterns`, so `packages/shared/src/index.ts` is correctly transformed by ts-jest without a mapper.

**Developer notes:**

Added README.md and added prompts file with initial prompts.
No other changes needed at this stage.

---

## 2026-11-13 — Prompt 02 (Docker Compose)

**Asked:** Add `docker-compose.yml` to run Postgres 18 locally. Create `docker/init.sql` to initialise `materials_test`. Update `AGENTS.md` with layout and commands.

**Files changed:**

- `docker-compose.yml` — Postgres 18-alpine service with named volume, init-script bind mount, and healthcheck
- `docker/init.sql` — creates `materials_test` database on first start
- `.env.example` — port updated from 5432 → 5433 (see decision below)
- `AGENTS.md` — updated layout, added Docker commands and "Docker runs Postgres only" rule

**Decisions:**

- Host port mapped to `5433` instead of `5432`: a local Postgres process was already listening on 5432; user explicitly chose to remap rather than stop it. All connection strings use `localhost:5433`.
- `postgres:18-alpine` chosen as the current stable major version. `PGDATA` on this image is `/var/lib/postgresql/18/docker`, so the named volume is mounted at the parent path `/var/lib/postgresql` (not the pre-18 path `/var/lib/postgresql/data`).
- No `container_name`, `restart` policy, or network config added — keeping compose file minimal as instructed.

**Developer notes:**
no changes needed at this time

---

## 2026-11-13 — Prompt 03 (Database schema)

**Asked:** Define three Drizzle tables (`plants`, `manufacturers`, `materials`) with two Postgres enums, 8 indexes on `materials`, and FK constraints. Configure drizzle-kit, generate and apply the first migration.

**Files changed:**

- `apps/api/src/db/schema.ts` — Drizzle schema: enums, three tables, 8 indexes
- `apps/api/drizzle.config.ts` — drizzle-kit config using `process.loadEnvFile()`
- `apps/api/package.json` — added `drizzle-orm`, `pg`, `drizzle-kit`, `@types/pg`, `@types/node`; added `db:generate` and `db:migrate` scripts
- `apps/api/tsconfig.json` — added `"node"` to `types`, added `drizzle.config.ts` to `include`
- `apps/api/src/db/migrations/0000_bouncy_giant_girl.sql` — generated migration
- `apps/api/src/db/migrations/meta/` — drizzle-kit journal and snapshot
- `.prettierignore` — added `apps/api/src/db/migrations`
- `.env` — created from `.env.example` (gitignored; needed to run migrations)
- `AGENTS.md` — added schema-change workflow and Drizzle rules

**Decisions:**

- `pgEnum` built directly from the shared `MATERIAL_TYPES` / `MATERIAL_STATUSES` `as const` arrays. The drizzle-orm 0.45 signature accepts `Readonly<[U, ...U[]]>`, so no cast is needed.
- `numeric` left in default string mode — JS `number` is a 64-bit float and cannot represent all values of `numeric(12,2)` without rounding errors.
- Explicit snake_case column names on every column (e.g. `materialNumber: text('material_number')`) rather than the `casing` option, so the SQL name is always visible in the source.
- Indexes on all 8 columns specified: `status`, `material_type`, `plant_id`, `manufacturer_id` (FK columns Postgres does not auto-index), `unit_price`, `updated_at`, `description`, `quantity_on_hand` (sort columns per AGENTS.md efficiency rules).
- `@types/node@^26.6.6` added and `"node"` added to tsconfig `types` array — needed for `process.loadEnvFile()` in `drizzle.config.ts`. TypeScript 6 + `moduleResolution: "node16"` does not auto-include ambient `@types/*` globals.

**Developer notes:**

---

## 2026-11-13 — Prompt 04 (Seed data)

**Asked:** Add a DB client factory, a seed script producing 5,000 deterministic material records (plus 5 plants and 26 manufacturers), and a root `db:setup` script (migrate + seed).

**Files changed:**

- `apps/api/src/db/client.ts` — `createDb(connectionString)` factory returning `{ db, pool }`
- `apps/api/src/db/seed-data.ts` — 11 categories with manufacturers, description parts, MPNs, UoMs, price ranges
- `apps/api/src/db/seed.ts` — mulberry32 PRNG, all helpers, transaction with TRUNCATE + inserts, batch loop
- `apps/api/package.json` — added `db:seed` script
- `root package.json` — added `db:setup` script
- `AGENTS.md` — added `db:setup` command and seed-determinism rule

**Decisions:**

- **No faker**: faker knows nothing about bearings or MPN formats, its output for a given seed changes between versions (breaking determinism), and we would hand-write the domain lists regardless. A 6-line mulberry32 PRNG plus 4 helpers achieves the same result with zero new dependencies.
- **mulberry32 seed `0xdeadbeef`**: arbitrary constant — the value doesn't matter, only that it never changes. Documented in AGENTS.md.
- **Anchor date `2026-11-01T00:00:00Z`**: all `updated_at` offsets are computed from this constant so the timestamps are identical on every run regardless of when the seed runs.
- **Batch size 500**: 500 rows × 11 columns = 5,500 bind parameters per INSERT, well inside Postgres's 65,535-parameter limit. Each batch is also a separate round trip, keeping peak memory on the wire protocol low.
- **`TRUNCATE … RESTART IDENTITY CASCADE`** rather than DELETE: truncation is unlogged and much faster on large tables; `RESTART IDENTITY` resets the serial sequences so IDs are identical on every run; `CASCADE` handles the FK dependency order automatically.
- **`createDb` as a factory, not a singleton**: the seed uses `DATABASE_URL`; tests (prompt 05) will use `TEST_DATABASE_URL`. A singleton would force one or the other.

**Developer notes:**

---

## 2026-11-14 — Prompt 05 (API server, tRPC, materials.list)

**Asked:** Stand up Express + tRPC v11, request ID middleware, CORS, `/health`, `materials.list` with pagination and joins, Jest test setup against `materials_test`, three tests (happy path, page 2, bad input), and API.md.

**Files changed:**

- `packages/shared/src/materials.ts` — `PAGE_SIZES`, `materialsListInput` Zod schema, `MaterialsListInput` type
- `packages/shared/src/index.ts` — added `export * from './materials'`
- `packages/shared/package.json` — added `zod` dependency
- `apps/api/src/db/client.ts` — added `DbClient` type alias for the drizzle instance
- `apps/api/src/trpc.ts` — `initTRPC` with `Context`, `errorFormatter`, exports
- `apps/api/src/routers/materials.ts` — `materials.list` with joins, pagination, parallel count
- `apps/api/src/routers/index.ts` — `appRouter`, `AppRouter` type export
- `apps/api/src/server.ts` — Express 5 server replacing placeholder
- `apps/api/tests/globalSetup.js` — plain CJS; migrates `materials_test` once
- `apps/api/tests/setup.ts` — loads `.env` per worker, checks `TEST_DATABASE_URL`
- `apps/api/tests/helpers.ts` — `createTestDb`, `truncateAll`, `createTestCaller`
- `apps/api/tests/fixtures.ts` — 2 plants, 2 manufacturers, 12 materials out of sort order
- `apps/api/tests/materials.test.ts` — 3 tests; deleted old smoke test
- `apps/api/jest.config.js` — added `globalSetup`, `setupFiles`, `maxWorkers: 1`
- `apps/api/package.json` — added `express`, `cors`, `@trpc/server`; updated `dev` script
- `eslint.config.js` — added `globals` import; added `globals.node` and `no-require-imports: off` to CJS `.js` rule
- `root package.json` — added `globals` devDependency
- `.env.example` — added `WEB_ORIGIN`
- `docs/API.md` — HTTP shape intro, error shape, `materials.list` section
- `AGENTS.md` — added testing rules and DB-running note

**Decisions:**

- **One procedure only (`materials.list`):** no plant/manufacturer lookup procedures. Filters (Type, Status) use the shared `MATERIAL_TYPES` / `MATERIAL_STATUSES` constants. Added in prompt 06.
- **`z.preprocess(v => v ?? {}, schema)`** for the input schema instead of `.default({})`: In Zod v4, `.default({})` on an object schema returns the literal `{}` for undefined input without applying field-level defaults, so pagination fell back to `limit(undefined)` and returned all 5,000 rows. `z.preprocess` normalises `undefined → {}` before validation, letting field defaults kick in correctly.
- **CORS callback form** (`origin: (requestOrigin, cb) => cb(null, requestOrigin === WEB_ORIGIN)`): the string form always sends `Access-Control-Allow-Origin` regardless of the request's `Origin`; the callback form sends no header for non-matching origins.
- **`globalSetup` as plain CJS JS**: Jest's `globalSetup` runs in the main process outside the ts-jest transform pipeline. Plain JS with `pg` + drizzle directly avoids needing a TypeScript loader at that stage.
- **Fixtures inserted out of `materialNumber` order**: proves `ORDER BY materialNumber, id` — tests would pass by coincidence if fixtures were in order.
- **`globals` devDependency** added to root: needed to declare `__dirname`, `process` etc. as valid Node.js globals in the ESLint CJS override for `apps/api/**/*.js`.

**Developer notes:**

---

## 2026-11-14 — Prompt 06 (Search, filters, sort)

**Asked:** Extend `materials.list` with `search`, `materialType`, `status`, `sortBy`, `sortDir`. Add 3 new test cases.

**Files changed:** `packages/shared/src/materials.ts`, `apps/api/src/routers/materials.ts`, `apps/api/tests/materials.test.ts`, `docs/API.md`

**Decisions:** `%`, `_` and `\` are escaped in the search term so they are treated as literals. `and(...)` from Drizzle skips `undefined` conditions cleanly, so the same `where` clause is passed to both the page query and the count query.

**Developer notes:**

---

## 2026-11-14 — Prompt 07 (Frontend SPA)

**Asked:** Build the full Material Register SPA in `apps/web`: searchable, filterable, sortable, paginated table with all state in the URL. Mantine UI, TanStack Query v5 + Table v8, tRPC v11, React Router v7.

**Files changed:**

- `apps/web/package.json` — full replacement; added React, Mantine, TanStack, tRPC, React Router deps
- `apps/web/vite.config.ts` — React plugin, `envDir: '../../'`
- `apps/web/tsconfig.json` — strict, bundler resolution, `jsx: react-jsx`, `types: ["vite/client"]`
- `apps/web/index.html` — root HTML
- `apps/web/src/main.tsx` — provider stack: Mantine → QueryClient → tRPC → RouterProvider
- `apps/web/src/trpc.ts` — `createTRPCContext<AppRouter>()`, `createTRPCClient` with `httpBatchLink`
- `apps/web/src/format.ts` — `formatPrice`, `formatDate`, `formatNumber`
- `apps/web/src/hooks/useTableParams.ts` — URL ↔ `MaterialsListInput` bidirectional sync
- `apps/web/src/routes/MaterialsPage.tsx` — query, loading/error/empty/stale states
- `apps/web/src/components/Toolbar.tsx` — debounced search, Type/Status selects, Clear all
- `apps/web/src/components/MaterialsTable.tsx` — TanStack Table with manual sort; skeleton rows
- `apps/web/src/components/TablePagination.tsx` — Mantine Pagination + page-size Select
- `apps/api/package.json` — added `"exports": { "./router": "./src/routers/index.ts" }`
- `.env.example` — added `VITE_API_URL=http://localhost:3001`
- `AGENTS.md` — added web stack section and web-specific rules

**Decisions:**

- **React Router v7 in declarative SPA mode** (`createBrowserRouter` + `RouterProvider`, no framework mode). Framework mode generates file-based routes and config that's unnecessary for a single-route SPA. Declarative mode is just two API calls.
- **`updatedAt` typed as `string` on the client.** Drizzle types it as `Date`, but tRPC's default JSON transport serializes it to an ISO string. Without a superjson transformer, the client receives a string. The TypeScript error confirmed this: the inferred type was `string`. `formatDate` accepts `string` and calls `new Date(value)`.
- **`@trpc/server` as a devDep in `apps/web`.** The web app imports `type AppRouter` from the API, which transitively references `@trpc/server` types. Adding it as a devDep makes TypeScript resolution predictable. No runtime cost (type-only import).
- **Module-level columns array and `sortableSet` in `MaterialsTable`.** Columns reference only constants and module-level formatters — stable across renders. Defined at module scope rather than inside a `useMemo`.
- **`eslint-disable-next-line react-hooks/exhaustive-deps`** in `Toolbar`'s debounce effect. `setParams` is intentionally omitted from deps — including it would re-run the effect on every render (since `setParams` is a new closure each render), defeating the 300 ms debounce.

**Developer notes:**
