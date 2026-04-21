# Slot 2 — Build your own MCP + skill

**Goal:** Extend this MCP scaffold to post AI-generated incident analyses into the workshop GitHub Project (#9).

## Starting point

- One working tool: `ping`
- Auth: reads `GITHUB_TOKEN` from environment. Create a PAT with `repo` + `project` scopes at https://github.com/settings/tokens and export it:
  ```bash
  export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
  ```
- One helper: `npm run lookup-ids` — prints the Project v2 node ID and the Status field option IDs. Run this once and hard-code the values in `src/index.ts` (or pass them via env).

## Install

```bash
cd slot2-scaffold
npm install
npm run build
npm run dev   # runs the MCP over stdio; use from OpenCode
```

## What to build

1. **Tool `create_incident_issue`** — creates a GitHub issue on `squer-solutions/ai-in-devops-workshop`.
   - Input: `{ title: string, body: string, severity: "low"|"medium"|"high"|"critical", labels: string[] }`
   - Output: `{ issue_url: string, issue_number: number }`
   - Hint: use `@octokit/rest`:
     ```ts
     import { Octokit } from "@octokit/rest";
     const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
     const issue = await octokit.rest.issues.create({ owner, repo, title, body, labels });
     ```

2. **Tool `add_issue_to_project`** — adds the issue to Project #9 with a Status.
   - Input: `{ issue_url: string, status: "Triage"|"In progress"|"Done" }`
   - GraphQL sequence:
     1. Resolve issue URL to issue node ID: `query { resource(url: $url) { ... on Issue { id } } }`
     2. `addProjectV2ItemById(input: { projectId, contentId })` → returns the new project item ID
     3. `updateProjectV2ItemFieldValue(input: { projectId, itemId, fieldId, value: { singleSelectOptionId } })`
   - `projectId`, `fieldId`, and each status `optionId` come from `npm run lookup-ids`.

3. **Skill** — see `incident-commander.skill.md`. Fill in the orchestration.

## Constraints

- Don't swallow errors. If GitHub returns a 403 or the GraphQL call fails, surface that in the tool's error response.
- Keep it scoped: the workshop only needs these two tools. A third `link_related_incidents` is optional stretch.

## Wiring this MCP into OpenCode

In your OpenCode config, add an entry like:

```json
{
  "mcp": {
    "incident-reporter": {
      "type": "local",
      "command": ["node", "/absolute/path/to/slot2-scaffold/dist/src/index.js"],
      "environment": { "GITHUB_TOKEN": "{env:GITHUB_TOKEN}" },
      "enabled": true
    }
  }
}
```

Rebuild (`npm run build`) after any change.
