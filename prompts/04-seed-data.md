# Prompt 04 — Repeatable seed data

## Goal

Add a DB client and a seed script that fills the `materials` database with **5,000 realistic material records** (plus plants and manufacturers). Every run produces **identical data**, so `MAT-000123` is always the same record in a demo. Add a root `npm run db:setup` (migrate + seed).

## Context

- Prompt 03 created the schema (`apps/api/src/db/schema.ts`) and the first migration. The API is CommonJS and runs with `tsx`.
- `.env` (root) has `DATABASE_URL`.
- **Do only what this prompt asks.** Check the current Drizzle docs for node-postgres setup, `insert().values().returning()` and transactions.

## Decision: hand-rolled word lists + a tiny seeded PRNG (no faker)

- Faker's data is generic (names, addresses, lorem). It knows nothing about bearings, V-belts or MPN formats, so we would hand-write the domain lists anyway, and faker would only be choosing random items from them.
- Faker's output for a given seed can change between versions, which would break "MAT-000123 is always the same".
- So: no new dependency. A ~6-line **mulberry32** PRNG seeded with a constant, plus small helpers (`pick`, `weightedPick`, `intBetween`, `priceBetween`). Add a comment naming the algorithm.
- **No `Math.random()` and no `Date.now()`/`new Date()` without arguments anywhere in the seed.** Dates are generated relative to a fixed anchor date constant (e.g. `2026-11-01T00:00:00Z`).

## Scope

### 1. `apps/api/src/db/client.ts`

- `createDb(connectionString: string)` returns `{ db, pool }`: a `pg` `Pool` and `drizzle(...)` with the schema passed in. Export the `Db` type.
- A function rather than a module-level singleton, because the seed uses `DATABASE_URL` now and the tests (prompt 05) will use `TEST_DATABASE_URL`. Nothing else.
- No env reading inside this file.

### 2. `apps/api/src/db/seed-data.ts`: the word lists (data only, no logic)

- **Plants (5):** `1000 Brisbane`, `2000 Sydney`, `3000 Perth`, `4000 Melbourne`, `5000 Newcastle`.
- **Categories (~10–12).** Each category defines:
  - `materialType` (one of the shared `MATERIAL_TYPES`)
  - `manufacturers`: real-world brands that make this kind of item
  - description parts that combine into plausible text, e.g. `"Bearing, deep groove ball, 25mm bore"`, `"V-belt, classical B section, 1200mm"`, `"Grease, lithium complex EP2, 18kg pail"`
  - an MPN pattern (e.g. `6205-2RS1`-style for bearings)
  - `unitOfMeasure` options (EA, KG, L, M, BOX, ROLL…)
  - a realistic AUD price range
- Cover all four material types. Suggested categories: bearings (SKF, Timken, NSK, FAG), belts (Gates, Continental), seals & O-rings (Parker, SKF), hydraulic fittings & hoses (Parker, Bosch Rexroth), electrical (ABB, Siemens, Schneider Electric), pneumatics (Festo, SMC), filters (Donaldson, Fleetguard), lubricants (Mobil, Shell, Castrol), adhesives & tapes (3M, Loctite), raw materials such as steel plate, bar and pipe (BlueScope, InfraBuild), tools (Makita, Bahco, Fluke, Milwaukee).
- The manufacturers table is the unique set of brands across all categories.
- Keep it readable. A few options per list is plenty, not hundreds.

### 3. `apps/api/src/db/seed.ts`

1. Read `DATABASE_URL`; throw a clear error if it's missing. Call `createDb`.
2. Everything inside **one transaction**:
   - `TRUNCATE materials, manufacturers, plants RESTART IDENTITY CASCADE` (so IDs are also identical on every run).
   - Insert plants and manufacturers with `.returning()`, and build lookup maps (name → id).
   - Generate 5,000 materials:
     - `material_number`: `MAT-000001` … `MAT-005000` (sequential, zero-padded).
     - Pick a category, then a manufacturer from that category, then build the description and MPN.
     - `status`: weighted ~80% Active, ~12% Obsolete, ~8% Pending Review.
     - `plant_id`: any plant.
     - `unit_price`: within the category range, as a 2-decimal **string**.
     - `quantity_on_hand`: 0–500, with ~10% at zero.
     - `updated_at`: a random time within the 2 years before the anchor date.
   - Insert in **batches of 500** (explain why batching matters: Postgres's 65,535-parameter limit and round trips).
3. Log the row counts and elapsed time, then `pool.end()`. On error: log it, exit with code 1, and still close the pool.

### 4. Scripts

- `apps/api`: `db:seed`: `tsx --env-file=../../.env src/db/seed.ts`
- Root: `db:setup`: run `db:migrate` then `db:seed` in `apps/api` (`&&`, so the seed never runs after a failed migration).

### 5. `AGENTS.md`

- Commands: add `npm run db:setup` (migrate + seed; safe to re-run).
- Rule: the seed must stay deterministic (fixed PRNG seed and anchor date; no `Math.random`/`Date.now`).

### 6. `docs/AI_LOG.md`

Append this prompt's entry, including the faker decision.

## Files you may touch

`apps/api/src/db/client.ts`, `apps/api/src/db/seed-data.ts`, `apps/api/src/db/seed.ts`, `apps/api/package.json`, root `package.json`, `AGENTS.md`, `docs/AI_LOG.md`, `package-lock.json`.

## Out of scope

Express, tRPC, routers, tests (prompt 05), Zod, `docs/API.md`, schema changes.

## Verify (run these and show me the output)

1. `npm run db:setup` succeeds, and the log shows 5 plants, N manufacturers and 5,000 materials.
2. Run this, then run `npm run db:setup` again and repeat it. The output must be **identical** both times:
   `docker compose exec db psql -U postgres -d materials -c "SELECT m.id, m.material_number, m.description, m.manufacturer_part_number, m.unit_price, m.updated_at, mf.name, p.name FROM materials m JOIN manufacturers mf ON mf.id = m.manufacturer_id JOIN plants p ON p.id = m.plant_id WHERE m.material_number IN ('MAT-000001','MAT-000123','MAT-005000');"`
3. Status and type distribution: `SELECT status, count(*) FROM materials GROUP BY 1;` and the same for `material_type`.
4. The demo query returns rows: active bearings from SKF at Brisbane (`status = 'Active'`, description `ILIKE '%bearing%'`, manufacturer SKF, plant code 1000). Show the count and 5 sample rows.
5. `npm run typecheck`, `npm run lint` and `npm test` pass.

## Walkthrough expectations

Explain in the end-of-task summary:

- `client.ts`: `Pool` vs a single client, what `drizzle({ client, schema })` gives us, and why it's a factory.
- The Drizzle calls used: `insert().values().returning()`, `db.transaction(async (tx) => …)` (and why everything goes through `tx`, not `db`), and running raw SQL with the `sql` template tag for `TRUNCATE`.
- Why `TRUNCATE … RESTART IDENTITY CASCADE` rather than `DELETE`.
- How mulberry32 makes runs repeatable, and why the anchor date matters too.
- Batching: the parameter limit and the trade-off in batch size.

## Definition of done

- All verify steps pass, including the identical-output check.
- AGENTS.md and AI_LOG.md updated.
- Do not commit. End with the walkthrough and anything I should review closely.
