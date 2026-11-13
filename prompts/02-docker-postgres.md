# Prompt 02 — Docker Compose (Postgres only)

## Goal

Run PostgreSQL locally in Docker with two databases: `materials` (the app) and `materials_test` (Jest). The apps keep running on the host; Docker runs the database only.

## Context

Prompt 01 set up the monorepo. `.env.example` already expects:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/materials
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/materials_test
```

The compose file must match these values exactly. **Do only what this prompt asks.**

## Scope

### 1. `docker-compose.yml` (root)

One service, `db`:

- `image`: the official `postgres` image, pinned to the **current stable major version** (check Docker Hub; use the `-alpine` variant). No `latest` tag.
- `environment`: `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=materials`. Hard-coded is fine; add a comment saying these are local-dev credentials only.
- `ports`: `"5432:5432"`.
- `volumes`:
  - a named volume (`pgdata`) for the data directory. **Check the image docs for the correct mount path for the version you pick**: Postgres 18+ images changed it from `/var/lib/postgresql/data` to `/var/lib/postgresql`. Getting this wrong makes the data not persist, or stops the container from starting.
  - `./docker/init.sql` mounted read-only into `/docker-entrypoint-initdb.d/`.
- `healthcheck`: `pg_isready -U postgres -d materials`, with a short interval, timeout and retries.
- Declare the `pgdata` volume at the bottom.
- No `version:` key (it's obsolete). No `container_name`, `restart` policy, network config or extra services.

Add a **short comment above each key** saying what it does, so the file reads on its own.

### 2. `docker/init.sql`

```sql
CREATE DATABASE materials_test;
```

Plus a one-line comment: this runs only on first start with an empty volume; reset with `docker compose down -v`.

### 3. `AGENTS.md`

- Add `docker-compose.yml` and `docker/` to the layout.
- Add to commands: `docker compose up -d` (start DB), `docker compose down -v` (wipe and reset DB).
- Add one rule: Docker runs Postgres only; don't containerise the apps unless asked.

### 4. `docs/AI_LOG.md`

Append this prompt's entry.

## Files you may touch

`docker-compose.yml`, `docker/init.sql`, `AGENTS.md`, `docs/AI_LOG.md`. Nothing else.

## Out of scope

Drizzle, migrations, the API, any `package.json` scripts, README, Dockerfiles for the apps.

## Verify (run these and show me the output)

1. `docker compose up -d`
2. `docker compose ps`: `db` shows `healthy` (wait for the healthcheck).
3. `docker compose exec db psql -U postgres -c '\l'`: both `materials` and `materials_test` are listed.
4. `docker compose down -v`, then `up -d` again: both databases come back (proves init.sql re-runs on an empty volume).
5. `npm run typecheck`, `npm run lint` and `npm test` still pass.

If port 5432 is already in use on my machine, stop and tell me. Don't change the port yourself.

## Walkthrough expectations (thorough — I last set up Docker 5+ years ago)

In the end-of-task summary, walk through `docker-compose.yml` **line by line**, covering:

- **image:** what an image is vs a container, why pin a major version, why alpine.
- **environment:** what each `POSTGRES_*` variable does, and that they only apply when the data directory is first created (changing them later does nothing without `down -v`).
- **ports:** what `host:container` means, and how it maps to `localhost:5432` in `DATABASE_URL`.
- **volumes:** named volume vs bind mount (we use one of each, and why); where the data lives; why the mount path matters for this Postgres version.
- **init scripts:** how `/docker-entrypoint-initdb.d/` works, when it runs and when it doesn't.
- **healthcheck:** what `pg_isready` checks, what interval/timeout/retries mean, and what "healthy" tells us.
- How each part of `DATABASE_URL` / `TEST_DATABASE_URL` (user, password, host, port, database) comes from this file.
- A short cheat sheet: `up -d`, `ps`, `logs -f db`, `exec db psql ...`, `stop`, `down`, `down -v`, and the difference between the last three.

## Definition of done

- All verify steps pass.
- AGENTS.md and AI_LOG.md updated.
- Do not commit. End with the walkthrough and anything I should review closely.
