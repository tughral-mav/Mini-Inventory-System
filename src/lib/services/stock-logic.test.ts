import { describe, expect, it } from "vitest";
import { computeNewStock, getStockStatus, isLowStock } from "@/lib/services/stock-logic";
import { InsufficientStockError } from "@/lib/errors";

describe("computeNewStock", () => {
  it("increases stock", () => {
    expect(computeNewStock(10, 5)).toBe(15);
  });

  it("decreases stock when sufficient", () => {
    expect(computeNewStock(10, -4)).toBe(6);
  });

  it("allows reaching exactly zero", () => {
    expect(computeNewStock(3, -3)).toBe(0);
  });

  it("prevents negative stock by throwing InsufficientStockError", () => {
    expect(() => computeNewStock(2, -5)).toThrow(InsufficientStockError);
  });

  it("does not mutate when it would go negative (no silent clamping)", () => {
    // The function must throw rather than clamp to 0.
    expect(() => computeNewStock(0, -1)).toThrowError(/Insufficient stock/);
  });
});

describe("getStockStatus", () => {
  it("returns out_of_stock at zero or below", () => {
    expect(getStockStatus(0)).toBe("out_of_stock");
  });

  it("returns low at or below the threshold (5)", () => {
    expect(getStockStatus(1)).toBe("low");
    expect(getStockStatus(5)).toBe("low");
  });

  it("returns in_stock above the threshold", () => {
    expect(getStockStatus(6)).toBe("in_stock");
  });
});

describe("isLowStock", () => {
  it("is true between 1 and 5 inclusive", () => {
    expect(isLowStock(1)).toBe(true);
    expect(isLowStock(5)).toBe(true);
  });
  it("is false at 0 and above 5", () => {
    expect(isLowStock(0)).toBe(false);
    expect(isLowStock(6)).toBe(false);
  });
});
