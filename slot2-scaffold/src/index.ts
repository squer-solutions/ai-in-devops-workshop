// Starter MCP server for Slot 2.
// One working tool: `ping`. Your job: add `create_incident_issue` and
// `add_issue_to_project` — see README.md in this directory.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server(
  { name: "incident-reporter", version: "0.0.1" },
  { capabilities: { tools: {} } },
);

type ToolDef = {
  description: string;
  inputSchema: Record<string, unknown>;
  input: z.ZodTypeAny;
  run: (args: any) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

const tools: Record<string, ToolDef> = {
  ping: {
    description: "Health check. Returns 'pong'.",
    inputSchema: { type: "object", properties: {} },
    input: z.object({}),
    async run() {
      return { content: [{ type: "text", text: "pong" }] };
    },
  },

  // TODO (participants): add `create_incident_issue` here.
  // Input shape: { title, body, severity: "low"|"medium"|"high"|"critical", labels: string[] }
  // Output: { issue_url, issue_number }
  // Hint: use @octokit/rest — octokit.rest.issues.create({ owner, repo, title, body, labels }).

  // TODO (participants): add `add_issue_to_project` here.
  // Input shape: { issue_url, status: "Triage"|"In progress"|"Done" }
  // Steps: resolve issue URL -> node ID (GraphQL `resource(url)`),
  //        then addProjectV2ItemById, then updateProjectV2ItemFieldValue to set Status.
  // Run `npm run lookup-ids` first to get the project node ID and status option IDs.
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Object.entries(tools).map(([name, t]) => ({
    name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools[req.params.name];
  if (!tool) throw new Error(`unknown tool: ${req.params.name}`);
  const args = tool.input.parse(req.params.arguments ?? {});
  return tool.run(args);
});

await server.connect(new StdioServerTransport());
