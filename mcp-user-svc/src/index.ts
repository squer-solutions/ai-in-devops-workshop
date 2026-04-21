#!/usr/bin/env node
/**
 * MCP server for the mock-user-svc API (http://localhost:8082).
 *
 * Exposes two tools:
 *   - listUsers        – GET /users
 *   - getUserById      – GET /users/{id}
 *
 * Transport: stdio (compatible with any MCP client that spawns a subprocess).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env["USER_SVC_URL"] ?? "http://localhost:8082";

// ---------------------------------------------------------------------------
// Shared types (mirroring openapi.yaml)
// ---------------------------------------------------------------------------

interface User {
  user_id: string;
  firstname: string;
  lastname: string;
  privileges: string[];
  is_active: boolean;
  is_locked: boolean;
}

interface NotFoundError {
  error: "not found";
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(
      `HTTP ${res.status} from ${url}: ${body["error"] ?? res.statusText}`
    );
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "mock-user-svc",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Tool: listUsers
// ---------------------------------------------------------------------------

server.tool(
  "listUsers",
  "List all users in the in-memory user directory. Returns an array of user objects.",
  async () => {
    const users = await apiFetch<User[]>("/users");

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(users, null, 2),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: getUserById
// ---------------------------------------------------------------------------

server.tool(
  "getUserById",
  "Fetch a single user by their user_id (e.g. 'u1'). Returns the user object or an error if not found.",
  { id: z.string().describe("The user_id of the user to fetch, e.g. 'u1'") },
  async ({ id }) => {
    try {
      const user = await apiFetch<User>(`/users/${encodeURIComponent(id)}`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
