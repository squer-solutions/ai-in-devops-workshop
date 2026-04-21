// OTel SDK is preloaded via `node --require @workshop/shared/dist/register.js`.
// See claims-api/src/index.ts for the explanation.
import { Redis } from "ioredis";
import type { ClaimJob } from "@workshop/shared";
import { createLogger } from "@workshop/shared";
import { processOne } from "./lib/processor.js";
import Fastify from "fastify";
import {
  getMode,
  setMode,
  clearMode,
  CHAOS_MODES,
  ChaosMode,
} from "./lib/chaos-state.js";

const log = createLogger("claims-worker");

const redis = new Redis(process.env.REDIS_URL ?? "redis://redis:6379");

async function loop() {
  while (true) {
    try {
      const msg = await redis.brpop("claims:queue", 1);
      if (!msg) continue;
      const job = JSON.parse(msg[1]) as ClaimJob;
      await processOne(job);
      log.info({ claimId: job.claimId }, "processed");
    } catch (err) {
      log.error({ err }, "process error");
    }
  }
}

const ctrl = Fastify({ loggerInstance: log });

ctrl.post<{ Body: { mode?: string } }>("/chaos", async (req, reply) => {
  const { mode } = req.body ?? {};
  if (!mode) {
    clearMode();
    return { mode: null };
  }
  if (!CHAOS_MODES.includes(mode as ChaosMode)) {
    reply.code(400);
    return { error: "unknown" };
  }
  setMode(mode as ChaosMode);
  return { mode };
});

ctrl.get("/health", async () => ({ status: "ok", mode: getMode() }));

const port = Number(process.env.PORT ?? 8081);
ctrl
  .listen({ port, host: "0.0.0.0" })
  .then(() => log.info({ port }, "claims-worker control port listening"));

loop();
