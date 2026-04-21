import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { healthRoutes } from "./health.js";

describe("health route", () => {
  it("returns 200 with status ok", async () => {
    const app = Fastify();
    await app.register(healthRoutes);
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok" });
  });
});
