# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build && pnpm prune --prod

FROM node:22-bookworm-slim AS runtime

ARG APP_PORT=3001

ENV NODE_ENV=production
ENV RESUME_API_PORT=$APP_PORT

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./package.json

EXPOSE $APP_PORT

CMD ["node_modules/.bin/tsx", "server/index.ts"]
