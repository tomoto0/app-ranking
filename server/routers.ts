import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  getRankings, 
  getAppById, 
  getAppRankingHistory, 
  getLatestRankingDate,
  upsertApp,
  upsertRanking,
  getDb,
  searchApps,
  getAppRankingsAcrossCountries
} from "./db";
import { fetchAppleRssFeed, fetchMultipleAppDetails } from "./appleRss";
import { invokeLLM } from "./_core/llm";
import { 
  COUNTRY_CODES, 
  RANKING_TYPE_IDS,
  CATEGORY_TYPE_IDS,
  COUNTRIES, 
  RANKING_TYPES,
  CATEGORY_TYPES,
  APP_CATEGORIES,
  type CountryCode,
  type RankingType,
  type CategoryType
} from "../shared/rankings";
import { apps, rankings } from "../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// Input validation schemas
const rankingQuerySchema = z.object({
  countries: z.array(z.enum(COUNTRY_CODES as [string, ...string[]])).min(1),
  rankingType: z.enum(RANKING_TYPE_IDS as [string, ...string[]]),
  categoryType: z.enum(CATEGORY_TYPE_IDS as [string, ...string[]]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

const appHistorySchema = z.object({
  appId: z.number(),
  country: z.enum(COUNTRY_CODES as [string, ...string[]]),
  rankingType: z.enum(RANKING_TYPE_IDS as [string, ...string[]]),
  categoryType: z.enum(CATEGORY_TYPE_IDS as [string, ...string[]]),
  period: z.enum(["week", "month", "year"]),
});

const fetchRankingsSchema = z.object({
  country: z.enum(COUNTRY_CODES as [string, ...string[]]),
  rankingType: z.enum(RANKING_TYPE_IDS as [string, ...string[]]),
  categoryType: z.enum(CATEGORY_TYPE_IDS as [string, ...string[]]),
});

const trendAnalysisSchema = z.object({
  countries: z.array(z.enum(COUNTRY_CODES as [string, ...string[]])).min(1),
  rankingType: z.enum(RANKING_TYPE_IDS as [string, ...string[]]),
  categoryType: z.enum(CATEGORY_TYPE_IDS as [string, ...string[]]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const comparisonAnalysisSchema = z.object({
  appId: z.number(),
  countries: z.array(z.enum(COUNTRY_CODES as [string, ...string[]])).min(2),
  rankingType: z.enum(RANKING_TYPE_IDS as [string, ...string[]]),
  categoryType: z.enum(CATEGORY_TYPE_IDS as [string, ...string[]]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const searchAppsSchema = z.object({
  query: z.string().min(1).max(100),
  countries: z.array(z.enum(COUNTRY_CODES as [string, ...string[]])).min(1),
  rankingType: z.enum(RANKING_TYPE_IDS as [string, ...string[]]),
  categoryType: z.enum(CATEGORY_TYPE_IDS as [string, ...string[]]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  rankings: router({
    // Get rankings list
    list: publicProcedure
      .input(rankingQuerySchema)
      .query(async ({ input }) => {
        const { countries, rankingType, categoryType, date, page, pageSize } = input;
        const offset = (page - 1) * pageSize;

        const result = await getRankings({
          countries: countries as CountryCode[],
          rankingType: rankingType as RankingType,
          categoryType: categoryType as CategoryType,
          date,
          limit: pageSize,
          offset,
        });

        // Group rankings by app for multi-country comparison
        const appRankingsMap = new Map<string, {
          app: typeof result.rankings[0]["app"];
          rankings: Record<string, number>;
        }>();

        for (const item of result.rankings) {
          const key = item.app.appStoreId;
          if (!appRankingsMap.has(key)) {
            appRankingsMap.set(key, {
              app: item.app,
              rankings: {},
            });
          }
          appRankingsMap.get(key)!.rankings[item.ranking.country] = item.ranking.rank;
        }

        // Convert to array and sort by first country's rank
        const groupedRankings = Array.from(appRankingsMap.values()).sort((a, b) => {
          const aRank = Math.min(...Object.values(a.rankings));
          const bRank = Math.min(...Object.values(b.rankings));
          return aRank - bRank;
        });

        return {
          rankings: groupedRankings,
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        };
      }),

    // Get latest available date
    latestDate: publicProcedure
      .input(z.object({ country: z.enum(COUNTRY_CODES as [string, ...string[]]) }))
      .query(async ({ input }) => {
        const date = await getLatestRankingDate(input.country as CountryCode);
        return { date: date || new Date().toISOString().split('T')[0] };
      }),

    // Fetch fresh rankings from Apple RSS
    fetch: publicProcedure
      .input(fetchRankingsSchema)
      .mutation(async ({ input }) => {
        const { country, rankingType, categoryType } = input;
        const today = new Date().toISOString().split('T')[0];

        try {
          // Fetch from Apple RSS
          const fetchedApps = await fetchAppleRssFeed(
            country as CountryCode,
            rankingType as RankingType,
            categoryType as CategoryType,
            100
          );

          if (fetchedApps.length === 0) {
            return { success: false, message: "No data fetched from Apple RSS", count: 0 };
          }

          // Fetch detailed app info from iTunes
          const appStoreIds = fetchedApps.map(app => app.appStoreId);
          const detailedApps = await fetchMultipleAppDetails(appStoreIds, country as CountryCode);

          // Save to database
          for (const fetchedApp of fetchedApps) {
            const details = detailedApps.get(fetchedApp.appStoreId);
            
            const appId = await upsertApp({
              appStoreId: fetchedApp.appStoreId,
              bundleId: details?.bundleId,
              name: details?.trackName || fetchedApp.name,
              artistName: details?.artistName || fetchedApp.artistName,
              artworkUrl100: details?.artworkUrl100 || fetchedApp.artworkUrl100,
              artworkUrl512: details?.artworkUrl512,
              summary: details?.description?.substring(0, 500),
              categoryId: fetchedApp.categoryId || String(details?.primaryGenreId),
              price: String(details?.price || 0),
              currency: details?.currency || "USD",
              releaseDate: details?.releaseDate ? new Date(details.releaseDate) : null,
              averageRating: details?.averageUserRating ? String(details.averageUserRating) : null,
              ratingCount: details?.userRatingCount || 0,
              country,
            });

            if (appId) {
              await upsertRanking({
                appId,
                country,
                rankingType: rankingType as "topgrossing" | "topfree" | "toppaid",
                categoryType: categoryType as "all",
                rank: fetchedApp.rank,
                rankDate: new Date(today),
              });
            }
          }

          return { success: true, message: "Rankings fetched successfully", count: fetchedApps.length };
        } catch (error) {
          console.error("Failed to fetch rankings:", error);
          return { success: false, message: "Failed to fetch rankings", count: 0 };
        }
      }),

    // Fetch all rankings for all countries
    fetchAll: publicProcedure.mutation(async () => {
      const results: { country: string; rankingType: string; categoryType: string; success: boolean; count: number }[] = [];
      
      for (const country of COUNTRY_CODES) {
        for (const rankingType of RANKING_TYPE_IDS) {
          for (const categoryType of ["all"] as const) {
            const today = new Date().toISOString().split('T')[0];
            
            try {
              const fetchedApps = await fetchAppleRssFeed(
                country as CountryCode,
                rankingType as RankingType,
                categoryType,
                100
              );

              if (fetchedApps.length > 0) {
                const appStoreIds = fetchedApps.map(app => app.appStoreId);
                const detailedApps = await fetchMultipleAppDetails(appStoreIds, country as CountryCode);

                for (const fetchedApp of fetchedApps) {
                  const details = detailedApps.get(fetchedApp.appStoreId);
                  
                  const appId = await upsertApp({
                    appStoreId: fetchedApp.appStoreId,
                    bundleId: details?.bundleId,
                    name: details?.trackName || fetchedApp.name,
                    artistName: details?.artistName || fetchedApp.artistName,
                    artworkUrl100: details?.artworkUrl100 || fetchedApp.artworkUrl100,
                    artworkUrl512: details?.artworkUrl512,
                    summary: details?.description?.substring(0, 500),
                    categoryId: fetchedApp.categoryId || String(details?.primaryGenreId),
                    price: String(details?.price || 0),
                    currency: details?.currency || "USD",
                    releaseDate: details?.releaseDate ? new Date(details.releaseDate) : null,
                    averageRating: details?.averageUserRating ? String(details.averageUserRating) : null,
                    ratingCount: details?.userRatingCount || 0,
                    country,
                  });

                  if (appId) {
                    await upsertRanking({
                      appId,
                      country,
                      rankingType: rankingType as "topgrossing" | "topfree" | "toppaid",
                      categoryType,
                      rank: fetchedApp.rank,
                      rankDate: new Date(today),
                    });
                  }
                }
              }

              results.push({ country, rankingType, categoryType, success: true, count: fetchedApps.length });
            } catch (error) {
              results.push({ country, rankingType, categoryType, success: false, count: 0 });
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      return { results };
    }),
  }),

  apps: router({
    // Get app details
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const app = await getAppById(input.id);
        if (!app) {
          return null;
        }

        // Get category info
        const categoryInfo = app.categoryId ? APP_CATEGORIES[app.categoryId] : null;

        return {
          ...app,
          categoryName: categoryInfo?.name,
          categoryNameJa: categoryInfo?.nameJa,
        };
      }),

    // Get app ranking history
    history: publicProcedure
      .input(appHistorySchema)
      .query(async ({ input }) => {
        const { appId, country, rankingType, categoryType, period } = input;

        // Calculate date range based on period
        const endDate = new Date();
        const startDate = new Date();
        
        switch (period) {
          case "week":
            startDate.setDate(endDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(endDate.getMonth() - 1);
            break;
          case "year":
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        }

        const history = await getAppRankingHistory({
          appId,
          country: country as CountryCode,
          rankingType: rankingType as RankingType,
          categoryType: categoryType as CategoryType,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

        return {
          history: history.map(r => ({
            date: r.rankDate,
            rank: r.rank,
          })),
          stats: {
            highestRank: history.length > 0 ? Math.min(...history.map(r => r.rank)) : null,
            lowestRank: history.length > 0 ? Math.max(...history.map(r => r.rank)) : null,
            averageRank: history.length > 0 
              ? Math.round(history.reduce((sum, r) => sum + r.rank, 0) / history.length * 10) / 10 
              : null,
          },
        };
      }),
    // Search apps by name
    search: publicProcedure
      .input(searchAppsSchema)
      .query(async ({ input }) => {
        const { query, countries, rankingType, categoryType, date } = input;

        // Search apps in database
        const foundApps = await searchApps({
          query,
          countries: countries as CountryCode[],
          limit: 50,
        });

        if (foundApps.length === 0) {
          return { results: [] };
        }

        // Get unique appStoreIds and fetch their rankings across countries
        const uniqueAppStoreIds = Array.from(new Set(foundApps.map(a => a.appStoreId)));
        
        const results = await Promise.all(
          uniqueAppStoreIds.slice(0, 20).map(async (appStoreId) => {
            const data = await getAppRankingsAcrossCountries({
              appStoreId,
              countries: countries as CountryCode[],
              rankingType: rankingType as RankingType,
              categoryType: categoryType as CategoryType,
              date,
            });
            return data;
          })
        );

        return {
          results: results.filter(r => r.app !== null),
        };
      }),
  }),

  analysis: router({
    // Trend analysis using LLM
    trends: publicProcedure
      .input(trendAnalysisSchema)
      .mutation(async ({ input }) => {
        const { countries, rankingType, categoryType, date } = input;

        // Get top 20 apps for each country
        const result = await getRankings({
          countries: countries as CountryCode[],
          rankingType: rankingType as RankingType,
          categoryType: categoryType as CategoryType,
          date,
          limit: 20,
          offset: 0,
        });

        if (result.rankings.length === 0) {
          return { analysis: "No ranking data available for the selected criteria." };
        }

        // Prepare data for LLM
        const rankingData = result.rankings.map(r => ({
          rank: r.ranking.rank,
          country: COUNTRIES[r.ranking.country as CountryCode].name,
          appName: r.app.name,
          category: r.app.categoryId ? APP_CATEGORIES[r.app.categoryId]?.name : "Unknown",
          artistName: r.app.artistName,
        }));

        const countryNames = countries.map(c => COUNTRIES[c as CountryCode].name).join(", ");
        const rankingTypeName = RANKING_TYPES[rankingType as RankingType].name;
        const categoryTypeName = CATEGORY_TYPES[categoryType as CategoryType].name;

        const countryNamesJa = countries.map(c => COUNTRIES[c as CountryCode].nameJa).join("・");
        const rankingTypeNameJa = RANKING_TYPES[rankingType as RankingType].nameJa;
        const categoryTypeNameJa = CATEGORY_TYPES[categoryType as CategoryType].nameJa;

        const prompt = `以下は${date}時点の${countryNamesJa}におけるApp Store「${rankingTypeNameJa}」ランキング（${categoryTypeNameJa}カテゴリ）のデータです。

ランキングデータ:
${JSON.stringify(rankingData, null, 2)}

以下の観点で分析してください（日本語で回答）:
1. 上位にランクインしているアプリの特徴と傾向
2. 注目すべきパターンやトレンド
3. 各国の市場の好みに関する興味深い洞察

200〜300文字程度で、簡潔かつ洞察に富んだ分析をお願いします。`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "あなたは各国のApp Storeトレンドを専門とするアプリ市場アナリストです。データに基づいた洞察力のある分析を日本語で提供してください。" },
              { role: "user", content: prompt },
            ],
          });

          return { analysis: response.choices[0]?.message?.content || "Analysis unavailable." };
        } catch (error) {
          console.error("LLM analysis failed:", error);
          return { analysis: "Unable to generate analysis at this time." };
        }
      }),

    // Cross-country comparison for a specific app
    comparison: publicProcedure
      .input(comparisonAnalysisSchema)
      .mutation(async ({ input }) => {
        const { appId, countries, rankingType, categoryType, date } = input;

        const app = await getAppById(appId);
        if (!app) {
          return { analysis: "App not found." };
        }

        // Get rankings for this app across countries
        const db = await getDb();
        if (!db) {
          return { analysis: "Database unavailable." };
        }

        const rankingsData = await db
          .select()
          .from(rankings)
          .where(
            and(
              eq(rankings.appId, appId),
              inArray(rankings.country, countries),
              eq(rankings.rankingType, rankingType as "topgrossing" | "topfree" | "toppaid"),
              eq(rankings.categoryType, categoryType as "all"),
              eq(rankings.rankDate, new Date(date))
            )
          );

        const rankingsByCountry = rankingsData.map(r => ({
          country: COUNTRIES[r.country as CountryCode].name,
          rank: r.rank,
        }));

        const countryNames = countries.map(c => COUNTRIES[c as CountryCode].name).join(", ");
        const rankingTypeName = RANKING_TYPES[rankingType as RankingType].name;

        const prompt = `Analyze why the app "${app.name}" by ${app.artistName} has different rankings across countries.

App Details:
- Name: ${app.name}
- Developer: ${app.artistName}
- Category: ${app.categoryId ? APP_CATEGORIES[app.categoryId]?.name : "Unknown"}
- Description: ${app.summary || "Not available"}

Rankings by Country (${rankingTypeName}):
${JSON.stringify(rankingsByCountry, null, 2)}

Please analyze:
1. Why this app might perform differently in each market
2. Cultural or market factors that could explain the ranking differences
3. Potential opportunities or challenges for this app in each market

Keep the analysis concise but insightful, around 200-300 words.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are an expert app market analyst specializing in cross-cultural app performance analysis. Provide insightful comparisons based on market characteristics." },
              { role: "user", content: prompt },
            ],
          });

          return { analysis: response.choices[0]?.message?.content || "Analysis unavailable." };
        } catch (error) {
          console.error("LLM comparison failed:", error);
          return { analysis: "Unable to generate comparison at this time." };
        }
      }),
  }),

  // Constants for frontend
  constants: router({
    countries: publicProcedure.query(() => COUNTRIES),
    rankingTypes: publicProcedure.query(() => RANKING_TYPES),
    categoryTypes: publicProcedure.query(() => CATEGORY_TYPES),
    categories: publicProcedure.query(() => APP_CATEGORIES),
  }),
});

export type AppRouter = typeof appRouter;
