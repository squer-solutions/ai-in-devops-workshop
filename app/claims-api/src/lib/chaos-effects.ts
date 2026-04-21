import { getMode } from "./chaos-state.js";
import { getPool } from "./db.js";

let memoryLeakBuf: Buffer[] = [];
let leakedConnections: { release: () => void }[] = [];

function cpuHog() {
  const end = Date.now() + 100;
  while (Date.now() < end) {
    Math.sqrt(Math.random() * 999999);
  }
}

async function tick() {
  const mode = getMode();

  if (mode === "cpu-hog") {
    cpuHog();
  }

  if (mode === "memory-leak") {
    memoryLeakBuf.push(Buffer.alloc(10 * 1024 * 1024));
  } else if (memoryLeakBuf.length > 0) {
    memoryLeakBuf = [];
  }

  if (mode === "db-conn-leak") {
    try {
      const client = await getPool().connect();
      leakedConnections.push({ release: () => client.release() });
    } catch {
      // pool exhausted — expected symptom of the mode
    }
  } else if (leakedConnections.length > 0) {
    leakedConnections.forEach((c) => c.release());
    leakedConnections = [];
  }
}

export function startChaosEffects(): NodeJS.Timeout {
  return setInterval(tick, 250);
}
