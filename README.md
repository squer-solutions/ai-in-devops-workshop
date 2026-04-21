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

## Help

Ask your facilitator first. For common setup pain points, they have a troubleshooting cheat sheet.
