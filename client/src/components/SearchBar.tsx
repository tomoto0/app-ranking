import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { CountryCode, RankingType, CategoryType, COUNTRIES } from "./FilterBar";

interface SearchBarProps {
  selectedCountries: CountryCode[];
  selectedRankingType: RankingType;
  selectedCategoryType: CategoryType;
  selectedDate: Date;
  onAppClick: (app: any) => void;
}

interface SearchResult {
  app: {
    id: number;
    appStoreId: string;
    name: string;
    artistName: string | null;
    artworkUrl100: string | null;
    categoryId: string | null;
    price: string | null;
    country: string;
    summary?: string | null;
    releaseDate?: string | null;
    averageRating?: string | null;
    ratingCount?: number | null;
  };
  rankings: Record<string, number>;
}

export function SearchBar({
  selectedCountries,
  selectedRankingType,
  selectedCategoryType,
  selectedDate,
  onAppClick,
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchMutation = trpc.apps.search.useQuery(
    {
      query,
      countries: selectedCountries,
      rankingType: selectedRankingType,
      categoryType: selectedCategoryType,
      date: selectedDate.toISOString().split("T")[0],
    },
    {
      enabled: false,
    }
  );

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const result = await searchMutation.refetch();
      if (result.data) {
        setSearchResults(result.data.results as SearchResult[]);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [query, searchMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    setSearchResults([]);
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Search className="h-4 w-4" />
        アプリ検索
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              アプリ検索
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="flex gap-2">
              <Input
                placeholder="アプリ名を入力..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Search Info */}
            <div className="text-sm text-muted-foreground">
              選択中の国: {selectedCountries.map(c => COUNTRIES[c].flag).join(" ")}
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {searchResults.length === 0 && query && !isSearching && (
                <div className="text-center text-muted-foreground py-8">
                  検索結果がありません
                </div>
              )}

              {searchResults.map((result) => (
                <div
                  key={result.app.appStoreId}
                  className="flex items-center gap-3 p-3 bg-card rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    onAppClick(result.app);
                    handleClose();
                  }}
                >
                  {/* App Icon */}
                  {result.app.artworkUrl100 ? (
                    <img
                      src={result.app.artworkUrl100}
                      alt={result.app.name}
                      className="w-12 h-12 rounded-xl"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                      <span className="text-xl">📱</span>
                    </div>
                  )}

                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{result.app.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {result.app.artistName || "Unknown Developer"}
                    </p>
                  </div>

                  {/* Rankings by Country */}
                  <div className="flex gap-2">
                    {selectedCountries.map((country) => {
                      const rank = result.rankings[country];
                      return (
                        <div
                          key={country}
                          className="flex flex-col items-center min-w-[40px]"
                        >
                          <span className="text-xs text-muted-foreground">
                            {COUNTRIES[country].flag}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              rank ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {rank ? `#${rank}` : "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
