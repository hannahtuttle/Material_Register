# Prompt 03 — Database schema (Drizzle)

## Goal

Define the three tables in Drizzle, configure drizzle-kit, then generate and apply the first migration to the `materials` database. Schema only: no client, no seed and no queries yet.

## Context

- Prompt 01: npm workspaces; `packages/shared` exports `MATERIAL_TYPES` and `MATERIAL_STATUSES` (`as const` arrays). The API is CommonJS and runs with `tsx`.
- Prompt 02: Postgres runs in Docker; `DATABASE_URL` is in `.env` (copied from `.env.example`).
- **Do only what this prompt asks.** Check the current Drizzle docs for API details (the index syntax in particular has changed between versions). Use the latest stable `drizzle-orm` and `drizzle-kit`.

## Scope

### 1. Dependencies (`apps/api`)

- `drizzle-orm` and `pg` (node-postgres) + `@types/pg`; `drizzle-kit` as a dev dependency.
- No `dotenv`. Load `.env` with Node's built-in `process.loadEnvFile()` (see section 3).

### 2. `apps/api/src/db/schema.ts`

Use **explicit snake_case column names** (e.g. `materialNumber: text('material_number')`), not the `casing` option, so the SQL name is visible in the code. Every column is `.notNull()` unless stated.

**Enums** (built from the shared arrays, so the DB, Zod and the UI share one list):

- `materialTypeEnum = pgEnum('material_type', MATERIAL_TYPES)`
- `materialStatusEnum = pgEnum('material_status', MATERIAL_STATUSES)`

**`plants`**: `id` serial PK · `code` text unique · `name` text

**`manufacturers`**: `id` serial PK · `name` text unique

**`materials`**

| column                   | Drizzle                                               | notes                                                        |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------------------ |
| id                       | `serial` PK                                           |                                                              |
| material_number          | `text`, unique                                        |                                                              |
| description              | `text`                                                |                                                              |
| material_type            | `materialTypeEnum`                                    |                                                              |
| status                   | `materialStatusEnum`                                  |                                                              |
| manufacturer_id          | `integer`, FK → `manufacturers.id`                    |                                                              |
| manufacturer_part_number | `text`                                                |                                                              |
| plant_id                 | `integer`, FK → `plants.id`                           |                                                              |
| unit_of_measure          | `text`                                                |                                                              |
| unit_price               | `numeric`, precision 12, scale 2                      | keep the default **string** mode; don't use `mode: 'number'` |
| quantity_on_hand         | `integer`                                             |                                                              |
| updated_at               | `timestamp` with `withTimezone: true`, `defaultNow()` |                                                              |

Leave the FK `onDelete` behaviour at the default (no action).

**Indexes on `materials`** (btree, named `materials_<column>_idx`):
`status`, `material_type`, `plant_id`, `manufacturer_id`, `unit_price`, `updated_at`, `description`, `quantity_on_hand`.

- The FK columns need explicit indexes because Postgres does not index foreign keys automatically.
- `description` and `quantity_on_hand` are indexed because they are sort columns (AGENTS.md: index every column used to filter, sort or join). The description index helps sorting only; it does **not** help `ILIKE '%term%'` search.
- `material_number`, `plants.code` and `manufacturers.name` are covered by their unique constraints.
- Single-column indexes only, no composites.

**No `relations()` definitions.** Later queries use Drizzle's SQL-like `select().from().innerJoin()`, not the relational query API.

### 3. `apps/api/drizzle.config.ts`

- At the top: `process.loadEnvFile('../../.env')`, with a comment explaining it loads the root `.env` (drizzle-kit runs from `apps/api`). If the file is missing, it should fail with a clear message telling me to copy `.env.example`.
- `dialect: 'postgresql'`, `schema: './src/db/schema.ts'`, `out: './src/db/migrations'`, `dbCredentials: { url: process.env.DATABASE_URL }`. Throw if `DATABASE_URL` is unset (no `!` non-null assertion).

### 4. Scripts (`apps/api/package.json`)

- `db:generate`: `drizzle-kit generate`
- `db:migrate`: `drizzle-kit migrate`
- No `push` script. No root scripts yet (prompt 04 adds `db:setup`).

### 5. Generate and apply

- Run `db:generate` to create the first migration. **Show me the generated SQL** before applying it.
- Run `db:migrate` against the `materials` database.
- Add `apps/api/src/db/migrations` to `.prettierignore` (generated files).

### 6. `AGENTS.md`

Add these rules:

- Schema changes: edit `schema.ts` → `npm run db:generate -w apps/api` → review the SQL → `db:migrate`. Commit the migration files.
- Never use `drizzle-kit push`, and never hand-edit generated migrations.
- `numeric` columns stay in string mode; format them on the front end.

### 7. `docs/AI_LOG.md`

Append this prompt's entry.

## Files you may touch

`apps/api/package.json`, `apps/api/drizzle.config.ts`, `apps/api/src/db/schema.ts`, `apps/api/src/db/migrations/**` (generated), `apps/api/tsconfig.json` (only if needed to type-check the config), `.prettierignore`, `AGENTS.md`, `docs/AI_LOG.md`, `package-lock.json`.

## Out of scope

DB client/connection pool (prompt 04), seed, test DB migration (prompt 05), routers, Zod, `docs/API.md`.

## Verify (run these and show me the output)

1. `npm run db:generate -w apps/api` creates one migration; running it again reports no changes.
2. `npm run db:migrate -w apps/api` succeeds.
3. `docker compose exec db psql -U postgres -d materials -c '\d materials'` shows the columns, FKs, unique constraint and all 8 indexes.
4. `docker compose exec db psql -U postgres -d materials -c '\dT+'` shows both enums with the right values.
5. `npm run typecheck`, `npm run lint` and `npm test` pass.

## Walkthrough expectations (I'm new to Drizzle)

In the end-of-task summary, explain:

- `drizzle-orm` vs `drizzle-kit`: what each one does, and why `pg` is a separate package.
- `schema.ts` line by line: the column builders, `.notNull()`, `.unique()`, `.references()`, `pgEnum` from the shared arrays, and the index syntax (the third argument to `pgTable`).
- Why `numeric` comes back as a string (precision; JS numbers are floats).
- `drizzle.config.ts`: each field.
- `generate` vs `migrate` vs `push`, and why we avoid `push`.
- The files in the migrations folder (the SQL, the `meta/` journal and snapshots) and the `drizzle.__drizzle_migrations` table that tracks which migrations have been applied.
- A walk through the generated SQL, mapping each statement back to `schema.ts`.

## Definition of done

- All verify steps pass.
- AGENTS.md and AI_LOG.md updated.
- Do not commit. End with the walkthrough and anything I should review closely.
