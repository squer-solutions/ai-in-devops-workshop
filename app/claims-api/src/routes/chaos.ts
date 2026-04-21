import type { FastifyInstance } from "fastify";
import {
  CHAOS_MODES,
  ChaosMode,
  setMode,
  getMode,
  clearMode,
} from "../lib/chaos-state.js";

export async function chaosRoutes(app: FastifyInstance) {
  app.post<{ Body: { mode?: string } }>("/chaos", async (req, reply) => {
    const { mode } = req.body ?? {};
    if (!mode) {
      clearMode();
      return { mode: null };
    }
    if (!CHAOS_MODES.includes(mode as ChaosMode)) {
      reply.code(400);
      return { error: `unknown mode: ${mode}`, valid: CHAOS_MODES };
    }
    setMode(mode as ChaosMode);
    return { mode };
  });

  app.get("/chaos", async () => ({ mode: getMode() }));
}
