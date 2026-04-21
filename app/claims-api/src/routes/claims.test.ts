import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import { setMode, clearMode } from "../lib/chaos-state.js";

// Mock DB + queue so this stays a unit test.
vi.mock("../lib/db.js", () => ({
  getPool: () => ({
    query: vi.fn(async () => ({ rows: [{ id: "abc", status: "pending" }] })),
  }),
}));
vi.mock("../lib/queue.js", () => ({
  enqueue: vi.fn(async () => undefined),
}));

import { claimsRoutes } from "./claims.js";

describe("claims route", () => {
  beforeEach(() => clearMode());

  it("POST /claims returns 201 with a claim id", async () => {
    const app = Fastify();
    await app.register(claimsRoutes);
    const res = await app.inject({
      method: "POST",
      url: "/claims",
      payload: { customerId: "c1", amountCents: 500, description: "bump" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toHaveProperty("id");
  });

  it("POST /claims returns 500 ~30% of the time under error-spike", async () => {
    setMode("error-spike");
    const app = Fastify();
    await app.register(claimsRoutes);
    let errors = 0;
    for (let i = 0; i < 200; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/claims",
        payload: { customerId: "c1", amountCents: 500, description: "x" },
      });
      if (res.statusCode === 500) errors++;
    }
    expect(errors).toBeGreaterThan(30);
    expect(errors).toBeLessThan(100);
  });
});
