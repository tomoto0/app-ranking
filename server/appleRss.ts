import axios from "axios";
import { COUNTRIES, CountryCode, RankingType, CategoryType, CATEGORY_TYPES, RANKING_TYPES } from "../shared/rankings";

// iTunes RSS Feed API response types (old format with genre support)
interface ItunesRssEntry {
  "im:name": { label: string };
  "im:image": Array<{ label: string; attributes: { height: string } }>;
  "im:artist": { label: string; attributes?: { href: string } };
  "im:price"?: { label: string; attributes: { amount: string; currency: string } };
  "im:releaseDate"?: { label: string; attributes: { label: string } };
  "id": { label: string; attributes: { "im:id": string; "im:bundleId"?: string } };
  "category": { attributes: { "im:id": string; term: string; label: string } };
  "summary"?: { label: string };
}

interface ItunesRssResponse {
  feed: {
    title: { label: string };
    entry: ItunesRssEntry[];
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
 * Fetch top apps from iTunes RSS Feed (old format with genre/category support)
 * URL format: https://itunes.apple.com/{country}/rss/{feedType}/limit={limit}/genre={genreId}/json
 */
export async function fetchAppleRssFeed(
  country: CountryCode,
  rankingType: RankingType,
  categoryType: CategoryType,
  limit: number = 50
): Promise<FetchedApp[]> {
  const countryInfo = COUNTRIES[country];
  const rankingInfo = RANKING_TYPES[rankingType];
  const categoryInfo = CATEGORY_TYPES[categoryType];
  
  // Build the iTunes RSS URL with genre support
  let url = `https://itunes.apple.com/${countryInfo.appleCode}/rss/${rankingInfo.feedType}/limit=${limit}`;
  
  // Add genre parameter if not "all"
  if (categoryInfo.genreId) {
    url += `/genre=${categoryInfo.genreId}`;
  }
  
  url += "/json";

  console.log(`Fetching iTunes RSS: ${url}`);

  try {
    const response = await axios.get<ItunesRssResponse>(url, {
      timeout: 30000,
      headers: {
        "Accept": "application/json",
        "User-Agent": "AppRankNavi/1.0",
      },
    });

    const entries = response.data.feed?.entry || [];
    
    if (entries.length === 0) {
      console.warn(`No entries found for ${country} ${rankingType} ${categoryType}`);
      return [];
    }

    return entries.map((entry, index) => {
      // Get the largest image (usually the last one)
      const images = entry["im:image"] || [];
      const artworkUrl100 = images.length > 0 ? images[images.length - 1]?.label : "";
      
      // Parse price
      const priceAttr = entry["im:price"]?.attributes;
      const price = priceAttr ? parseFloat(priceAttr.amount) || 0 : 0;
      const currency = priceAttr?.currency || "USD";
      
      // Parse release date
      const releaseDate = entry["im:releaseDate"]?.attributes?.label || 
                          entry["im:releaseDate"]?.label || 
                          new Date().toISOString();

      return {
        appStoreId: entry.id.attributes["im:id"],
        bundleId: entry.id.attributes["im:bundleId"],
        name: entry["im:name"].label,
        artistName: entry["im:artist"].label,
        artworkUrl100,
        summary: entry.summary?.label,
        categoryId: entry.category.attributes["im:id"],
        categoryName: entry.category.attributes.label,
        price,
        currency,
        releaseDate,
        rank: index + 1,
      };
    });
  } catch (error) {
    console.error(`Failed to fetch iTunes RSS feed for ${country} ${rankingType} ${categoryType}:`, error);
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
