import { Redis } from "ioredis";
import type { ClaimJob } from "@workshop/shared";

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://redis:6379");
  }
  return client;
}

export async function enqueue(job: ClaimJob): Promise<void> {
  await getClient().lpush("claims:queue", JSON.stringify(job));
}

export async function queueDepth(): Promise<number> {
  return getClient().llen("claims:queue");
}
