# Slim (glibc) rather than alpine so bcrypt's prebuilt binaries work.
FROM node:22-slim AS base
# procps provides `ps`, which `nest start --watch` needs to restart the app on changes.
RUN apt-get update && apt-get install -y --no-install-recommends openssl procps && rm -rf /var/lib/apt/lists/*
# Run as the image's non-root `node` user (uid 1000). In development this also
# keeps files written to the bind mount (dist/) owned by the host user.
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npx prisma generate

# Development: docker-compose bind-mounts the source over /app and
# `nest start --watch` rebuilds on every change.
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000 9229
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:debug"]

FROM base AS build
RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS prod
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
USER node
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
