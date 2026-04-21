import { describe, it, expect, beforeEach } from "vitest";
import { setMode, getMode, clearMode, ChaosMode } from "./chaos-state.js";

describe("chaos-state", () => {
  beforeEach(() => clearMode());

  it("defaults to no mode", () => {
    expect(getMode()).toBeNull();
  });

  it("stores and returns a mode", () => {
    setMode("slow-db");
    expect(getMode()).toBe("slow-db");
  });

  it("clears a mode", () => {
    setMode("cpu-hog");
    clearMode();
    expect(getMode()).toBeNull();
  });

  it("rejects unknown modes", () => {
    expect(() => setMode("nope" as ChaosMode)).toThrow(/unknown/i);
  });
});
