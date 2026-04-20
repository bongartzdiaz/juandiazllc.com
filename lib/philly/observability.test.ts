import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SLO, withSpan, withSpanSync } from "./observability";

// When SENTRY_DSN is unset, withSpan must be a transparent pass-through:
// it runs the function, returns the result, and rethrows errors without
// swallowing them. This is the path we hit in every dev/test run.
describe("withSpan (Sentry disabled)", () => {
  const prevDsn = process.env.SENTRY_DSN;
  beforeEach(() => {
    delete process.env.SENTRY_DSN;
  });
  afterEach(() => {
    if (prevDsn) process.env.SENTRY_DSN = prevDsn;
  });

  it("returns the inner result unchanged", async () => {
    const result = await withSpan(
      { name: "test.noop", slo: SLO.LOGIN },
      async () => 42,
    );
    expect(result).toBe(42);
  });

  it("rethrows errors instead of swallowing them", async () => {
    await expect(
      withSpan({ name: "test.throw", slo: SLO.LOGIN }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });

  it("supports synchronous callbacks via withSpanSync", () => {
    const result = withSpanSync({ name: "sync.ok", slo: SLO.LOGIN }, () => "yes");
    expect(result).toBe("yes");
  });

  it("withSpanSync rethrows synchronous errors", () => {
    expect(() =>
      withSpanSync({ name: "sync.err", slo: SLO.LOGIN }, () => {
        throw new Error("sync-boom");
      }),
    ).toThrow("sync-boom");
  });
});

describe("SLO budgets", () => {
  it("are all positive integers (ms)", () => {
    for (const v of Object.values(SLO)) {
      expect(v).toBeGreaterThan(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("exposes expected budgets", () => {
    expect(SLO.LOGIN).toBeLessThan(SLO.CREATE_DEAL * 2);
    expect(SLO.AI_ACTION).toBeGreaterThan(SLO.CREATE_DEAL);
  });
});
