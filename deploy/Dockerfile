FROM node:22-alpine AS build

RUN npm install --global pnpm@10.12.4 --silent
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache ffmpeg su-exec
COPY --from=build --chown=node:node /app /app

USER node
EXPOSE 8080
CMD ["node", "apps/api/dist/server.js"]
