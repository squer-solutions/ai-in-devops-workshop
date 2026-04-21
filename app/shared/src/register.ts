// Preload entry for Node's `--require` flag. Loading the OTel SDK here —
// before any application module — lets auto-instrumentation patch `http`,
// `fs`, `pg`, etc. *before* Fastify pulls them in. Without this, inbound
// HTTP server metrics are never emitted.
//
// Service name comes from OTEL_SERVICE_NAME, set in docker-compose.yml.

import { startOtel } from "./otel.js";

const serviceName = process.env.OTEL_SERVICE_NAME;
if (serviceName) {
  startOtel(serviceName);
}
