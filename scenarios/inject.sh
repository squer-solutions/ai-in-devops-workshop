#!/usr/bin/env bash
set -euo pipefail

SERVICE="${1:-claims-api}"
MODE="${2:-}"

case "$SERVICE" in
  claims-api)   PORT=8080 ;;
  claims-worker) PORT=8081 ;;
  *)
    echo "Unknown service: $SERVICE (use claims-api|claims-worker)" >&2
    exit 1
    ;;
esac

if [[ -z "$MODE" ]]; then
  curl -s -X POST "http://localhost:$PORT/chaos" \
    -H "content-type: application/json" \
    -d '{}'
  echo " (cleared)"
  exit 0
fi

curl -s -X POST "http://localhost:$PORT/chaos" \
  -H "content-type: application/json" \
  -d "{\"mode\":\"$MODE\"}"
echo " (injected $MODE on $SERVICE)"
