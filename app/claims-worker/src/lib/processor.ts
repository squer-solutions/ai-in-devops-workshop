import type { ClaimJob } from "@workshop/shared";
import { getPool } from "./db.js";
import { getMode } from "./chaos-state.js";

export async function processOne(job: ClaimJob): Promise<void> {
  if (getMode() === "queue-backup") return; // intentionally drop on the floor
  if (getMode() === "slow-db") await new Promise((r) => setTimeout(r, 800));
  const pool = getPool();
  await pool.query(
    `UPDATE claims SET status = $1, updated_at = now() WHERE id = $2`,
    ["approved", job.claimId],
  );
}
