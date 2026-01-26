import { cn } from "@/lib/utils";
import { COUNTRIES, CountryCode } from "./FilterBar";

// App category mappings
const APP_CATEGORIES: Record<string, { name: string; nameJa: string }> = {
  "6018": { name: "Books", nameJa: "ブック" },
  "6000": { name: "Business", nameJa: "ビジネス" },
  "6017": { name: "Education", nameJa: "教育" },
  "6016": { name: "Entertainment", nameJa: "エンタメ" },
  "6015": { name: "Finance", nameJa: "ファイナンス" },
  "6014": { name: "Games", nameJa: "ゲーム" },
  "6013": { name: "Health & Fitness", nameJa: "ヘルスケア" },
  "6012": { name: "Lifestyle", nameJa: "ライフスタイル" },
  "6011": { name: "Music", nameJa: "ミュージック" },
  "6010": { name: "Navigation", nameJa: "ナビゲーション" },
  "6009": { name: "News", nameJa: "ニュース" },
  "6008": { name: "Photo & Video", nameJa: "写真/ビデオ" },
  "6007": { name: "Productivity", nameJa: "仕事効率化" },
  "6006": { name: "Reference", nameJa: "辞書/辞典" },
  "6024": { name: "Shopping", nameJa: "ショッピング" },
  "6005": { name: "Social Networking", nameJa: "SNS" },
  "6004": { name: "Sports", nameJa: "スポーツ" },
  "6003": { name: "Travel", nameJa: "旅行" },
  "6002": { name: "Utilities", nameJa: "ユーティリティ" },
  "6001": { name: "Weather", nameJa: "天気" },
};

interface AppData {
  id: number;
  appStoreId: string;
  name: string;
  artistName: string | null;
  artworkUrl100: string | null;
  summary: string | null;
  categoryId: string | null;
  price: string | null;
  releaseDate: Date | string | null;
  averageRating: string | null;
  ratingCount: number | null;
  country: string;
}

interface RankingItem {
  app: AppData;
  rankings: Record<string, number>;
}

interface RankingTableProps {
  rankings: RankingItem[];
  selectedCountries: CountryCode[];
  onAppClick: (app: AppData) => void;
  isLoading?: boolean;
}

function RankBadge({ rank }: { rank: number }) {
  const getBadgeClass = () => {
    if (rank === 1) return "rank-badge rank-badge-1";
    if (rank === 2) return "rank-badge rank-badge-2";
    if (rank === 3) return "rank-badge rank-badge-3";
    return "rank-badge rank-badge-default";
  };

  return <span className={getBadgeClass()}>{rank}</span>;
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={cn(
            "text-xs",
            i < fullStars
              ? "text-yellow-400"
              : i === fullStars && hasHalfStar
              ? "text-yellow-400/50"
              : "text-muted-foreground/30"
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function formatRatingCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

function formatDate(dateValue: Date | string | null): string {
  if (!dateValue) return "-";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function RankingTable({
  rankings,
  selectedCountries,
  onAppClick,
  isLoading,
}: RankingTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">#</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">国</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">順位</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">アプリ名</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">カテゴリ</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">価格</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">評価</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">リリース日</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="p-3"><div className="skeleton h-6 w-8 rounded" /></td>
                <td className="p-3"><div className="skeleton h-6 w-16 rounded" /></td>
                <td className="p-3"><div className="skeleton h-6 w-12 rounded" /></td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="skeleton h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                      <div className="skeleton h-4 w-32 rounded" />
                      <div className="skeleton h-3 w-24 rounded" />
                    </div>
                  </div>
                </td>
                <td className="p-3"><div className="skeleton h-6 w-16 rounded" /></td>
                <td className="p-3"><div className="skeleton h-6 w-12 rounded" /></td>
                <td className="p-3"><div className="skeleton h-6 w-20 rounded" /></td>
                <td className="p-3"><div className="skeleton h-6 w-24 rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="bg-card rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          ランキングデータがありません。「データ取得」ボタンをクリックして最新データを取得してください。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-3 text-sm font-medium text-muted-foreground w-12">#</th>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground w-20">国</th>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground w-24">順位</th>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground">アプリ名</th>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground w-24">カテゴリ</th>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground w-16">価格</th>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground w-28">評価</th>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground w-28">リリース日</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((item, index) => {
            const minRank = Math.min(...Object.values(item.rankings));
            const categoryInfo = item.app.categoryId
              ? APP_CATEGORIES[item.app.categoryId]
              : null;

            return (
              <tr
                key={`${item.app.appStoreId}-${index}`}
                className="ranking-row border-b border-border/50 cursor-pointer"
                onClick={() => onAppClick(item.app)}
              >
                <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    {selectedCountries.map((code) => (
                      <div key={code} className="flex items-center gap-1">
                        <span className="country-flag text-sm">{COUNTRIES[code].flag}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    {selectedCountries.map((code) => (
                      <div key={code}>
                        {item.rankings[code] ? (
                          <RankBadge rank={item.rankings[code]} />
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {item.app.artworkUrl100 ? (
                      <img
                        src={item.app.artworkUrl100}
                        alt={item.app.name}
                        className="app-icon w-12 h-12"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                        <span className="text-2xl">📱</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate max-w-[300px]">
                        {item.app.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {item.app.summary?.substring(0, 60) || item.app.artistName || ""}
                        {item.app.summary && item.app.summary.length > 60 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs">
                    {categoryInfo?.nameJa || "その他"}
                  </span>
                </td>
                <td className="p-3 text-sm">
                  {item.app.price && parseFloat(item.app.price) > 0
                    ? `¥${item.app.price}`
                    : "無料"}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    {item.app.averageRating && (
                      <RatingStars rating={parseFloat(item.app.averageRating)} />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {item.app.averageRating
                        ? `${parseFloat(item.app.averageRating).toFixed(1)}`
                        : "-"}
                      {item.app.ratingCount
                        ? ` (${formatRatingCount(item.app.ratingCount)})`
                        : ""}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {formatDate(item.app.releaseDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export type { AppData, RankingItem };
