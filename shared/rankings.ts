// Country definitions for App Store rankings
export const COUNTRIES = {
  JP: { code: "JP", name: "Japan", nameJa: "日本", flag: "🇯🇵", appleCode: "jp" },
  US: { code: "US", name: "United States", nameJa: "アメリカ", flag: "🇺🇸", appleCode: "us" },
  GB: { code: "GB", name: "United Kingdom", nameJa: "イギリス", flag: "🇬🇧", appleCode: "gb" },
  CN: { code: "CN", name: "China", nameJa: "中国", flag: "🇨🇳", appleCode: "cn" },
  KR: { code: "KR", name: "South Korea", nameJa: "韓国", flag: "🇰🇷", appleCode: "kr" },
} as const;

export type CountryCode = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];

// Ranking types
export const RANKING_TYPES = {
  topgrossing: { id: "topgrossing", name: "Top Grossing", nameJa: "トップセールス" },
  topfree: { id: "topfree", name: "Top Free", nameJa: "トップ無料DL" },
  toppaid: { id: "toppaid", name: "Top Paid", nameJa: "トップ有料DL" },
} as const;

export type RankingType = keyof typeof RANKING_TYPES;
export const RANKING_TYPE_IDS = Object.keys(RANKING_TYPES) as RankingType[];

// Category types
export const CATEGORY_TYPES = {
  all: { id: "all", name: "All Categories", nameJa: "総合" },
  games: { id: "games", name: "Games", nameJa: "ゲーム総合" },
} as const;

export type CategoryType = keyof typeof CATEGORY_TYPES;

// App Store category mappings
export const APP_CATEGORIES: Record<string, { name: string; nameJa: string; isGame: boolean }> = {
  "6018": { name: "Books", nameJa: "ブック", isGame: false },
  "6000": { name: "Business", nameJa: "ビジネス", isGame: false },
  "6022": { name: "Catalogs", nameJa: "カタログ", isGame: false },
  "6017": { name: "Education", nameJa: "教育", isGame: false },
  "6016": { name: "Entertainment", nameJa: "エンタメ", isGame: false },
  "6015": { name: "Finance", nameJa: "ファイナンス", isGame: false },
  "6023": { name: "Food & Drink", nameJa: "フード/ドリンク", isGame: false },
  "6014": { name: "Games", nameJa: "ゲーム", isGame: true },
  "6013": { name: "Health & Fitness", nameJa: "ヘルスケア/フィットネス", isGame: false },
  "6012": { name: "Lifestyle", nameJa: "ライフスタイル", isGame: false },
  "6020": { name: "Medical", nameJa: "メディカル", isGame: false },
  "6011": { name: "Music", nameJa: "ミュージック", isGame: false },
  "6010": { name: "Navigation", nameJa: "ナビゲーション", isGame: false },
  "6009": { name: "News", nameJa: "ニュース", isGame: false },
  "6021": { name: "Newsstand", nameJa: "Newsstand", isGame: false },
  "6008": { name: "Photo & Video", nameJa: "写真/ビデオ", isGame: false },
  "6007": { name: "Productivity", nameJa: "仕事効率化", isGame: false },
  "6006": { name: "Reference", nameJa: "辞書/辞典/その他", isGame: false },
  "6024": { name: "Shopping", nameJa: "ショッピング", isGame: false },
  "6005": { name: "Social Networking", nameJa: "SNS", isGame: false },
  "6004": { name: "Sports", nameJa: "スポーツ", isGame: false },
  "6003": { name: "Travel", nameJa: "旅行", isGame: false },
  "6002": { name: "Utilities", nameJa: "ユーティリティ", isGame: false },
  "6001": { name: "Weather", nameJa: "天気", isGame: false },
  // Game subcategories
  "7001": { name: "Action", nameJa: "アクション", isGame: true },
  "7002": { name: "Adventure", nameJa: "アドベンチャー", isGame: true },
  "7003": { name: "Arcade", nameJa: "アーケード", isGame: true },
  "7004": { name: "Board", nameJa: "ボード", isGame: true },
  "7005": { name: "Card", nameJa: "カード", isGame: true },
  "7006": { name: "Casino", nameJa: "カジノ", isGame: true },
  "7007": { name: "Dice", nameJa: "サイコロ", isGame: true },
  "7008": { name: "Educational", nameJa: "教育", isGame: true },
  "7009": { name: "Family", nameJa: "ファミリー", isGame: true },
  "7011": { name: "Music", nameJa: "ミュージック", isGame: true },
  "7012": { name: "Puzzle", nameJa: "パズル", isGame: true },
  "7013": { name: "Racing", nameJa: "レーシング", isGame: true },
  "7014": { name: "Role Playing", nameJa: "ロールプレイング", isGame: true },
  "7015": { name: "Simulation", nameJa: "シミュレーション", isGame: true },
  "7016": { name: "Sports", nameJa: "スポーツ", isGame: true },
  "7017": { name: "Strategy", nameJa: "ストラテジー", isGame: true },
  "7018": { name: "Trivia", nameJa: "トリビア", isGame: true },
  "7019": { name: "Word", nameJa: "ワード", isGame: true },
};

// Default pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [20, 50, 100];
