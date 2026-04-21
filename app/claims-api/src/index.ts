import { startOtel, createLogger } from "@workshop/shared";
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { chaosRoutes } from "./routes/chaos.js";
import { claimsRoutes } from "./routes/claims.js";
import { startChaosEffects } from "./lib/chaos-effects.js";

startOtel("claims-api");
const log = createLogger("claims-api");

const app = Fastify({ loggerInstance: log });

await app.register(healthRoutes);
await app.register(chaosRoutes);
await app.register(claimsRoutes);

const port = Number(process.env.PORT ?? 8080);
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => log.info({ port }, "claims-api listening"));

startChaosEffects();
