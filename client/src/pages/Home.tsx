import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2, Globe, TrendingUp, BarChart3 } from "lucide-react";
import { FilterBar, CountryCode, RankingType, CategoryType, COUNTRIES, RANKING_TYPES } from "@/components/FilterBar";
import { RankingTable, AppData, RankingItem } from "@/components/RankingTable";
import { Pagination } from "@/components/Pagination";
import { AppDetailModal } from "@/components/AppDetailModal";
import { TrendAnalysis } from "@/components/TrendAnalysis";

export default function Home() {
  // Filter state
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedCountries, setSelectedCountries] = useState<CountryCode[]>(["JP"]);
  const [selectedRankingType, setSelectedRankingType] = useState<RankingType>("topgrossing");
  const [selectedCategoryType, setSelectedCategoryType] = useState<CategoryType>("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal state
  const [selectedApp, setSelectedApp] = useState<AppData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Format date for API
  const dateString = useMemo(() => {
    return selectedDate.toISOString().split("T")[0];
  }, [selectedDate]);

  // Fetch rankings
  const { data: rankingsData, isLoading, refetch } = trpc.rankings.list.useQuery(
    {
      countries: selectedCountries,
      rankingType: selectedRankingType,
      categoryType: selectedCategoryType,
      date: dateString,
      page: currentPage,
      pageSize,
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch single country rankings
  const fetchMutation = trpc.rankings.fetch.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.count}件のランキングデータを取得しました`);
        refetch();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`データ取得に失敗しました: ${error.message}`);
    },
  });

  // Fetch all rankings
  const fetchAllMutation = trpc.rankings.fetchAll.useMutation({
    onSuccess: (data) => {
      const successCount = data.results.filter((r) => r.success).length;
      toast.success(`${successCount}件のランキングを取得しました`);
      refetch();
    },
    onError: (error) => {
      toast.error(`データ取得に失敗しました: ${error.message}`);
    },
  });

  const handleFetchData = () => {
    // Fetch for all selected countries
    selectedCountries.forEach((country) => {
      fetchMutation.mutate({
        country,
        rankingType: selectedRankingType,
        categoryType: selectedCategoryType,
      });
    });
  };

  const handleFetchAllData = () => {
    fetchAllMutation.mutate();
  };

  const handleAppClick = (app: AppData) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Transform rankings data for table
  const tableRankings: RankingItem[] = useMemo(() => {
    if (!rankingsData?.rankings) return [];
    return rankingsData.rankings;
  }, [rankingsData]);

  const isFetching = fetchMutation.isPending || fetchAllMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AppRankNavi</h1>
                <p className="text-xs text-muted-foreground">
                  App Store市場分析ダッシュボード
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchData}
                disabled={isFetching}
              >
                {fetchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                データ取得
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleFetchAllData}
                disabled={isFetching}
              >
                {fetchAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                全データ取得
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border border-border">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                世界のApp Storeトレンドを分析
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                日本・アメリカ・イギリス・中国・韓国の5カ国のApp Storeランキングを
                リアルタイムで比較・分析できます。
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(COUNTRIES).map(([code, country]) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs"
                  >
                    <span className="country-flag">{country.flag}</span>
                    {country.nameJa}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedCountries={selectedCountries}
          onCountriesChange={setSelectedCountries}
          selectedRankingType={selectedRankingType}
          onRankingTypeChange={setSelectedRankingType}
          selectedCategoryType={selectedCategoryType}
          onCategoryTypeChange={setSelectedCategoryType}
        />

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rankings Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {RANKING_TYPES[selectedRankingType].nameJa} ランキング
                {rankingsData?.total ? ` (${rankingsData.total}件)` : ""}
              </h3>
            </div>
            
            <RankingTable
              rankings={tableRankings}
              selectedCountries={selectedCountries}
              onAppClick={handleAppClick}
              isLoading={isLoading}
            />

            {rankingsData && rankingsData.totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={rankingsData.totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalItems={rankingsData.total}
              />
            )}
          </div>

          {/* Sidebar - Trend Analysis */}
          <div className="space-y-6">
            <TrendAnalysis
              countries={selectedCountries}
              rankingType={selectedRankingType}
              categoryType={selectedCategoryType}
              date={dateString}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground">
            © 2024 AppRankNavi - App Store Market Analysis Dashboard
          </p>
        </div>
      </footer>

      {/* App Detail Modal */}
      <AppDetailModal
        app={selectedApp}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        country={selectedCountries[0]}
        rankingType={selectedRankingType}
        categoryType={selectedCategoryType}
      />
    </div>
  );
}
