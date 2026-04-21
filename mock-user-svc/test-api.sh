#!/usr/bin/env bash
# Showcases the mock-user-svc HTTP API.
# Usage: ./test-api.sh            # hits localhost:8082
#        BASE_URL=http://host:port ./test-api.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8082}"

hr() { printf '\n────────────────────────────────────────\n'; }
title() { printf '▶ %s\n' "$1"; }

hr
title "GET ${BASE_URL}/users — list all users"
curl -sS "${BASE_URL}/users" | jq .

hr
title "GET ${BASE_URL}/users/u1 — existing user (Alice, admin)"
curl -sS "${BASE_URL}/users/u1" | jq .

hr
title "GET ${BASE_URL}/users/u4 — locked user with no privileges (Dave)"
curl -sS "${BASE_URL}/users/u4" | jq .

hr
title "GET ${BASE_URL}/users/does-not-exist — 404 case"
status=$(curl -sS -o /tmp/mock-user-svc-404-body -w '%{http_code}' "${BASE_URL}/users/does-not-exist")
printf 'HTTP %s\n' "$status"
jq . < /tmp/mock-user-svc-404-body
rm -f /tmp/mock-user-svc-404-body

hr
printf '✓ API smoke test complete\n'
