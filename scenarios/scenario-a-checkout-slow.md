# Scenario A — "Checkout is slow"

## Alert
> PagerDuty: `claims-api` p95 latency has crossed 1500ms over the last 5 minutes. Customer complaints rising.

## Your job
Use the `investigate-latency` skill (or call the MCP tools directly) to find the cause and file a short report.

## What you can touch
- The OpenCode agent (uses `mcp-grafana` + `docker` MCP)
- Grafana: http://localhost:3000 (anonymous editor access)
- Your local shell (podman, curl)

## What you CAN'T touch
- The `claims-api` source code (you're triaging, not debugging the code)
- The chaos injector (the instructor is driving that)

## Deliverable
A 4-section report: Window / Symptoms / Evidence / Hypothesis + confidence.
