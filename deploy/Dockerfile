FROM node:22-alpine AS build

RUN npm install --global pnpm@10.12.4 --silent
RUN apk add --no-cache bash ffmpeg git
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json README.md ./
COPY apps ./apps
COPY packages ./packages
COPY benchmarks ./benchmarks
COPY docs ./docs
COPY evaluation ./evaluation
COPY deploy ./deploy

RUN pnpm install --frozen-lockfile
RUN pnpm check

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache ffmpeg su-exec
COPY --from=build --chown=node:node /app /app
RUN chmod -R a+rX /app/apps/admin-web/dist

USER node
EXPOSE 8080
CMD ["node", "apps/api/dist/server.js"]
