import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ExternalLink, Copy, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppData } from "./RankingTable";
import { CountryCode, RankingType, CategoryType, COUNTRIES } from "./FilterBar";

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

interface AppDetailModalProps {
  app: AppData | null;
  isOpen: boolean;
  onClose: () => void;
  country: CountryCode;
  rankingType: RankingType;
  categoryType: CategoryType;
}

type Period = "week" | "month" | "year";

export function AppDetailModal({
  app,
  isOpen,
  onClose,
  country,
  rankingType,
  categoryType,
}: AppDetailModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("week");

  const { data: historyData, isLoading: historyLoading } = trpc.apps.history.useQuery(
    {
      appId: app?.id ?? 0,
      country,
      rankingType,
      categoryType,
      period: selectedPeriod,
    },
    {
      enabled: isOpen && !!app?.id,
    }
  );

  if (!app) return null;

  const categoryInfo = app.categoryId ? APP_CATEGORIES[app.categoryId] : null;
  const appStoreUrl = `https://apps.apple.com/${country.toLowerCase()}/app/id${app.appStoreId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appStoreUrl);
    toast.success("リンクをコピーしました");
  };

  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (selectedPeriod === "week") {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    if (selectedPeriod === "month") {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    return `${date.getFullYear()}/${date.getMonth() + 1}`;
  };

  const chartData = historyData?.history.map((h) => ({
    date: formatChartDate(h.date as unknown as string),
    rank: h.rank,
  })) ?? [];

  const getRankTrend = () => {
    if (!historyData?.history || historyData.history.length < 2) return null;
    const latest = historyData.history[historyData.history.length - 1].rank;
    const previous = historyData.history[historyData.history.length - 2].rank;
    const diff = previous - latest;
    
    if (diff > 0) return { direction: "up", value: diff };
    if (diff < 0) return { direction: "down", value: Math.abs(diff) };
    return { direction: "same", value: 0 };
  };

  const trend = getRankTrend();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            {app.artworkUrl100 ? (
              <img
                src={app.artworkUrl100}
                alt={app.name}
                className="w-16 h-16 rounded-xl shadow-md"
              />
            ) : (
              <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center">
                <span className="text-3xl">📱</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold truncate">{app.name}</h2>
              <p className="text-sm text-muted-foreground truncate">
                {app.artistName || "Unknown Developer"}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* App Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">カテゴリ</p>
              <p className="text-sm font-medium">{categoryInfo?.nameJa || "その他"}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">価格</p>
              <p className="text-sm font-medium">
                {app.price && parseFloat(app.price) > 0 ? `¥${app.price}` : "無料"}
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">評価</p>
              <p className="text-sm font-medium">
                {app.averageRating
                  ? `${parseFloat(app.averageRating).toFixed(1)} ★`
                  : "-"}
                {app.ratingCount ? ` (${app.ratingCount.toLocaleString()}件)` : ""}
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">リリース日</p>
              <p className="text-sm font-medium">
                {app.releaseDate
                  ? new Date(app.releaseDate).toLocaleDateString("ja-JP")
                  : "-"}
              </p>
            </div>
          </div>

          {/* Ranking Stats */}
          {historyData?.stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">最高順位</p>
                <p className="text-xl font-bold text-primary">
                  {historyData.stats.highestRank ?? "-"}
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">平均順位</p>
                <p className="text-xl font-bold">
                  {historyData.stats.averageRank ?? "-"}
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">最低順位</p>
                <p className="text-xl font-bold">
                  {historyData.stats.lowestRank ?? "-"}
                </p>
              </div>
            </div>
          )}

          {/* Trend Indicator */}
          {trend && (
            <div className="flex items-center justify-center gap-2 py-2">
              {trend.direction === "up" && (
                <>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-green-500 font-medium">
                    {trend.value}ランクアップ
                  </span>
                </>
              )}
              {trend.direction === "down" && (
                <>
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <span className="text-red-500 font-medium">
                    {trend.value}ランクダウン
                  </span>
                </>
              )}
              {trend.direction === "same" && (
                <>
                  <Minus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">変動なし</span>
                </>
              )}
            </div>
          )}

          {/* Ranking History Chart */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">ランキング推移</h3>
              <Tabs
                value={selectedPeriod}
                onValueChange={(v) => setSelectedPeriod(v as Period)}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="week" className="text-xs px-3 h-7">
                    7日間
                  </TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-3 h-7">
                    1ヶ月
                  </TabsTrigger>
                  <TabsTrigger value="year" className="text-xs px-3 h-7">
                    1年
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="h-[200px] w-full">
              {historyLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                    />
                    <YAxis
                      reversed
                      domain={["dataMin - 5", "dataMax + 5"]}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number) => [`${value}位`, "順位"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rank"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  履歴データがありません
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(appStoreUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              App Storeで見る
            </Button>
            <Button variant="outline" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              リンクをコピー
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
