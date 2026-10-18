# ---- build stage: bun installs deps and builds the static SPA ----
FROM docker.io/oven/bun:1.3 AS build
WORKDIR /src

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ---- runtime stage: lighttpd serves the SPA and proxies /api ----
FROM docker.io/library/alpine:3.22
RUN apk add --no-cache lighttpd

COPY --from=build /src/dist /app/html
COPY container/lighttpd.conf /app/lighttpd.conf.tpl
COPY container/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# AskOwl API location (compose service name / container name on the shared
# network). Override at runtime: -e PROXY_HOST=... -e PROXY_PORT=...
ENV PROXY_HOST=api \
    PROXY_PORT=3000

EXPOSE 80
ENTRYPOINT ["/app/entrypoint.sh"]
