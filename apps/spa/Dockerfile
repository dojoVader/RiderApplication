FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# Run as the image's non-root `node` user (uid 1000). In development this also
# keeps files Next writes to the bind mount owned by the host user.
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .

# Development: docker-compose bind-mounts the source over /app for Fast Refresh.
FROM base AS dev
# Pre-create .next so the anonymous volume compose mounts here is owned by node.
RUN mkdir -p .next
EXPOSE 3000
CMD ["npx", "next", "dev", "-H", "0.0.0.0", "-p", "3000"]

FROM base AS build
# Baked into the client bundle at build time; nginx proxies /api to the backend.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS prod
WORKDIR /app
USER node
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/next.config.ts ./
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
