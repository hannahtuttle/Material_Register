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
