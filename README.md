# Material Register

A full-stack material inventory application.

**Stack:** React Router v7 · Mantine · Express · tRPC · Drizzle ORM · PostgreSQL

## Repo layout

```
apps/
  api/      Express + tRPC server (CommonJS)
  web/      React Router v7 SPA (ESM)
packages/
  shared/   Shared TypeScript types and Zod schemas (source-only, no build)
docs/
  API.md    tRPC procedure reference
  AI_LOG.md Per-task AI change log
```

## Prerequisites

- Node.js >= 22
- PostgreSQL (added in prompt 04 via Docker)

## Getting started

```bash
npm install
npm run dev
```

## Commands

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Start API and web dev servers concurrently |
| `npm test`             | Run Jest tests                             |
| `npm run typecheck`    | TypeScript type-check all packages         |
| `npm run lint`         | ESLint                                     |
| `npm run format`       | Prettier write                             |
| `npm run format:check` | Prettier check (CI)                        |
