import type { FastifyInstance } from "fastify";
import { v4 as uuid } from "uuid";
import { getMode } from "../lib/chaos-state.js";
import { getPool } from "../lib/db.js";
import { enqueue } from "../lib/queue.js";

async function applyRequestChaos(): Promise<void> {
  const mode = getMode();
  if (mode === "slow-db") await new Promise((r) => setTimeout(r, 800));
  if (mode === "error-spike" && Math.random() < 0.3) {
    throw new Error("chaos: random error-spike");
  }
}

export async function claimsRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      customerId: string;
      amountCents: number;
      description: string;
    };
  }>("/claims", async (req, reply) => {
    await applyRequestChaos();
    const id = uuid();
    const pool = getPool();
    await pool.query(
      `INSERT INTO claims (id, customer_id, amount_cents, description, status)
       VALUES ($1,$2,$3,$4,'pending')`,
      [id, req.body.customerId, req.body.amountCents, req.body.description],
    );
    await enqueue({ claimId: id, enqueuedAt: new Date().toISOString() });
    reply.code(201);
    return { id, status: "pending" };
  });

  app.get<{ Params: { id: string } }>("/claims/:id", async (req, reply) => {
    await applyRequestChaos();
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, customer_id AS "customerId", amount_cents AS "amountCents",
              description, status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM claims WHERE id = $1`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      reply.code(404);
      return { error: "not found" };
    }
    return result.rows[0];
  });
}
