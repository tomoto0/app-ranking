import cron from "node-cron";
import { fetchAppleRssFeed, fetchMultipleAppDetails } from "./appleRss";
import { upsertApp, upsertRanking } from "./db";
import {
  COUNTRY_CODES,
  RANKING_TYPE_IDS,
  CATEGORY_TYPE_IDS,
  type CountryCode,
  type RankingType,
  type CategoryType,
} from "../shared/rankings";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to retry on failure
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`[Cron] Attempt ${attempt}/${retries} failed:`, error);
      if (attempt < retries) {
        console.log(`[Cron] Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}

// Fetch rankings for a specific country, ranking type, and category
async function fetchRankingsForConfig(
  country: CountryCode,
  rankingType: RankingType,
  categoryType: CategoryType
): Promise<{ success: boolean; count: number }> {
  const today = new Date().toISOString().split("T")[0];

  try {
    const fetchedApps = await withRetry(() =>
      fetchAppleRssFeed(country, rankingType, categoryType, 100)
    );

    if (fetchedApps.length === 0) {
      return { success: false, count: 0 };
    }

    // Fetch detailed app info from iTunes
    const appStoreIds = fetchedApps.map((app) => app.appStoreId);
    const detailedApps = await withRetry(() =>
      fetchMultipleAppDetails(appStoreIds, country)
    );

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
        releaseDate: details?.releaseDate
          ? new Date(details.releaseDate)
          : null,
        averageRating: details?.averageUserRating
          ? String(details.averageUserRating)
          : null,
        ratingCount: details?.userRatingCount || 0,
        country,
      });

      if (appId) {
        await upsertRanking({
          appId,
          country,
          rankingType,
          categoryType,
          rank: fetchedApp.rank,
          rankDate: new Date(today),
        });
      }
    }

    return { success: true, count: fetchedApps.length };
  } catch (error) {
    console.error(
      `[Cron] Failed to fetch rankings for ${country}/${rankingType}/${categoryType}:`,
      error
    );
    return { success: false, count: 0 };
  }
}

// Fetch all rankings for all countries and ranking types
async function fetchAllRankings(): Promise<void> {
  console.log("[Cron] Starting scheduled ranking data fetch...");
  const startTime = Date.now();

  const results: {
    country: string;
    rankingType: string;
    categoryType: string;
    success: boolean;
    count: number;
  }[] = [];

  // Fetch for all countries and ranking types (only "all" category for now)
  for (const country of COUNTRY_CODES) {
    for (const rankingType of RANKING_TYPE_IDS) {
      // Only fetch "all" category to reduce API calls
      const categoryType = "all" as CategoryType;

      console.log(
        `[Cron] Fetching ${country}/${rankingType}/${categoryType}...`
      );

      const result = await fetchRankingsForConfig(
        country as CountryCode,
        rankingType as RankingType,
        categoryType
      );

      results.push({
        country,
        rankingType,
        categoryType,
        ...result,
      });

      // Add delay between requests to avoid rate limiting
      await delay(1000);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  const totalApps = results.reduce((sum, r) => sum + r.count, 0);

  console.log(
    `[Cron] Completed scheduled fetch in ${elapsed}s: ${successCount}/${totalCount} successful, ${totalApps} total apps`
  );
}

// Initialize cron jobs
export function initCronJobs(): void {
  // Schedule daily fetch at JST 7:00 (UTC 22:00)
  // Cron format: second minute hour day-of-month month day-of-week
  // 0 0 22 * * * = Every day at 22:00 UTC (7:00 JST)
  cron.schedule(
    "0 0 22 * * *",
    async () => {
      console.log("[Cron] Triggered daily ranking fetch at JST 7:00");
      try {
        await fetchAllRankings();
      } catch (error) {
        console.error("[Cron] Error during scheduled fetch:", error);
      }
    },
    {
      timezone: "UTC",
    }
  );

  console.log("[Cron] Scheduled daily ranking fetch at JST 7:00 (UTC 22:00)");

  // Optional: Run an initial fetch on server startup (commented out by default)
  // Uncomment the following lines if you want to fetch data immediately on startup
  // console.log("[Cron] Running initial data fetch on startup...");
  // fetchAllRankings().catch(console.error);
}

// Export for manual triggering if needed
export { fetchAllRankings };
