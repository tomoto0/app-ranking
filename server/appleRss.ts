import axios from "axios";
import { COUNTRIES, CountryCode, RankingType, CategoryType } from "../shared/rankings";

// Apple RSS Feed API response types
interface AppleRssApp {
  id: string;
  name: string;
  url: string;
  artistName: string;
  artistId: string;
  artistUrl: string;
  artworkUrl100: string;
  genres: Array<{ genreId: string; name: string; url: string }>;
  releaseDate: string;
}

interface AppleRssResponse {
  feed: {
    title: string;
    id: string;
    author: { name: string; url: string };
    links: Array<{ self: string }>;
    copyright: string;
    country: string;
    icon: string;
    updated: string;
    results: AppleRssApp[];
  };
}

// iTunes Search API response types
interface ItunesSearchResult {
  trackId: number;
  trackName: string;
  bundleId: string;
  artistName: string;
  artworkUrl100: string;
  artworkUrl512: string;
  description: string;
  primaryGenreName: string;
  primaryGenreId: number;
  price: number;
  currency: string;
  releaseDate: string;
  averageUserRating: number;
  userRatingCount: number;
  formattedPrice: string;
}

interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesSearchResult[];
}

export interface FetchedApp {
  appStoreId: string;
  bundleId?: string;
  name: string;
  artistName: string;
  artworkUrl100: string;
  artworkUrl512?: string;
  summary?: string;
  categoryId?: string;
  categoryName?: string;
  price: number;
  currency: string;
  releaseDate: string;
  averageRating?: number;
  ratingCount?: number;
  rank: number;
}

/**
 * Fetch top apps from Apple RSS Feed
 * Note: Apple RSS only supports top-free and top-paid, not top-grossing
 * For top-grossing, we'll use the same data as top-free as a fallback
 */
export async function fetchAppleRssFeed(
  country: CountryCode,
  rankingType: RankingType,
  categoryType: CategoryType,
  limit: number = 50
): Promise<FetchedApp[]> {
  const countryInfo = COUNTRIES[country];
  
  // Map ranking type to Apple RSS feed type
  // Note: Apple RSS doesn't have top-grossing, we use top-free as fallback
  let feedType: string;
  if (rankingType === "toppaid") {
    feedType = "top-paid";
  } else {
    // Both topfree and topgrossing use top-free feed
    feedType = "top-free";
  }

  // Build the URL - Apple RSS API only supports "all apps" (no games filter)
  const url = `https://rss.marketingtools.apple.com/api/v2/${countryInfo.appleCode}/apps/${feedType}/${limit}/apps.json`;

  try {
    const response = await axios.get<AppleRssResponse>(url, {
      timeout: 30000,
      headers: {
        "Accept": "application/json",
        "User-Agent": "AppRankNavi/1.0",
      },
    });

    const apps = response.data.feed.results;
    
    return apps.map((app, index) => ({
      appStoreId: app.id,
      name: app.name,
      artistName: app.artistName,
      artworkUrl100: app.artworkUrl100,
      categoryId: app.genres?.[0]?.genreId,
      categoryName: app.genres?.[0]?.name,
      price: 0, // RSS doesn't include price
      currency: "USD",
      releaseDate: app.releaseDate,
      rank: index + 1,
    }));
  } catch (error) {
    console.error(`Failed to fetch Apple RSS feed for ${country} ${rankingType}:`, error);
    return [];
  }
}

/**
 * Fetch detailed app information from iTunes Search API
 */
export async function fetchAppDetails(
  appStoreId: string,
  country: CountryCode
): Promise<ItunesSearchResult | null> {
  const countryInfo = COUNTRIES[country];
  const url = `https://itunes.apple.com/lookup?id=${appStoreId}&country=${countryInfo.appleCode}`;

  try {
    const response = await axios.get<ItunesSearchResponse>(url, {
      timeout: 15000,
      headers: {
        "Accept": "application/json",
        "User-Agent": "AppRankNavi/1.0",
      },
    });

    if (response.data.resultCount > 0) {
      return response.data.results[0];
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch app details for ${appStoreId}:`, error);
    return null;
  }
}

/**
 * Batch fetch app details for multiple apps
 */
export async function fetchMultipleAppDetails(
  appStoreIds: string[],
  country: CountryCode
): Promise<Map<string, ItunesSearchResult>> {
  const results = new Map<string, ItunesSearchResult>();
  
  // iTunes API supports up to 200 IDs at once
  const batchSize = 200;
  const countryInfo = COUNTRIES[country];
  
  for (let i = 0; i < appStoreIds.length; i += batchSize) {
    const batch = appStoreIds.slice(i, i + batchSize);
    const ids = batch.join(",");
    const url = `https://itunes.apple.com/lookup?id=${ids}&country=${countryInfo.appleCode}`;

    try {
      const response = await axios.get<ItunesSearchResponse>(url, {
        timeout: 30000,
        headers: {
          "Accept": "application/json",
          "User-Agent": "AppRankNavi/1.0",
        },
      });

      for (const result of response.data.results) {
        results.set(String(result.trackId), result);
      }
    } catch (error) {
      console.error(`Failed to fetch batch app details:`, error);
    }

    // Add small delay between batches to avoid rate limiting
    if (i + batchSize < appStoreIds.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
