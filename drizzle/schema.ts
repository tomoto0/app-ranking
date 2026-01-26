import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, decimal, index, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * App categories table
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: varchar("categoryId", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  nameJa: varchar("nameJa", { length: 128 }),
  isGame: int("isGame").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Apps table - stores app information
 */
export const apps = mysqlTable("apps", {
  id: int("id").autoincrement().primaryKey(),
  appStoreId: varchar("appStoreId", { length: 32 }).notNull(),
  bundleId: varchar("bundleId", { length: 256 }),
  name: varchar("name", { length: 512 }).notNull(),
  artistName: varchar("artistName", { length: 256 }),
  artworkUrl100: text("artworkUrl100"),
  artworkUrl512: text("artworkUrl512"),
  summary: text("summary"),
  categoryId: varchar("categoryId", { length: 32 }),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 8 }).default("USD"),
  releaseDate: date("releaseDate"),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }),
  ratingCount: int("ratingCount").default(0),
  country: varchar("country", { length: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("apps_store_country_idx").on(table.appStoreId, table.country),
  index("apps_category_idx").on(table.categoryId),
]);

export type App = typeof apps.$inferSelect;
export type InsertApp = typeof apps.$inferInsert;

/**
 * Rankings table - stores daily ranking data
 */
export const rankings = mysqlTable("rankings", {
  id: int("id").autoincrement().primaryKey(),
  appId: int("appId").notNull(),
  country: varchar("country", { length: 8 }).notNull(),
  rankingType: mysqlEnum("rankingType", ["topgrossing", "topfree", "toppaid"]).notNull(),
  categoryType: mysqlEnum("categoryType", ["all", "games", "entertainment", "socialNetworking", "photoVideo", "music", "lifestyle", "shopping", "healthFitness", "finance", "productivity", "utilities", "education", "business", "news", "travel", "foodDrink", "sports"]).default("all").notNull(),
  rank: int("rank").notNull(),
  rankDate: date("rankDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("rankings_app_idx").on(table.appId),
  index("rankings_date_idx").on(table.rankDate),
  index("rankings_country_type_date_idx").on(table.country, table.rankingType, table.rankDate),
  uniqueIndex("rankings_unique_idx").on(table.appId, table.country, table.rankingType, table.categoryType, table.rankDate),
]);

export type Ranking = typeof rankings.$inferSelect;
export type InsertRanking = typeof rankings.$inferInsert;
