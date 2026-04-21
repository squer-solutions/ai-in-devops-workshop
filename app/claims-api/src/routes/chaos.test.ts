import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import { chaosRoutes } from "./chaos.js";
import { clearMode, getMode } from "../lib/chaos-state.js";

describe("chaos routes", () => {
  beforeEach(() => clearMode());

  it("POST /chaos sets a mode", async () => {
    const app = Fastify();
    await app.register(chaosRoutes);
    const res = await app.inject({
      method: "POST",
      url: "/chaos",
      payload: { mode: "slow-db" },
    });
    expect(res.statusCode).toBe(200);
    expect(getMode()).toBe("slow-db");
  });

  it("POST /chaos rejects unknown modes with 400", async () => {
    const app = Fastify();
    await app.register(chaosRoutes);
    const res = await app.inject({
      method: "POST",
      url: "/chaos",
      payload: { mode: "laser-cats" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /chaos with empty body clears mode", async () => {
    const app = Fastify();
    await app.register(chaosRoutes);
    await app.inject({
      method: "POST",
      url: "/chaos",
      payload: { mode: "cpu-hog" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/chaos",
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(getMode()).toBeNull();
  });
});
