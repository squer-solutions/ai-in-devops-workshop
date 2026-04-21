import { startOtel, createLogger } from "@workshop/shared";
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { chaosRoutes } from "./routes/chaos.js";
import { claimsRoutes } from "./routes/claims.js";
import { startChaosEffects } from "./lib/chaos-effects.js";

const log = createLogger("claims-api");
startOtel("claims-api");

const app = Fastify({ logger: false });

await app.register(healthRoutes);
await app.register(chaosRoutes);
await app.register(claimsRoutes);

const port = Number(process.env.PORT ?? 8080);
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => log.info({ port }, "claims-api listening"));

startChaosEffects();
