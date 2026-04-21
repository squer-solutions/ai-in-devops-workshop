export * from "./types.js";
export { createLogger } from "./logger.js";
export { startOtel } from "./otel.js";
// register.ts is the preload entry — exposed so `--require @workshop/shared/dist/register.js`
// resolves cleanly.
