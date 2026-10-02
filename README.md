# Rider Application

Riders request rides, drivers accept them, and both follow the trip live.

- **Backend:** NestJS, Prisma (PostgreSQL), Socket.IO, BullMQ + Redis, Firebase Cloud Messaging.
- **SPA:** Next.js + Tailwind, with rider/driver dashboards and a push service worker.
- **nginx:** one origin for both: `/api/*` → backend, everything else → SPA.

## Quick start

```bash
cp .env.example .env    # optional compose overrides
# create apps/backend/.development.env and apps/spa/.env.development
# from the matching sections of .env.example (at minimum SECRET)
docker compose up --build
```

Open <http://localhost:8080>. Both apps hot-reload, migrations run on backend start, and a debugger listens on port 9229.

## Structure

```
docker-compose.yml   dev stack: nginx, spa, backend, postgres, redis
.env.example         every env var, grouped by the file it belongs in
firebase/            service account key (gitignored)
apps/
  backend/           NestJS API (Dockerfile: dev + prod stages)
    prisma/          schema, migrations, seed
    src/modules/     auth, rides (REST + gateway + cache), notifications,
                     firebase, redis, queue, prisma
  spa/               Next.js (Dockerfile: dev + prod stages)
    app/             /, /login, /signup, /dashboard
    components/ lib/ UI, API client, session, sockets, push
    public/firebase-messaging-sw.js
  nginx/             dev.conf (compose), nginx.conf (production)
```

## Environment and secrets

Both apps read everything from `process.env`. Env files only fill it in during development; they're gitignored and kept out of Docker images.

**Development:** each app's folder is bind-mounted into its container, so the env files are read from there:

| File | Read by |
|---|---|
| `.env` | `docker compose` (the `${...}` values) |
| `apps/backend/.development.env` | NestJS `ConfigModule` and `prisma.config.ts` |
| `apps/spa/.env.development` | `next dev` |

The `environment:` entries in `docker-compose.yml` are real environment variables, so they override the files. That is how `DB_HOST=postgres`, `REDIS_HOST=redis` and `NEXT_PUBLIC_API_URL=/api` take effect. After editing an env file, restart that container with `docker compose up -d <service>`.

**Production:** `.dockerignore` excludes the env files, so the images contain none. With no file to load, the backend reads `process.env` alone. Set the variables on the platform instead (Render/Railway variables, or `docker run --env-file`), and never `COPY` env files or bake secrets in with `ENV`.

- **Backend:** `NODE_ENV=production`, `SECRET`, `DB_*`, `REDIS_URL` (or `REDIS_*`), `FIREBASE_SERVICE_ACCOUNT`.
- **SPA:** `NEXT_PUBLIC_*` values are inlined into the bundle by `next build`, so supply them as **build args** (`--build-arg …`). They reach the browser, so only public values belong there.

**Firebase service account:** passed as one base64 variable, never as a file:

```bash
base64 -w0 firebase/<project>-firebase-adminsdk-*.json   # → FIREBASE_SERVICE_ACCOUNT
```

## Without Docker

Requires Node 22, PostgreSQL and Redis on localhost.

```bash
cd apps/backend && npm ci && npx prisma migrate deploy && npm run start:dev   # :3000, Swagger at /api
cd apps/spa && npm ci && npm run dev                                         # :9091
```

## Commands

```bash
docker compose logs -f backend
docker compose exec backend npx prisma migrate dev   # after editing schema.prisma
docker compose down -v                               # stop and delete data
```
