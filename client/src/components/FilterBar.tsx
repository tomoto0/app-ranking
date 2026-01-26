import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

// Country definitions
const COUNTRIES = {
  JP: { code: "JP", name: "Japan", nameJa: "日本", flag: "🇯🇵" },
  US: { code: "US", name: "United States", nameJa: "アメリカ", flag: "🇺🇸" },
  GB: { code: "GB", name: "United Kingdom", nameJa: "イギリス", flag: "🇬🇧" },
  CN: { code: "CN", name: "China", nameJa: "中国", flag: "🇨🇳" },
  KR: { code: "KR", name: "South Korea", nameJa: "韓国", flag: "🇰🇷" },
} as const;

type CountryCode = keyof typeof COUNTRIES;

// Ranking types
const RANKING_TYPES = {
  topgrossing: { id: "topgrossing", name: "Top Grossing", nameJa: "トップセールス" },
  topfree: { id: "topfree", name: "Top Free", nameJa: "トップ無料DL" },
  toppaid: { id: "toppaid", name: "Top Paid", nameJa: "トップ有料DL" },
} as const;

type RankingType = keyof typeof RANKING_TYPES;

// Category types - expanded with individual categories
const CATEGORY_TYPES = {
  all: { id: "all", name: "All Categories", nameJa: "総合", group: "general" },
  games: { id: "games", name: "Games", nameJa: "ゲーム総合", group: "general" },
  entertainment: { id: "entertainment", name: "Entertainment", nameJa: "エンタメ", group: "category" },
  social: { id: "social", name: "Social Networking", nameJa: "SNS", group: "category" },
  business: { id: "business", name: "Business", nameJa: "ビジネス", group: "category" },
  education: { id: "education", name: "Education", nameJa: "教育", group: "category" },
  utilities: { id: "utilities", name: "Utilities", nameJa: "ユーティリティ", group: "category" },
  productivity: { id: "productivity", name: "Productivity", nameJa: "仕事効率化", group: "category" },
  photo: { id: "photo", name: "Photo & Video", nameJa: "写真/ビデオ", group: "category" },
  lifestyle: { id: "lifestyle", name: "Lifestyle", nameJa: "ライフスタイル", group: "category" },
  finance: { id: "finance", name: "Finance", nameJa: "ファイナンス", group: "category" },
  health: { id: "health", name: "Health & Fitness", nameJa: "ヘルスケア", group: "category" },
  music: { id: "music", name: "Music", nameJa: "ミュージック", group: "category" },
  shopping: { id: "shopping", name: "Shopping", nameJa: "ショッピング", group: "category" },
  travel: { id: "travel", name: "Travel", nameJa: "旅行", group: "category" },
  news: { id: "news", name: "News", nameJa: "ニュース", group: "category" },
  sports: { id: "sports", name: "Sports", nameJa: "スポーツ", group: "category" },
  food: { id: "food", name: "Food & Drink", nameJa: "フード/ドリンク", group: "category" },
} as const;

type CategoryType = keyof typeof CATEGORY_TYPES;

interface FilterBarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedCountries: CountryCode[];
  onCountriesChange: (countries: CountryCode[]) => void;
  selectedRankingType: RankingType;
  onRankingTypeChange: (type: RankingType) => void;
  selectedCategoryType: CategoryType;
  onCategoryTypeChange: (type: CategoryType) => void;
}

export function FilterBar({
  selectedDate,
  onDateChange,
  selectedCountries,
  onCountriesChange,
  selectedRankingType,
  onRankingTypeChange,
  selectedCategoryType,
  onCategoryTypeChange,
}: FilterBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const toggleCountry = (code: CountryCode) => {
    if (selectedCountries.includes(code)) {
      // Don't allow deselecting if it's the last country
      if (selectedCountries.length > 1) {
        onCountriesChange(selectedCountries.filter((c) => c !== code));
      }
    } else {
      onCountriesChange([...selectedCountries, code]);
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const formatDateJa = (date: Date) => {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dayOfWeek = days[date.getDay()];
    return `${year}/${month}/${day}(${dayOfWeek})`;
  };

  // Group categories for display
  const generalCategories = Object.entries(CATEGORY_TYPES).filter(
    ([_, cat]) => cat.group === "general"
  );
  const specificCategories = Object.entries(CATEGORY_TYPES).filter(
    ([_, cat]) => cat.group === "category"
  );

  return (
    <div className="space-y-4">
      {/* Ranking Type Tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1">
        {Object.entries(RANKING_TYPES).map(([key, type]) => (
          <Button
            key={key}
            variant={selectedRankingType === key ? "default" : "ghost"}
            className={cn(
              "flex-1 text-sm",
              selectedRankingType === key && "bg-primary text-primary-foreground"
            )}
            onClick={() => onRankingTypeChange(key as RankingType)}
          >
            {type.nameJa}
          </Button>
        ))}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 bg-card rounded-lg p-3">
        {/* Date Selection */}
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[160px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateJa(selectedDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onDateChange(date);
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            今日
          </Button>
        </div>

        {/* Country Selection */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-2">国:</span>
          {Object.entries(COUNTRIES).map(([code, country]) => (
            <Button
              key={code}
              variant={selectedCountries.includes(code as CountryCode) ? "default" : "outline"}
              size="sm"
              className={cn(
                "px-2",
                selectedCountries.includes(code as CountryCode) &&
                  "bg-primary text-primary-foreground"
              )}
              onClick={() => toggleCountry(code as CountryCode)}
            >
              <span className="country-flag mr-1">{country.flag}</span>
              {country.nameJa.charAt(0)}
            </Button>
          ))}
        </div>

        {/* Category Selection - Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">カテゴリ:</span>
          <Select
            value={selectedCategoryType}
            onValueChange={(value) => onCategoryTypeChange(value as CategoryType)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue>
                {CATEGORY_TYPES[selectedCategoryType].nameJa}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* General categories */}
              <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">
                全般
              </div>
              {generalCategories.map(([key, cat]) => (
                <SelectItem key={key} value={key}>
                  {cat.nameJa}
                </SelectItem>
              ))}
              
              {/* Separator */}
              <div className="my-1 border-t border-border" />
              
              {/* Specific categories */}
              <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">
                個別カテゴリ
              </div>
              {specificCategories.map(([key, cat]) => (
                <SelectItem key={key} value={key}>
                  {cat.nameJa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export { COUNTRIES, RANKING_TYPES, CATEGORY_TYPES };
export type { CountryCode, RankingType, CategoryType };
