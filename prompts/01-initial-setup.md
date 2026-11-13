# Prompt 01 — Initial setup

## Goal
Set up the monorepo skeleton: npm workspaces, three packages, strict TypeScript, ESLint, Prettier, root scripts, the agent context file and doc stubs. Prove that `packages/shared` can be imported from the API (at runtime and in Jest). No app features yet.

## Context
This is the first step of a take-home "Material Register" app (React Router v7 SPA + Mantine, Express + tRPC API, Drizzle + PostgreSQL). Later prompts add Docker, the schema, the API and the front end. **Do only what this prompt asks.** Use the latest stable versions of every package (check npm, don't guess).

## Scope

### 1. Root
- `package.json`: `"private": true`, `"workspaces": ["apps/*", "packages/*"]`, `"engines": { "node": ">=22" }`.
- Root scripts:
  - `dev`: `concurrently` running the `dev` scripts of `apps/api` and `apps/web`, with names `api,web` and coloured prefixes.
  - `typecheck`: runs `typecheck` in every workspace (`--workspaces --if-present`).
  - `lint`: `eslint .`
  - `format`: `prettier --write .` and `format:check`: `prettier --check .`
  - `test`: runs `test` in every workspace that has one.
  - Do **not** add `db:setup` yet (prompt 04).
- `tsconfig.base.json`: `strict: true`, `target` ES2022, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`, `isolatedModules`. Each package extends it. Keep it to the recommended settings; don't add extra strictness flags.
- `eslint.config.js` (flat config): `@eslint/js` recommended + `typescript-eslint` recommended for all TS; `eslint-plugin-react-hooks` recommended for `apps/web/**` only; `eslint-config-prettier` last. Ignore `dist`, `build`, `coverage`, `node_modules`, `.react-router`.
- `.prettierrc` (single quotes, trailing commas, printWidth 100) and `.prettierignore`.
- `.gitignore`: node_modules, dist, build, coverage, `.env`, `.react-router`, OS/editor files.
- `.env.example`:
  ```
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/materials
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/materials_test
  ```

### 2. `packages/shared` (`@material-register/shared`)
- **Source-only package, no build step.** `package.json` points `exports`, `main` and `types` at `./src/index.ts`. No `"type": "module"`.
- `src/index.ts` re-exports from `src/enums.ts`, which contains:
  ```ts
  export const MATERIAL_TYPES = ['Spare Part', 'Consumable', 'Raw Material', 'Tool'] as const;
  export type MaterialType = (typeof MATERIAL_TYPES)[number];
  export const MATERIAL_STATUSES = ['Active', 'Obsolete', 'Pending Review'] as const;
  export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];
  ```
- `typecheck` script: `tsc --noEmit`.
- No Zod yet (prompt 06).

### 3. `apps/api` (`@material-register/api`), CommonJS
- No `"type": "module"` → CommonJS. `tsconfig.json`: `module` and `moduleResolution` `node16` (or `nodenext`), `noEmit`.
- Depends on `@material-register/shared` (`"*"` workspace dependency).
- Dev runner: **`tsx`** (`dev`: `tsx watch src/server.ts`). tsx compiles the shared package's TS source on the fly, so no build step is needed.
- `src/server.ts`: a **placeholder only**. Import `MATERIAL_TYPES` from `@material-register/shared` and log it. (Prompt 05 replaces this with Express + tRPC.)
- Jest: `jest`, `ts-jest`, `@types/jest`. `jest.config.js` with the `ts-jest` preset, `testEnvironment: 'node'`, `roots: ['<rootDir>/tests']`. Add `moduleNameMapper` for the shared package **only if** the import fails without it.
- `tests/shared-import.test.ts`: one smoke test asserting `MATERIAL_STATUSES` contains `'Active'`. It exists to prove ts-jest resolves the shared package; prompt 05 adds the real tests.
- Scripts: `dev`, `typecheck` (`tsc --noEmit`), `test` (`jest`).

### 4. `apps/web` (`@material-register/web`): placeholder only
- `package.json` with `"type": "module"`, a dependency on `@material-register/shared`, and a `dev` script that just prints `web app is added in prompt 07`. No React, Vite or Mantine yet.
- No tsconfig yet (prompt 07 adds it along with the real app).

### 5. `AGENTS.md` (root, concise)
Write it from these points (no CLAUDE.md):
1. Project summary, stack, repo layout, and commands (`dev`, `test`, `lint`, `typecheck`, `format`; note that `db:setup` arrives in prompt 04).
2. **Walkthrough rule:** when writing tRPC, Mantine, TanStack Table/Query, Drizzle or Docker code, explain what it does and why in the end-of-task summary. The developer is new to these and must be able to explain every line.
3. **Lean code:** simplest solution that meets the requirement; no speculative abstractions; no new libraries without asking; nothing beyond the current task; small diffs.
4. **Validation:** every API input is validated with Zod; schemas live in `packages/shared` when the front end also needs them.
5. **Testing:** every API procedure has a happy-path Jest test (tRPC `createCaller` + the `materials_test` DB).
6. **Docs:** any change to a procedure's input or output updates `docs/API.md` in the same change, including complexity and the indexes used.
7. **Efficiency rules:** search/filter/sort/pagination in SQL, never JS · index every column used to filter, sort or join · no N+1, use joins · page and count queries run in parallel · select only needed columns · always add the `id` tie-breaker to ORDER BY · document time complexity per endpoint · don't optimise beyond this unless asked.
8. **Errors:** generic client messages, full server logs, a request ID on every request and error.
9. **Module format:** the API stays CommonJS, the web app is ESM, and `packages/shared` is source-only TS (no build). Don't change any of these.
10. TypeScript strict; no `any` without a comment explaining why.
11. **AI log:** after each task, append an entry to `docs/AI_LOG.md` (prompt file, what was asked, files changed, decisions). The developer adds their own corrections.
12. **Never commit.** The developer reviews the diff and commits.
13. **Definition of done:** `npm run typecheck`, `npm run lint` and `npm test` pass; API.md and AI_LOG.md updated; finish with a summary of what changed and what to review closely.

### 6. Docs stubs
- `docs/API.md`: a title, one line explaining that each tRPC procedure gets a section, and the section template below (no procedures yet):
  ```md
  ## <router>.<procedure>  (query|mutation)
  **Input:** fields, defaults, limits (schema name in packages/shared)
  **Returns:** shape
  **Errors:** BAD_REQUEST on invalid input; INTERNAL_SERVER_ERROR (with requestId)
  **Complexity:** time complexity and indexes used
  **Example:** input object
  ```
- `docs/AI_LOG.md`: a title, the entry format, and the first entry for this prompt.

## Files you may touch
Everything listed above, `package-lock.json`, and a `prompts/` folder only if it doesn't exist (don't edit files already in it). Nothing else.

## Out of scope
Docker, Drizzle, Express, tRPC, Zod, React, Vite, Mantine, README. Don't create files for later prompts.

## Walkthrough expectations
These tools are familiar to me, so keep explanations short, except for:
- **Shared-package resolution:** explain how `@material-register/shared` is resolved by (a) tsx at runtime, (b) `tsc --noEmit` in the API, and (c) ts-jest, and why a source-only package avoids a build step. Say what Vite will need in prompt 07 (I expect nothing special, but confirm it).
- Any setting in the tsconfigs or ESLint config that isn't obvious.

## Definition of done
- `npm install` succeeds from a clean checkout.
- `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test` all pass.
- `npm run dev -w apps/api` logs the material types from the shared package.
- `docs/AI_LOG.md` has this prompt's entry.
- Do not commit. End with a summary: what changed, the resolution explanation above, and anything I should review closely.
