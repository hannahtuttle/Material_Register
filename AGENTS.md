# Material Register — Agent Context

## Project

A full-stack material inventory app: React Router v7 SPA + Mantine UI, Express + tRPC API, Drizzle ORM + PostgreSQL.

```
material-register/
├── apps/
│   ├── api/          # Express + tRPC server (CommonJS)
│   └── web/          # React Router v7 SPA (ESM)
├── packages/
│   └── shared/       # Source-only TS package: enums, Zod schemas
├── docker/
│   └── init.sql      # Runs once on first container start (creates materials_test)
├── docker-compose.yml # Postgres 18 on host port 5433
└── docs/
    ├── API.md        # tRPC procedure reference
    └── AI_LOG.md     # Per-task AI change log
```

**Commands** (run from repo root):

| Command                  | Does                                        |
| ------------------------ | ------------------------------------------- |
| `npm run dev`            | Starts API and web concurrently             |
| `npm test`               | Runs Jest in every workspace that has tests |
| `npm run lint`           | ESLint across the whole monorepo            |
| `npm run typecheck`      | `tsc --noEmit` in every workspace           |
| `npm run format`         | Prettier write                              |
| `npm run format:check`   | Prettier check (CI)                         |
| `docker compose up -d`   | Start Postgres in the background            |
| `docker compose down -v` | Stop Postgres and wipe the data volume      |

> `db:setup` (Drizzle migrations) arrives in prompt 04.
>
> **Port note:** host port is `5433` (not `5432`) because a local Postgres was already on 5432. All connection strings use `localhost:5433`.

---

## Rules

### 1. Walkthrough rule

When writing **tRPC, Mantine, TanStack Table/Query, Drizzle, or Docker** code, explain what every piece does and why in the end-of-task summary. The developer is new to these tools and must be able to explain every line.

### 2. Lean code

Write the simplest solution that meets the requirement. No speculative abstractions, no new libraries without asking, nothing beyond the current task. Keep diffs small.

### 3. Validation

Every API input is validated with Zod. Schemas that the front end also needs live in `packages/shared`.

### 4. Testing

Every tRPC procedure has a happy-path Jest test using `createCaller` against the `materials_test` database.

### 5. Docs

Any change to a procedure's input or output updates `docs/API.md` in the same change, including time complexity and the indexes used.

### 6. Efficiency rules

- Search / filter / sort / pagination happens in SQL, never in JavaScript.
- Index every column used to filter, sort, or join.
- No N+1 queries — use joins.
- Page query and count query run in parallel.
- Select only the columns you need.
- Always append the `id` tie-breaker to `ORDER BY`.
- Document time complexity per endpoint.
- Do not optimise beyond these rules unless asked.

### 7. Errors

Generic messages to the client, full detail in server logs. Every request and error carries a request ID.

### 8. Docker

Docker runs Postgres only. Do not containerise `apps/api` or `apps/web` unless explicitly asked.

### 9. Schema changes (Drizzle)

1. Edit `apps/api/src/db/schema.ts`.
2. Run `npm run db:generate -w apps/api` and review the generated SQL.
3. Run `npm run db:migrate -w apps/api` to apply.
4. Commit the generated migration files alongside the schema change.

Never use `drizzle-kit push` (it mutates the database without a migration file). Never hand-edit files inside `src/db/migrations/` **except** to rename: after `db:generate`, always rename the generated file from drizzle-kit's random name (e.g. `0000_bouncy_giant_girl.sql`) to a descriptive one (e.g. `0000_initial_schema.sql`) and update the matching `tag` in `meta/_journal.json`. The database tracks migrations by SQL hash, not filename, so renames are safe.

`numeric` columns stay in string mode (Drizzle default). Format them on the front end — do not add `mode: 'number'`.

### 10. Module format

- `apps/api` — CommonJS (no `"type": "module"`).
- `apps/web` — ESM (`"type": "module"`).
- `packages/shared` — source-only TypeScript, no build step.

Do not change any of these.

### 11. TypeScript

Strict mode throughout. No `any` without an inline comment explaining why.

### 12. AI log

After every task, append an entry to `docs/AI_LOG.md`: prompt file name, what was asked, files changed, decisions made. The developer adds their own corrections below each entry.

### 13. Never commit

The developer reviews the diff and commits. Do not run `git commit` or `git push`.

### 14. Definition of done

`npm run typecheck`, `npm run lint`, and `npm test` all pass. `docs/API.md` and `docs/AI_LOG.md` are updated. Finish with a summary of what changed and what to review closely.
