---
name: service-health-check
description: Quick green/red scan of the workshop stack. Reports per-service status using the signals that actually matter for each service — HTTP rate for claims-api, log-derived processed rate for claims-worker — plus a host-level resource snapshot.
---

You are running a 60-second health scan on the workshop stack.

# Before you start — know what each service does

The two services are shaped differently, so the health signals differ.

| Service | What it does | Health signal |
|---|---|---|
| `claims-api` | Fastify HTTP service on port 8080 — handles real user requests | HTTP `http_server_duration_milliseconds_count` rate, p95, 5xx rate |
| `claims-worker` | Background Redis consumer — processes jobs off `claims:queue` | Rate of `"processed"` log lines in Loki. HTTP metrics on :8081 are ONLY for chaos injection; they're expected to be zero. |

Resource metrics (`system_cpu_*`, `system_memory_*`) come from the OTel collector's `hostmetrics` receiver and reflect the **host**, not individual containers. Report them as host-level, and do not blame one service for them.

# Available tools
- `grafana.query_prometheus` — PromQL
- `grafana.query_loki_logs` — LogQL
- `grafana.query_loki_stats` — volume summary for a stream

# Procedure

1. **claims-api HTTP signals** (all over the last 5 min):
   - Throughput: `sum(rate(http_server_duration_milliseconds_count{service_name="claims-api"}[5m]))`
   - p95 latency: `histogram_quantile(0.95, sum(rate(http_server_duration_milliseconds_bucket{service_name="claims-api"}[5m])) by (le))`
   - 5xx rate: `sum(rate(http_server_duration_milliseconds_count{service_name="claims-api",http_status_code=~"5.."}[5m]))`

2. **claims-worker activity** (no HTTP metrics — use logs):
   - Processed rate: `sum(count_over_time({service_name="claims-worker"} |~ "processed" [1m]))`
   - If that's zero, check whether the worker is alive at all: `sum(count_over_time({service_name="claims-worker"}[5m]))`. If that's also zero the worker is silent; if it's non-zero the worker is alive but idle (no jobs coming in — most likely nobody's posting to `claims-api` right now).

3. **Errors across both services** (last 5 min):
   - Any ERROR-level log: `{service_name=~"claims-api|claims-worker"} | json | level="error"` (limit 5)

4. **Host-level resources** (report as host-level, not per-service):
   - CPU activity: `sum(rate(system_cpu_time_seconds_total{state="user"}[1m]))`
   - Memory used: `sum(system_memory_usage_bytes{state="used"}) / 1024 / 1024`

# Output format

Markdown table for the two services:

| Service | Up? | Throughput | p95 | 5xx | Notes |
|---|---|---|---|---|---|

Then a separate one-line "Host resources:" summary with the CPU/memory numbers.

# Interpreting "zero"

- Zero throughput on claims-api at rest is **expected** — the workshop app has no user load except what a participant generates. Don't call this a failure.
- Zero processed rate on claims-worker is **expected** when nobody is posting claims. Only flag it if a participant has just posted claims and the queue is growing.
- Silent 🔴 only when there's a clear failure (5xx > 0, error-level logs present, or a service that should be emitting is not).
