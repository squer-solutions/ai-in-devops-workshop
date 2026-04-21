import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearMode, setMode } from "./chaos-state.js";

const pgQuery = vi.fn();
vi.mock("./db.js", () => ({
  getPool: () => ({ query: (...args: unknown[]) => pgQuery(...args) }),
}));

import { processOne } from "./processor.js";

describe("processor.processOne", () => {
  beforeEach(() => {
    clearMode();
    pgQuery.mockReset();
    pgQuery.mockResolvedValue({ rowCount: 1 });
  });

  it("marks claim as approved", async () => {
    await processOne({
      claimId: "abc",
      enqueuedAt: new Date().toISOString(),
    });
    expect(pgQuery).toHaveBeenCalled();
    const lastCall = pgQuery.mock.calls.at(-1)!;
    expect(String(lastCall[0])).toContain("UPDATE claims");
    expect(lastCall[1]).toContain("approved");
  });

  it("under queue-backup mode, processOne skips work", async () => {
    setMode("queue-backup");
    await processOne({
      claimId: "abc",
      enqueuedAt: new Date().toISOString(),
    });
    expect(pgQuery).not.toHaveBeenCalled();
  });
});
