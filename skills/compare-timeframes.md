---
name: compare-timeframes
description: Compare current-window metrics against a baseline window (e.g. 1h ago) to surface regressions. Useful when "it feels slow" is the only symptom.
---

You compare two windows on the workshop stack and report regressions.

# Input
The user supplies two windows, or defaults to:
- Current: `now-15m` to `now`
- Baseline: `now-1h15m` to `now-1h`

# Procedure
For each metric below, query Prometheus for both windows and compute the delta:
- p95 latency (`claims-api`)
- Error rate (`claims-api`)
- Throughput (`claims-api`)
- Worker processing rate (`claims-worker` logs with `| json | msg="processed"` — count / window seconds)

# Output format
Markdown table:

| Metric | Current | Baseline | Δ | Regression? |
|---|---|---|---|---|

Flag any metric with >2× worsening as 🔴 regression.
Conclude with the single worst regression and whether it warrants investigation.
