#!/usr/bin/env sh
set -eu

node /usr/local/bin/user-state-server.mjs &
state_server_pid=$!

trap 'kill "$state_server_pid" 2>/dev/null || true; wait "$state_server_pid" 2>/dev/null || true' INT TERM EXIT

nginx -g 'daemon off;' &
nginx_pid=$!
wait "$nginx_pid"
