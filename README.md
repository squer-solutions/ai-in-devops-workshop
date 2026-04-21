# AI in DevOps — Hands-On Workshop

A local playground for practicing AI-augmented observability, incident response, and custom MCP development with OpenCode. The whole stack runs on your laptop via Podman.

Two slots of two hours each. By the end you will have:

1. Used AI agents with pre-built MCPs and skills on a real observability stack
2. Customized a skill
3. Built your own TypeScript MCP
4. Posted an AI-generated incident ticket into a real GitHub Project

## Prerequisites

- macOS (Apple Silicon or Intel)
- **Podman 5+** with a running machine (`podman machine list` shows `Currently running`)
- **podman-compose** (`brew install podman-compose`)
- **Node 24** via nvm (`nvm install 24`)
- **Git**, authenticated to push to `squer-solutions`
- **OpenCode** configured for cortecs.ai (set up in the prep session)
- For **Slot 2 only**: a GitHub PAT with `repo` + `project` scopes — create at https://github.com/settings/tokens and:
  ```bash
  export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
  ```

## Setup (~5 min)

```bash
git clone git@github.com:squer-solutions/ai-in-devops-workshop.git
cd ai-in-devops-workshop
cp .env.example .env            # no edits needed for Slot 1
nvm use                         # picks up .nvmrc → Node 24
npm install

cd compose
podman-compose pull             # ~2-3 GB, do this ahead of time
podman-compose up -d
sleep 20
curl http://localhost:8080/health
# → {"status":"ok",...}
open http://localhost:3000       # Grafana (anonymous editor)
```

Point OpenCode at `opencode/opencode.json` via your OpenCode settings.

**If things are slow**, run the lite profile instead:
```bash
podman-compose -f docker-compose.yml -f docker-compose.lite.yml up -d
```

## Slot 1 — Use & customize (2h)

1. Read [`scenarios/scenario-a-checkout-slow.md`](scenarios/scenario-a-checkout-slow.md)
2. Run the [`investigate-latency`](skills/investigate-latency.md) skill against the injected incident
3. Customize the skill (your facilitator will outline options)

## Slot 2 — Build & apply (2h)

1. `cd slot2-scaffold && npm install`
2. Read [`slot2-scaffold/README.md`](slot2-scaffold/README.md)
3. Implement `create_incident_issue` and `add_issue_to_project`
4. Plug your built MCP into OpenCode
5. Use your [`incident-commander`](slot2-scaffold/incident-commander.skill.md) skill during the live drill

## Triggering chaos (facilitator-driven)

```bash
./scenarios/inject.sh claims-api slow-db     # enable a mode
./scenarios/inject.sh claims-api             # clear
./scenarios/inject.sh claims-worker queue-backup
```

Modes: `cpu-hog`, `slow-db`, `memory-leak`, `error-spike`, `queue-backup`, `db-conn-leak`.

## Cleanup

```bash
cd compose
podman-compose down -v
```

## Layout

```
app/                # claims-api + claims-worker (Node/TypeScript)
compose/            # podman-compose stack + observability configs
opencode/           # OpenCode MCP wiring
skills/             # pre-built Slot 1 skills
scenarios/          # chaos injector + scenario briefs
slot2-scaffold/     # starter TypeScript MCP for Slot 2
```

## How the apps work

The sample domain is deliberately small so it's easy to hold in your head. Two TypeScript services, one Postgres DB, one Redis queue.

### Data flow

```
 client ──POST /claims──▶ claims-api ──INSERT──▶ postgres (status=pending)
                             │
                             └──LPUSH──▶ redis (claims:queue)
                                            │
                                            └──BRPOP──▶ claims-worker ──UPDATE──▶ postgres (status=approved)
```

1. A client posts a claim to `claims-api` (`POST /claims`).
2. `claims-api` inserts a row into Postgres with `status='pending'` and enqueues a job on the Redis list `claims:queue`.
3. `claims-worker` blocks on `BRPOP claims:queue`, dequeues a job, and updates the DB row to `status='approved'`.
4. A follow-up `GET /claims/:id` returns the final row.

All three of: `claims-api`, `claims-worker`, Postgres query spans — are instrumented via the OpenTelemetry Node SDK, which auto-patches `http`, `pg`, and `ioredis`. Metrics and traces flow through the OTel collector to Prometheus/Tempo. Logs are JSON lines written to a shared volume; the collector's `filelog` receiver tails them and forwards to Loki.

### `claims-api` — Fastify HTTP service (port 8080)

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness — returns `{status: "ok"}`. Used by dashboards and readiness checks. |
| `POST /claims` | Body `{customerId, amountCents, description}`. Writes to Postgres, enqueues a Redis job, returns `{id, status: "pending"}`. |
| `GET /claims/:id` | Fetches a claim row. |
| `POST /chaos` | Facilitator-only. Body `{mode: "<chaos-mode>"}` turns a failure mode on; empty body clears it. The current mode lives in process memory. |

Every request emits a pino log line with `reqId`, URL, status, and `responseTime` — you'll see these in Loki.

### `claims-worker` — background processor (port 8081, control only)

Runs a `BRPOP` loop on `claims:queue`. For each job, it simulates a "fraud check" (a short computation) and marks the claim `approved`. Emits `"processed"` log lines with the claim ID.

Port 8081 exposes the same `POST /chaos` endpoint so the worker can be targeted independently (e.g. `queue-backup` mode only makes sense on the worker).

### Chaos modes

| Mode | What it does | What you see |
|---|---|---|
| `slow-db` | Adds 800 ms sleep to every request handler | p95 latency doubles; request logs show `responseTime ≈ 800` |
| `error-spike` | ~30% of requests throw mid-handler | 5xx rate climbs; `chaos: random error-spike` lines appear in Loki |
| `cpu-hog` | Burns CPU on every event-loop tick | Container CPU rises; p95 drifts up under load |
| `memory-leak` | Allocates 10 MB/tick, never frees | Container memory climbs linearly; eventually OOMs |
| `queue-backup` | Worker skips jobs on the floor (target `claims-worker`) | `claims:queue` depth grows; claims stay `pending` in the DB |
| `db-conn-leak` | Leaks one pooled connection per request | Slow degradation → `too many connections` errors |

Inject with:

```bash
./scenarios/inject.sh <claims-api|claims-worker> <mode>
./scenarios/inject.sh claims-api               # empty mode = clear
```

### Observability stack

| Service | Role | URL |
|---|---|---|
| `otel-collector` | Single pipeline for metrics, traces, logs | :4318 (OTLP/HTTP) |
| `prometheus` | Scrapes collector's `:8889/metrics` endpoint | http://localhost:9090 |
| `loki` | Log storage, queried via LogQL | http://localhost:3100 |
| `tempo` | Trace storage | http://localhost:3200 |
| `grafana` | Dashboards + unified query UI | http://localhost:3000 (admin / workshop-grafana-admin) |

Dashboards are auto-provisioned under the "Workshop" folder: `App Overview` (HTTP signals + recent logs) and `Services Health` (CPU/memory + worker rate).

### Generating traffic

Dashboards are empty when no traffic is flowing. To see live numbers:

```bash
for i in $(seq 1 60); do
  curl -s -X POST http://localhost:8080/claims \
    -H "content-type: application/json" \
    -d '{"customerId":"c1","amountCents":100,"description":"warmup"}' > /dev/null
  sleep 0.5
done
```

## Grafana MCP — how authentication works

The `grafana` MCP in `opencode/opencode.json` runs the official `docker.io/mcp/grafana` image. It needs to call Grafana's HTTP API to execute PromQL/LogQL/TraceQL. For the workshop we use **HTTP basic auth** with the admin account configured in compose:

```
GRAFANA_USERNAME=admin
GRAFANA_PASSWORD=workshop-grafana-admin
```

Both values are baked into `opencode/opencode.json` — there's nothing to export and no service-account token to generate. This is fine for a local workshop but **don't reuse these creds anywhere real**.

> In production you would instead provision a [Grafana service account](https://grafana.com/docs/grafana/latest/administration/service-accounts/) and pass its token via `GRAFANA_SERVICE_ACCOUNT_TOKEN`. The MCP supports that out of the box; we just don't need it here.

## Help

Ask your facilitator first. For common setup pain points, they have a troubleshooting cheat sheet.
