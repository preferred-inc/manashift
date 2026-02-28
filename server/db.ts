import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Bookmark,
  Comment,
  Content,
  InsertContent,
  InsertUser,
  Like,
  Tag,
  bookmarks,
  comments,
  contentTags,
  contents,
  likes,
  tags,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserBio(userId: number, bio: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ bio }).where(eq(users.id, userId));
}

// ─── Contents ────────────────────────────────────────────────────────────────

export async function createContent(data: InsertContent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(contents).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateContent(
  id: number,
  data: Partial<Pick<Content, "title" | "description" | "outputData" | "coverImageUrl" | "status" | "isPublic">>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(contents).set(data).where(eq(contents.id, id));
}

export async function getContentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contents).where(eq(contents.id, id)).limit(1);
  return result[0];
}

export async function deleteContent(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contents).where(and(eq(contents.id, id), eq(contents.userId, userId)));
}

export async function incrementViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contents).set({ viewCount: sql`${contents.viewCount} + 1` }).where(eq(contents.id, id));
}

// List public contents (discover feed)
export async function listPublicContents(opts: {
  format?: string;
  tagName?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  let query = db
    .select({
      content: contents,
      author: { id: users.id, name: users.name },
    })
    .from(contents)
    .innerJoin(users, eq(contents.userId, users.id))
    .where(
      and(
        eq(contents.isPublic, true),
        eq(contents.status, "completed"),
        opts.format ? eq(contents.outputFormat, opts.format as any) : undefined,
        opts.keyword
          ? or(
              like(contents.title, `%${opts.keyword}%`),
              like(contents.description, `%${opts.keyword}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(contents.createdAt))
    .limit(limit)
    .offset(offset);

  return query;
}

// List user's own contents
export async function listUserContents(userId: number, opts?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contents)
    .where(eq(contents.userId, userId))
    .orderBy(desc(contents.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getOrCreateTag(name: string): Promise<Tag> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(tags).values({ name });
  const created = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
  return created[0]!;
}

export async function setContentTags(contentId: number, tagNames: string[]) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contentTags).where(eq(contentTags.contentId, contentId));
  for (const name of tagNames) {
    const tag = await getOrCreateTag(name);
    await db.insert(contentTags).values({ contentId, tagId: tag.id });
  }
}

export async function getContentTags(contentId: number): Promise<Tag[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ tag: tags })
    .from(contentTags)
    .innerJoin(tags, eq(contentTags.tagId, tags.id))
    .where(eq(contentTags.contentId, contentId));
  return rows.map((r) => r.tag);
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function toggleLike(userId: number, contentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.contentId, contentId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.contentId, contentId)));
    await db.update(contents).set({ likeCount: sql`${contents.likeCount} - 1` }).where(eq(contents.id, contentId));
    return false;
  } else {
    await db.insert(likes).values({ userId, contentId });
    await db.update(contents).set({ likeCount: sql`${contents.likeCount} + 1` }).where(eq(contents.id, contentId));
    return true;
  }
}

export async function isLiked(userId: number, contentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.contentId, contentId)))
    .limit(1);
  return !!result[0];
}

export async function getLikedContentIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ contentId: likes.contentId }).from(likes).where(eq(likes.userId, userId));
  return rows.map((r) => r.contentId);
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export async function toggleBookmark(userId: number, contentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.contentId, contentId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.contentId, contentId)));
    return false;
  } else {
    await db.insert(bookmarks).values({ userId, contentId });
    return true;
  }
}

export async function isBookmarked(userId: number, contentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.contentId, contentId)))
    .limit(1);
  return !!result[0];
}

export async function getBookmarkedContents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ content: contents })
    .from(bookmarks)
    .innerJoin(contents, eq(bookmarks.contentId, contents.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addComment(userId: number, contentId: number, body: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(comments).values({ userId, contentId, body });
  await db.update(contents).set({ commentCount: sql`${contents.commentCount} + 1` }).where(eq(contents.id, contentId));
}

export async function deleteComment(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const comment = await db.select().from(comments).where(and(eq(comments.id, id), eq(comments.userId, userId))).limit(1);
  if (!comment[0]) return;
  await db.delete(comments).where(eq(comments.id, id));
  await db
    .update(contents)
    .set({ commentCount: sql`${contents.commentCount} - 1` })
    .where(eq(contents.id, comment[0].contentId));
}

export async function getComments(contentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ comment: comments, author: { id: users.id, name: users.name } })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.contentId, contentId))
    .orderBy(desc(comments.createdAt));
}
