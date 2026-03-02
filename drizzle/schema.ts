import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Output format types
export const OUTPUT_FORMATS = ["novel", "manga", "flashcard", "video_script", "poem"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

// Contents table - stores generated content of any format
export const contents = mysqlTable("contents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  // Input
  sourceText: text("sourceText"),
  sourceImageUrl: text("sourceImageUrl"),
  // Output
  outputFormat: mysqlEnum("outputFormat", OUTPUT_FORMATS).notNull(),
  outputData: text("outputData").notNull(), // JSON string of format-specific data
  coverImageUrl: text("coverImageUrl"),
  // Settings
  isPublic: boolean("isPublic").default(false).notNull(),
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"])
    .default("pending")
    .notNull(),
  // Remix
  parentContentId: int("parentContentId"),
  remixCount: int("remixCount").default(0).notNull(),
  // Stats
  viewCount: int("viewCount").default(0).notNull(),
  likeCount: int("likeCount").default(0).notNull(),
  commentCount: int("commentCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Content = typeof contents.$inferSelect;
export type InsertContent = typeof contents.$inferInsert;

// Tags
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;

// Content-Tag junction
export const contentTags = mysqlTable("contentTags", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull(),
  tagId: int("tagId").notNull(),
});

// Likes
export const likes = mysqlTable("likes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contentId: int("contentId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Like = typeof likes.$inferSelect;

// Comments
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contentId: int("contentId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;

// Bookmarks
export const bookmarks = mysqlTable("bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contentId: int("contentId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bookmark = typeof bookmarks.$inferSelect;

// Follows
export const follows = mysqlTable("follows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  followedUserId: int("followedUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Follow = typeof follows.$inferSelect;
