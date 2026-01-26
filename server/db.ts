import { eq, and, inArray, desc, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, apps, rankings, categories, InsertApp, InsertRanking, App, Ranking } from "../drizzle/schema";
import { ENV } from './_core/env';
import { CountryCode, RankingType, CategoryType } from "../shared/rankings";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User functions
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// App functions
export async function upsertApp(app: InsertApp): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Try to find existing app
    const existing = await db
      .select({ id: apps.id })
      .from(apps)
      .where(and(eq(apps.appStoreId, app.appStoreId), eq(apps.country, app.country)))
      .limit(1);

    if (existing.length > 0) {
      // Update existing app
      await db
        .update(apps)
        .set({
          name: app.name,
          artistName: app.artistName,
          artworkUrl100: app.artworkUrl100,
          artworkUrl512: app.artworkUrl512,
          summary: app.summary,
          categoryId: app.categoryId,
          price: app.price,
          currency: app.currency,
          releaseDate: app.releaseDate,
          averageRating: app.averageRating,
          ratingCount: app.ratingCount,
        })
        .where(eq(apps.id, existing[0].id));
      return existing[0].id;
    } else {
      // Insert new app
      const result = await db.insert(apps).values(app);
      return result[0].insertId;
    }
  } catch (error) {
    console.error("[Database] Failed to upsert app:", error);
    return null;
  }
}

export async function getAppById(id: number): Promise<App | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(apps).where(eq(apps.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAppByStoreId(appStoreId: string, country: string): Promise<App | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(apps)
    .where(and(eq(apps.appStoreId, appStoreId), eq(apps.country, country)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Ranking functions
export async function upsertRanking(ranking: InsertRanking): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .insert(rankings)
      .values(ranking)
      .onDuplicateKeyUpdate({
        set: {
          rank: ranking.rank,
        },
      });
  } catch (error) {
    console.error("[Database] Failed to upsert ranking:", error);
  }
}

export interface RankingWithApp {
  ranking: Ranking;
  app: App;
}

export async function getRankings(params: {
  countries: CountryCode[];
  rankingType: RankingType;
  categoryType: CategoryType;
  date: string;
  limit: number;
  offset: number;
}): Promise<{ rankings: RankingWithApp[]; total: number }> {
  const db = await getDb();
  if (!db) return { rankings: [], total: 0 };

  const { countries, rankingType, categoryType, date, limit, offset } = params;

  try {
    // Get rankings with app data - use DATE() function for proper date comparison
    const results = await db
      .select({
        ranking: rankings,
        app: apps,
      })
      .from(rankings)
      .innerJoin(apps, eq(rankings.appId, apps.id))
      .where(
        and(
          inArray(rankings.country, countries),
          eq(rankings.rankingType, rankingType),
          eq(rankings.categoryType, categoryType),
          sql`DATE(${rankings.rankDate}) = ${date}`
        )
      )
      .orderBy(rankings.rank)
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(rankings)
      .where(
        and(
          inArray(rankings.country, countries),
          eq(rankings.rankingType, rankingType),
          eq(rankings.categoryType, categoryType),
          sql`DATE(${rankings.rankDate}) = ${date}`
        )
      );

    return {
      rankings: results,
      total: countResult[0]?.count ?? 0,
    };
  } catch (error) {
    console.error("[Database] Failed to get rankings:", error);
    return { rankings: [], total: 0 };
  }
}

export async function getAppRankingHistory(params: {
  appId: number;
  country: CountryCode;
  rankingType: RankingType;
  categoryType: CategoryType;
  startDate: string;
  endDate: string;
}): Promise<Ranking[]> {
  const db = await getDb();
  if (!db) return [];

  const { appId, country, rankingType, categoryType, startDate, endDate } = params;

  try {
    const results = await db
      .select()
      .from(rankings)
      .where(
        and(
          eq(rankings.appId, appId),
          eq(rankings.country, country),
          eq(rankings.rankingType, rankingType),
          eq(rankings.categoryType, categoryType),
          gte(rankings.rankDate, new Date(startDate)),
          lte(rankings.rankDate, new Date(endDate))
        )
      )
      .orderBy(rankings.rankDate);

    return results;
  } catch (error) {
    console.error("[Database] Failed to get ranking history:", error);
    return [];
  }
}

export async function getLatestRankingDate(country: CountryCode): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select({ rankDate: rankings.rankDate })
      .from(rankings)
      .where(eq(rankings.country, country))
      .orderBy(desc(rankings.rankDate))
      .limit(1);

    if (result.length > 0 && result[0].rankDate) {
      return result[0].rankDate.toISOString().split('T')[0];
    }
    return null;
  } catch (error) {
    console.error("[Database] Failed to get latest ranking date:", error);
    return null;
  }
}

// Search apps by name
export async function searchApps(params: {
  query: string;
  countries: CountryCode[];
  limit: number;
}): Promise<App[]> {
  const db = await getDb();
  if (!db) return [];

  const { query, countries, limit } = params;

  try {
    const results = await db
      .select()
      .from(apps)
      .where(
        and(
          sql`${apps.name} LIKE ${`%${query}%`}`,
          inArray(apps.country, countries)
        )
      )
      .limit(limit);

    return results;
  } catch (error) {
    console.error("[Database] Failed to search apps:", error);
    return [];
  }
}

// Get app rankings across multiple countries
export async function getAppRankingsAcrossCountries(params: {
  appStoreId: string;
  countries: CountryCode[];
  rankingType: RankingType;
  categoryType: CategoryType;
  date: string;
}): Promise<{ app: App | null; rankings: Record<string, number> }> {
  const db = await getDb();
  if (!db) return { app: null, rankings: {} };

  const { appStoreId, countries, rankingType, categoryType, date } = params;

  try {
    // Get app info from any country
    const appResult = await db
      .select()
      .from(apps)
      .where(eq(apps.appStoreId, appStoreId))
      .limit(1);

    if (appResult.length === 0) {
      return { app: null, rankings: {} };
    }

    // Get rankings for all countries
    const rankingResults = await db
      .select({
        country: rankings.country,
        rank: rankings.rank,
      })
      .from(rankings)
      .innerJoin(apps, eq(rankings.appId, apps.id))
      .where(
        and(
          eq(apps.appStoreId, appStoreId),
          inArray(rankings.country, countries),
          eq(rankings.rankingType, rankingType),
          eq(rankings.categoryType, categoryType),
          eq(rankings.rankDate, new Date(date))
        )
      );

    const rankingsMap: Record<string, number> = {};
    for (const r of rankingResults) {
      rankingsMap[r.country] = r.rank;
    }

    return {
      app: appResult[0],
      rankings: rankingsMap,
    };
  } catch (error) {
    console.error("[Database] Failed to get app rankings across countries:", error);
    return { app: null, rankings: {} };
  }
}

// Batch operations for efficiency
export async function batchUpsertAppsAndRankings(
  appsData: InsertApp[],
  rankingsData: Omit<InsertRanking, "appId">[],
  appStoreIds: string[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Insert/update apps
    for (let i = 0; i < appsData.length; i++) {
      const appId = await upsertApp(appsData[i]);
      if (appId) {
        await upsertRanking({
          ...rankingsData[i],
          appId,
        });
      }
    }
  } catch (error) {
    console.error("[Database] Failed to batch upsert:", error);
  }
}
