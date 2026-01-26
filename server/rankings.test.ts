import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock context for testing
function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("rankings router", () => {
  describe("rankings.list", () => {
    it("should return empty rankings when no data exists", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.rankings.list({
        countries: ["JP"],
        rankingType: "topgrossing",
        categoryType: "all",
        date: "2024-01-01",
        page: 1,
        pageSize: 20,
      });

      expect(result).toHaveProperty("rankings");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("pageSize");
      expect(result).toHaveProperty("totalPages");
      expect(Array.isArray(result.rankings)).toBe(true);
    });

    it("should accept multiple countries", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.rankings.list({
        countries: ["JP", "US", "GB"],
        rankingType: "topfree",
        categoryType: "games",
        date: "2024-01-01",
        page: 1,
        pageSize: 50,
      });

      expect(result).toHaveProperty("rankings");
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });
  });

  describe("rankings.latestDate", () => {
    it("should return a date string or today's date", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.rankings.latestDate({
        country: "JP",
      });

      expect(result).toHaveProperty("date");
      expect(typeof result.date).toBe("string");
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe("apps router", () => {
  describe("apps.get", () => {
    it("should return null for non-existent app", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apps.get({ id: 999999 });

      expect(result).toBeNull();
    });
  });

  describe("apps.history", () => {
    it("should return empty history for non-existent app", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apps.history({
        appId: 999999,
        country: "JP",
        rankingType: "topgrossing",
        categoryType: "all",
        period: "week",
      });

      expect(result).toHaveProperty("history");
      expect(result).toHaveProperty("stats");
      expect(Array.isArray(result.history)).toBe(true);
      expect(result.history.length).toBe(0);
    });

    it("should accept different period values", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const periods = ["week", "month", "year"] as const;

      for (const period of periods) {
        const result = await caller.apps.history({
          appId: 1,
          country: "US",
          rankingType: "topfree",
          categoryType: "games",
          period,
        });

        expect(result).toHaveProperty("history");
        expect(result).toHaveProperty("stats");
      }
    });
  });
});

describe("constants router", () => {
  it("should return countries", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.constants.countries();

    expect(result).toHaveProperty("JP");
    expect(result).toHaveProperty("US");
    expect(result).toHaveProperty("GB");
    expect(result).toHaveProperty("CN");
    expect(result).toHaveProperty("KR");
    expect(result.JP).toHaveProperty("flag");
    expect(result.JP).toHaveProperty("name");
    expect(result.JP).toHaveProperty("nameJa");
  });

  it("should return ranking types", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.constants.rankingTypes();

    expect(result).toHaveProperty("topgrossing");
    expect(result).toHaveProperty("topfree");
    expect(result).toHaveProperty("toppaid");
  });

  it("should return category types", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.constants.categoryTypes();

    expect(result).toHaveProperty("all");
    expect(result).toHaveProperty("games");
  });

  it("should return app categories", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.constants.categories();

    expect(result).toHaveProperty("6014"); // Games
    expect(result["6014"]).toHaveProperty("name");
    expect(result["6014"]).toHaveProperty("nameJa");
    expect(result["6014"]).toHaveProperty("isGame");
  });
});
