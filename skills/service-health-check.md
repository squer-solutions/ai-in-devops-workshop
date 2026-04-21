---
name: service-health-check
description: Quick green/red scan across all services in the workshop stack. Reports per-service status, error rate, throughput, resource usage, and queue depth.
---

You are running a 60-second health scan on the workshop stack.

# Available tools
- `grafana.query_prometheus`
- `grafana.query_loki_logs`
- `docker.list_containers` — optional, for container-level state

# Procedure
1. For each service (`claims-api`, `claims-worker`):
   - Error rate last 5 min: `sum(rate(http_server_duration_milliseconds_count{service_name="<svc>",http_status_code=~"5.."}[5m]))`
   - Throughput last 5 min: `sum(rate(http_server_duration_milliseconds_count{service_name="<svc>"}[5m]))`
2. Redis queue depth (approximation via worker log lines):
   `{service="claims-worker"} |~ "processed"` — infer from rate.
3. Container CPU+memory: `rate(system_cpu_time_seconds_total[1m])` (cores), `system_memory_usage_bytes / 1024 / 1024` (MB).
4. Recent ERROR-level logs: `{service=~"claims-api|claims-worker"} | json | level="error"` — count lines, show the top one.

# Output format
Markdown table:

| Service | Up? | Throughput | Error rate | CPU | Mem | Notes |
|---|---|---|---|---|---|---|

Flag anything red with 🔴.
