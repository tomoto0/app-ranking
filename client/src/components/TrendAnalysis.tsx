import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { CountryCode, RankingType, CategoryType, COUNTRIES, RANKING_TYPES, CATEGORY_TYPES } from "./FilterBar";

interface TrendAnalysisProps {
  countries: CountryCode[];
  rankingType: RankingType;
  categoryType: CategoryType;
  date: string;
}

export function TrendAnalysis({
  countries,
  rankingType,
  categoryType,
  date,
}: TrendAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);

  const analysisMutation = trpc.analysis.trends.useMutation({
    onSuccess: (data) => {
      const analysisText = typeof data.analysis === 'string' ? data.analysis : null;
      setAnalysis(analysisText);
    },
  });

  const handleAnalyze = () => {
    analysisMutation.mutate({
      countries,
      rankingType,
      categoryType,
      date,
    });
  };

  const countryNames = countries.map((c) => COUNTRIES[c].nameJa).join("・");
  const rankingTypeName = RANKING_TYPES[rankingType].nameJa;
  const categoryTypeName = CATEGORY_TYPES[categoryType].nameJa;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>AIトレンド分析</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={analysisMutation.isPending}
          >
            {analysisMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            分析する
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!analysis && !analysisMutation.isPending && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">
              {countryNames}の{rankingTypeName}（{categoryTypeName}）のトレンドを
            </p>
            <p className="text-sm">AIが分析します</p>
          </div>
        )}

        {analysisMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">分析中...</p>
          </div>
        )}

        {analysis && !analysisMutation.isPending && (
          <div className="prose prose-sm prose-invert max-w-none">
            <Streamdown>{analysis}</Streamdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
