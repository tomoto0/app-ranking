import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// Category types
const CATEGORY_TYPES = {
  all: { id: "all", name: "All Categories", nameJa: "総合" },
  games: { id: "games", name: "Games", nameJa: "ゲーム総合" },
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

        {/* Category Selection */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-2">カテゴリ:</span>
          {Object.entries(CATEGORY_TYPES).map(([key, type]) => (
            <Button
              key={key}
              variant={selectedCategoryType === key ? "default" : "outline"}
              size="sm"
              className={cn(
                selectedCategoryType === key && "bg-primary text-primary-foreground"
              )}
              onClick={() => onCategoryTypeChange(key as CategoryType)}
            >
              {type.nameJa}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { COUNTRIES, RANKING_TYPES, CATEGORY_TYPES };
export type { CountryCode, RankingType, CategoryType };
