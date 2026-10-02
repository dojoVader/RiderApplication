# Rider Application

A ride-hailing app: riders request rides, drivers accept them, and both follow the trip live.

- **Backend:** NestJS + Prisma (PostgreSQL), Socket.IO for live updates, BullMQ + Redis for queues and caching, Firebase Cloud Messaging for push notifications.
- **SPA:** Next.js + Tailwind, with rider and driver dashboards and a push service worker.
- **nginx:** serves both on one origin. `/api/*` goes to the backend, everything else to the SPA.

## Quick start (Docker)

```bash
cp .env.example .env                        # optional: compose defaults (ports, Postgres user)
# Create the two app env files from the matching sections of .env.example:
#   apps/backend/.development.env   (at least SECRET)
#   apps/spa/.env.development
docker compose up --build
```

Open <http://localhost:8080>. Both apps hot-reload on save, migrations run when the backend starts, and a Node debugger listens on port 9229.

## Folder structure

```
.
├── docker-compose.yml        Development stack: nginx, spa, backend, postgres, redis
├── .env.example              Every environment variable, grouped by where it goes
├── firebase/                 Firebase service account key (gitignored, never committed)
└── apps/
    ├── backend/              NestJS API
    │   ├── Dockerfile        Stages: dev (watch mode) and prod (compiled, non-root)
    │   ├── prisma/           schema.prisma, migrations/, seed.ts
    │   ├── prisma.config.ts  Prisma CLI config; builds the DB URL from DB_* vars
    │   └── src/
    │       ├── main.ts       Bootstrap: cookies, CORS, validation, Swagger
    │       ├── app.module.ts Loads .development.env and wires the modules below
    │       ├── dtos/         Request/response shapes (class-validator)
    │       ├── exceptions/   HTTP exceptions
    │       ├── generated/    Prisma client (generated, don't edit)
    │       └── modules/
    │           ├── auth/           Register/login/logout/me, JWT cookie, role guard
    │           ├── rides/          Ride REST API, state machine, Socket.IO gateway, ride cache
    │           ├── notifications/  FCM token registration + push queue processor
    │           ├── firebase/       Firebase Admin (service account from env)
    │           ├── redis/          Shared Redis connection + cache manager
    │           ├── queue/          BullMQ root config
    │           └── prisma/         PrismaService
    ├── spa/                  Next.js frontend
    │   ├── Dockerfile        Stages: dev (next dev) and prod (next start, non-root)
    │   ├── app/              Routes: / (landing), /login, /signup, /dashboard
    │   ├── components/       Rider/driver dashboards, forms, toasts, push banner
    │   ├── lib/              API client, session, rides, Socket.IO, Firebase/push
    │   └── public/
    │       └── firebase-messaging-sw.js   Push service worker
    └── nginx/
        ├── dev.conf          Used by docker-compose (proxies the Next dev server)
        └── nginx.conf        Production config (proxies the prod containers)
```

## Environment variables and secrets

The apps never hard-code secrets. They read every setting from **`process.env`**. Local `.env` files exist only as a development convenience that fills in `process.env`, and they are gitignored and kept out of Docker images.

[`.env.example`](.env.example) lists every variable, grouped by the file it belongs in.

### Development: `.development.env` and `.env.development`

| File | Read by | How it gets into the container |
|---|---|---|
| `.env` (root) | `docker compose`, for the `${...}` values in `docker-compose.yml` | Not copied in; compose reads it on the host |
| `apps/backend/.development.env` | NestJS `ConfigModule` (`envFilePath: '.development.env'` in `app.module.ts`) and Prisma (`prisma.config.ts`) | The source folder is bind-mounted at `/app`, so the file is at `/app/.development.env` |
| `apps/spa/.env.development` | `next dev` | Same: `apps/spa` is bind-mounted at `/app` |

The compose file also sets some variables directly, under each service's `environment:`. Those become real environment variables, and **real environment variables always win over the file**. That is how the containers talk to each other without editing your env files:

```yaml
backend:
  environment:
    DB_HOST: postgres      # overrides DB_HOST=localhost from .development.env
    REDIS_HOST: redis
spa:
  environment:
    NEXT_PUBLIC_API_URL: /api   # same origin through nginx, overrides .env.development
```

So in development, secrets such as `SECRET` and `FIREBASE_SERVICE_ACCOUNT` live in `apps/backend/.development.env`, and only addresses that differ inside Docker are overridden in compose. Restart a container after changing its env file, because variables are read at startup:

```bash
docker compose up -d backend
docker compose exec backend printenv | sort   # what the container actually sees
```

### Production: `process.env` only

Production images contain **no env files**:

- `apps/backend/.dockerignore` excludes `.development.env`, and `apps/spa/.dockerignore` excludes `.env*`, so they are never copied into an image.
- When `ConfigModule` finds no `.development.env`, it uses `process.env` alone, and so does `prisma.config.ts`. No code changes are needed between environments.

Provide the same variable names from your platform instead:

- **Railway:** service → *Variables*. Railway's Redis plugin also sets `REDIS_URL`, which the backend prefers over `REDIS_HOST`/`REDIS_PORT`.
- **Plain Docker:** `docker run --env-file production.env …`, keeping that file outside the repo, or `-e NAME=value`.

Never bake secrets into an image (`COPY .env`, `ENV SECRET=…`) or commit them to `docker-compose.yml`. Anyone who can pull the image or read the repo can read them.

**Backend production variables:** `NODE_ENV=production` (this makes the session cookie HTTPS-only), `SECRET`, `DB_*`, `REDIS_URL` or `REDIS_*`, and `FIREBASE_SERVICE_ACCOUNT`.

**SPA production variables:** `NEXT_PUBLIC_*` values are inlined into the JavaScript bundle by `next build`, so they must be present **when the image is built**, not only when it runs. Pass them as build args:

```bash
docker build --target prod \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=… \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=… \
  …  -t rider-spa apps/spa
```

`NEXT_PUBLIC_API_URL` defaults to `/api`, which matches `apps/nginx/nginx.conf`. Every `NEXT_PUBLIC_*` value ends up in the browser, so only public identifiers belong there. The Firebase web config and the Web Push public key are public; the service account is not.

### The Firebase service account

The Admin SDK key is a JSON file with a private key, so it is passed as one base64 environment variable instead of a file:

```bash
base64 -w0 firebase/<project>-firebase-adminsdk-*.json
# -> paste as FIREBASE_SERVICE_ACCOUNT in .development.env (dev) or your platform's variables (prod)
```

`apps/backend/src/modules/firebase/firebase-credentials.ts` decodes and validates it at startup. The `firebase/` folder and `*firebase-adminsdk*.json` are gitignored.

## Running without Docker

Requires Node 22, PostgreSQL and Redis on localhost.

```bash
# Backend: http://localhost:3000 (Swagger UI at /api)
cd apps/backend
npm ci
npx prisma migrate deploy
npm run start:dev

# SPA: http://localhost:9091 (the backend's CORS setting allows this origin)
cd apps/spa
npm ci
npm run dev
```

Here the SPA calls the backend directly, using `NEXT_PUBLIC_API_URL=http://localhost:3000` from `.env.development`.

## Useful commands

```bash
docker compose logs -f backend                         # backend logs
docker compose exec backend npx prisma migrate dev     # create a migration after editing schema.prisma
docker compose exec backend npx prisma studio          # browse the database
docker compose down                                    # stop (keeps data)
docker compose down -v                                 # stop and delete Postgres/Redis data
```
