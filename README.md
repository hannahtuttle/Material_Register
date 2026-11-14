# Material Register

A full-stack material inventory application: search, filter, sort, and paginate a list of maintenance materials across multiple plants. The demo query to try first: search "bearing", filter Status = Active, filter Type = Spare Part — the result is active spare-part bearings, with Brisbane and other plant assignments visible in the table.

**Stack:** React Router v7 · Mantine v7 · TanStack Query v5 · TanStack Table v8 · tRPC v11 · Express 5 · Drizzle ORM · PostgreSQL 18

---

## Prerequisites

- **Node.js ≥ 22** (see `engines` in `package.json`)
- **Docker** (runs Postgres only; the apps run on the host)
- Ports **5433**, **3001**, and **5173** free on the host

> Port 5433 is used instead of 5432 because a local Postgres was already on 5432.

---

## Setup

```bash
cp .env.example .env
docker compose up -d       # starts Postgres 18-alpine on host port 5433
npm install
npm run db:setup           # migrate then seed 5 000 materials
npm run dev                # starts API (3001) and web (5173) concurrently
```

Open **http://localhost:5173**.

```bash
npm test                   # Jest tests against materials_test (DB must be running)
docker compose down -v     # stop Postgres and wipe the data volume
```

---

## Commands

| Command               | Does                                                     |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Starts API (port 3001) and web (port 5173) concurrently  |
| `npm run db:setup`    | Migrates the schema then seeds 5 000 deterministic rows  |
| `npm test`            | Runs Jest integration tests against `materials_test`     |
| `npm run typecheck`   | `tsc --noEmit` in every workspace                        |
| `npm run lint`        | ESLint across the whole repo                             |
| `npm run format`      | Prettier write                                           |

---

## Architecture

```
material-register/
├── apps/
│   ├── api/        Express + tRPC server (CommonJS, port 3001)
│   └── web/        React Router v7 SPA  (ESM, port 5173, Vite)
├── packages/
│   └── shared/     Source-only TypeScript — enums + Zod schemas, no build step
├── docker/
│   └── init.sql    Creates materials_test on first container start
└── docker-compose.yml  Postgres 18 on host port 5433
```

**Request path:**
URL → `useTableParams` parses `URLSearchParams` → `MaterialsPage` calls `trpc.materials.list.queryOptions(params)` → TanStack Query fires `GET /trpc/materials.list?input=…` → Express request-ID middleware → tRPC adapter validates input against `materialsListInput` → Drizzle builds JOIN + WHERE + ORDER BY + LIMIT/OFFSET + parallel COUNT → Postgres executes → response serialised to JSON → TanStack Query caches → `MaterialsTable` renders.

---

## Decisions and trade-offs

**tRPC for end-to-end types.**
The client and server share `AppRouter` as a TypeScript type (imported with `import type`). The client gets typed procedure calls and inferred return types without code generation, a schema registry, or a separate spec file.

**One shared Zod schema for both URL params and API input.**
`materialsListInput` in `packages/shared` uses `z.coerce` on numeric fields so the same schema validates a JSON body from the API and a `Record<string, string>` from `URLSearchParams`. Pagination defaults, enum constraints, and `search` trimming live in one place.

**One procedure; Type and Status filters come from shared constants.**
`materials.list` is the only endpoint. The filter values (`MATERIAL_TYPES`, `MATERIAL_STATUSES`) are exported from `packages/shared`, so the UI builds its dropdowns from the same source as the API's enum validation — no plant or manufacturer lookup procedures needed.

**The API is a separate service.**
CORS is configured with an allow-list (`WEB_ORIGIN`), not a Vite proxy. The browser enforces the origin check; `curl` ignores it. `X-Request-Id` is exposed so the browser can read it and correlate errors with the server log.

**Docker runs Postgres only.**
Both apps run on the host with `tsx --watch` and Vite HMR. No multi-service compose, no extra build steps.

**CommonJS API, ESM web, source-only shared package.**
`apps/api` is CJS because ts-jest and tsx work best with Node.js CJS semantics. `apps/web` is ESM because Vite requires it. `packages/shared` is TypeScript source with no compilation — both consumers import directly from `src/`.

**React Router v7 in declarative SPA mode.**
`createBrowserRouter` + `RouterProvider`, not framework mode. Framework mode generates file-based routes and config that add no value for a single-route app.

**`ILIKE '%term%'` search.**
A leading wildcard prevents btree index use, so this is a sequential scan: O(n). Fine at 5 000 rows. A `pg_trgm` GIN index measured with `EXPLAIN ANALYZE` is the next step at scale.

**Offset pagination + `COUNT(*)`.**
Both are O(matching rows). Easy to implement and reason about. For large offsets or high-frequency reads, keyset pagination (a `WHERE id > last_seen_id` cursor) would eliminate the O(n) scan.

**`id` sort tie-breaker.**
Every `ORDER BY` appends `, id ASC`. Without it, two rows with the same `unitPrice` could appear in either order and swap positions between pages — a row could be shown twice or skipped entirely as the page boundary fell mid-tie. `id` is unique and stable, so the tie is broken deterministically.

**`numeric` returned as a string.**
Postgres `numeric(12,2)` can hold values that a 64-bit float cannot represent without rounding. Drizzle leaves `numeric` columns in string mode; `formatPrice` converts to `Number` only for display, inside `Intl.NumberFormat`.

**Indexes on every filter, sort, and FK column.**
Postgres does not automatically index foreign keys. `materials_plant_id_idx` and `materials_manufacturer_id_idx` prevent a sequential scan on the FK columns during joins. All five `sortBy` columns and both filter columns have btree indexes.

**Deterministic seed.**
5 000 records generated with mulberry32 (a 32-bit PRNG) seeded at `0xdeadbeef` and a fixed anchor date (`2026-11-01T00:00:00Z`). No faker — the domain-specific description lists and MPN formats were written by hand. Re-running the seed always produces identical records.

**Errors: generic client messages, full server logs.**
`INTERNAL_SERVER_ERROR` messages are replaced with "Something went wrong" before leaving the server. Each request and error carries an 8-character `requestId` that appears in `X-Request-Id`, the server log, and `error.data.requestId` on the client.

**Single-select filters; `retry: false`.**
Type and Status are single-select dropdowns (the data model has one value per row). TanStack Query's `retry` is disabled so the Retry button in the error state is the only retry mechanism — automatic retries would mask transient errors that the user should see.

---

## What I'd do next

- **Search at scale:** add a `pg_trgm` GIN index; measure with `EXPLAIN ANALYZE` before and after; consider a `tsvector` full-text index for multi-language support.
- **Keyset pagination:** replace `OFFSET` with a `WHERE id > cursor` approach so deep pages stay O(1).
- **More filters:** manufacturer (needs a lookup endpoint or an inline select from the existing data), plant, in-stock only.
- **Multi-select filters:** `status IN (...)` / `materialType IN (...)` with Mantine's `MultiSelect`.
- **Detail / edit view:** a second route (`/materials/:id`) with an edit form; tRPC `materials.get` and `materials.update` procedures.
- **Natural-language filters:** a small LLM call that maps free text ("active bearings under $50") to structured filter params.
- **Front-end tests:** Playwright end-to-end covering search, filters, pagination, and the error state.
- **Production Docker build:** multi-stage Dockerfile for the API; `vite build` output served by nginx alongside the API, or as a separate static service.
- **CI:** GitHub Actions running `typecheck`, `lint`, `test`, and `build`.

---

## How I used AI tools

Claude Code handled implementation. A separate Claude chat was used for planning and writing the numbered prompts.

**`AGENTS.md`** acts as tool-neutral agent context that travels with the repo: stack constraints, efficiency rules, testing rules, and definition of done. Each prompt references it rather than re-stating conventions.

**`prompts/`** contains every prompt I ran, numbered. **`docs/AI_LOG.md`** has an entry per task recording what was asked, what changed, and any decisions made.

**What worked well:**
- Tight prompt scope with an explicit "files you may touch" list kept diffs small and reviewable.
- Shared conventions in `AGENTS.md` meant I didn't have to re-state "no N+1 queries" or "index FK columns" in every prompt.
- Numbered verify steps in each prompt (typecheck / lint / test / manual checklist) caught problems before they compounded.

**What I corrected:**

- Rejected the first attempt at Prompt 05: it added two lookup procedures (`plants.list`, `manufacturers.list`) and tests that weren't needed; reverted it and cut the API to a single `materials.list` endpoint.
- Reversed a suggestion to route the web app through a Vite proxy instead of CORS: keeping the API as a genuinely separate service with an allow-list is closer to how it would run in production.
- Questioned the seed's status weighting when reviewing the data; kept it after confirming it produces realistic-looking Active/Obsolete/Pending Review proportions.
- Merged the remaining prompts (05 search, 06 filters/sort, 07 frontend) to stay close to the time box after the Prompt 05 revert.

<!-- TODO(me): add your own reflection here — what you would change about how you used the AI, what surprised you, what you'd do differently next time -->

---
