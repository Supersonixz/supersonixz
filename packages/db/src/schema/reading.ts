import {
  boolean, integer, pgSchema, primaryKey, text, timestamp, uuid,
} from "drizzle-orm/pg-core";

// One schema per service: reading never references auth tables; user ids are plain text.
export const reading = pgSchema("reading");

export const seriesStatus = reading.enum("series_status", ["draft", "ongoing", "completed", "hiatus"]);
export const rating = reading.enum("rating", ["all", "13+", "18+"]);
export const licenseExpiry = reading.enum("on_license_expiry", ["keep_access", "revoke"]);
export const scopeType = reading.enum("scope_type", ["series", "chapter", "plan"]);
export const readerMode = reading.enum("reader_mode", ["rtl_page", "vertical"]);

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const series = reading.table("series", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titleTh: text("title_th").notNull(),
  titleJa: text("title_ja"),
  titleEn: text("title_en"),
  author: text("author"),
  coverUrl: text("cover_url"),
  status: seriesStatus("status").notNull().default("draft"),
  rating: rating("rating").notNull().default("all"),
  licenseUntil: ts("license_until"),
  onLicenseExpiry: licenseExpiry("on_license_expiry").notNull().default("keep_access"),
});

export const chapters = reading.table("chapters", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  title: text("title"),
  isFree: boolean("is_free").notNull().default(false),
  freeFrom: ts("free_from"),
  freeUntil: ts("free_until"),
  publishedAt: ts("published_at"),
});

export const pages = reading.table("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  index: integer("index").notNull(),
  r2Key: text("r2_key").notNull(),
});

export const readingProgress = reading.table("reading_progress", {
  userId: text("user_id").notNull(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  pageIndex: integer("page_index").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.chapterId] })]);

export const readerPrefs = reading.table("reader_prefs", {
  userId: text("user_id").primaryKey(),
  mode: readerMode("mode").notNull().default("rtl_page"),
});

// Read model fed by transaction's entitlement events.
export const entitlements = reading.table("entitlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  scopeType: scopeType("scope_type").notNull(),
  scopeId: text("scope_id"),
  expiresAt: ts("expires_at"),
});

export const genres = reading.table("genres", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameTh: text("name_th").notNull(),
  nameEn: text("name_en").notNull(),
});

export const seriesGenres = reading.table("series_genres", {
  seriesId: uuid("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
  genreId: uuid("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.seriesId, t.genreId] })]);

export const follows = reading.table("follows", {
  userId: text("user_id").notNull(),
  seriesId: uuid("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.seriesId] })]);
