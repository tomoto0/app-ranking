import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { AppData } from "./RankingTable";
import { CountryCode } from "./FilterBar";

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
}

export function AppDetailModal({
  app,
  isOpen,
  onClose,
  country,
}: AppDetailModalProps) {
  if (!app) return null;

  const categoryInfo = app.categoryId ? APP_CATEGORIES[app.categoryId] : null;
  const appStoreUrl = `https://apps.apple.com/${country.toLowerCase()}/app/id${app.appStoreId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appStoreUrl);
    toast.success("リンクをコピーしました");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
