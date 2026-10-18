#!/bin/sh
set -eu

conf=/app/lighttpd.conf

sed \
    -e "s/__PROXY_HOST__/${PROXY_HOST:-api}/g" \
    -e "s/__PROXY_PORT__/${PROXY_PORT:-3000}/g" \
    /app/lighttpd.conf.tpl > "$conf"

exec lighttpd -D -f "$conf"
