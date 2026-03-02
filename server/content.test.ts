import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test",
        email: "t@t.com",
        name: "T",
        loginMethod: "manus",
        role: "user",
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => cleared.push(name),
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBe(1);
  });
});

describe("content router - input validation", () => {
  it("generate rejects empty title", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.content.generate({
        title: "",
        sourceText: "Some content to transform",
        outputFormat: "novel",
        tags: [],
        isPublic: false,
      })
    ).rejects.toThrow();
  });

  it("generate rejects too-short sourceText", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.content.generate({
        title: "Test Title",
        sourceText: "short",
        outputFormat: "poem",
        tags: [],
        isPublic: false,
      })
    ).rejects.toThrow();
  });

  it("generate rejects invalid outputFormat", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.content.generate({
        title: "Test",
        sourceText: "Some long enough content here for testing",
        outputFormat: "invalid_format" as any,
        tags: [],
        isPublic: false,
      })
    ).rejects.toThrow();
  });

  it("generate rejects too many tags", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.content.generate({
        title: "Test",
        sourceText: "Some long enough content here for testing",
        outputFormat: "novel",
        tags: ["a", "b", "c", "d", "e", "f"], // 6 tags, max is 5
        isPublic: false,
      })
    ).rejects.toThrow();
  });
});

describe("content router - auth protection", () => {
  it("generate requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.content.generate({
        title: "Test",
        sourceText: "Some long enough content here",
        outputFormat: "novel",
        tags: [],
        isPublic: false,
      })
    ).rejects.toThrow();
  });

  it("toggleLike requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.content.toggleLike({ contentId: 1 })).rejects.toThrow();
  });

  it("toggleBookmark requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.content.toggleBookmark({ contentId: 1 })).rejects.toThrow();
  });

  it("addComment requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.content.addComment({ contentId: 1, body: "test comment" })
    ).rejects.toThrow();
  });

  it("myLibrary requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.content.myLibrary({ limit: 10, offset: 0 })).rejects.toThrow();
  });
});

describe("user router - input validation", () => {
  it("updateBio rejects bio over 500 chars", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.user.updateBio({ bio: "a".repeat(501) })
    ).rejects.toThrow();
  });

  it("updateBio requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.user.updateBio({ bio: "hello" })).rejects.toThrow();
  });
});

// ─── v1.1 Feature Tests ──────────────────────────────────────────────────────

describe("content.remix - auth protection", () => {
  it("remix requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.content.remix({ contentId: 1, targetFormat: "flashcard", tags: [], isPublic: false })
    ).rejects.toThrow();
  });

  it("remix rejects invalid targetFormat", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.content.remix({ contentId: 1, targetFormat: "invalid" as any, tags: [], isPublic: false })
    ).rejects.toThrow();
  });

  it("remix rejects too many tags", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.content.remix({ contentId: 1, targetFormat: "novel", tags: ["a", "b", "c", "d", "e", "f"], isPublic: false })
    ).rejects.toThrow();
  });
});

describe("content.feed - auth protection", () => {
  it("feed requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.content.feed({ limit: 10, offset: 0 })).rejects.toThrow();
  });
});

describe("user.toggleFollow - auth protection", () => {
  it("toggleFollow requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.user.toggleFollow({ userId: 2 })).rejects.toThrow();
  });

  it("toggleFollow rejects self-follow", async () => {
    const caller = appRouter.createCaller(createAuthContext({ id: 1 }));
    await expect(caller.user.toggleFollow({ userId: 1 })).rejects.toThrow();
  });
});

describe("content.discover - input validation", () => {
  it("discover accepts sortBy parameter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // Should not throw with valid sortBy
    await expect(
      caller.content.discover({ sortBy: "invalid_sort" as any, limit: 10, offset: 0, period: "all" })
    ).rejects.toThrow();
  });

  it("discover accepts period parameter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.content.discover({ sortBy: "trending", period: "invalid_period" as any, limit: 10, offset: 0 })
    ).rejects.toThrow();
  });
});

// ─── v1.2 Feature Tests ──────────────────────────────────────────────────────

describe("content.uploadFile - auth & validation", () => {
  it("uploadFile requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.content.uploadFile({ fileBase64: "dGVzdA==", fileName: "test.png", mimeType: "image/png" })
    ).rejects.toThrow();
  });

  it("uploadFile rejects invalid mimeType", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.content.uploadFile({ fileBase64: "dGVzdA==", fileName: "test.txt", mimeType: "text/plain" as any })
    ).rejects.toThrow();
  });
});

describe("content.extractText - auth & validation", () => {
  it("extractText requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.content.extractText({ source: "url", url: "https://example.com" })
    ).rejects.toThrow();
  });

  it("extractText rejects invalid source", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.content.extractText({ source: "invalid" as any, url: "https://example.com" })
    ).rejects.toThrow();
  });

  it("extractText rejects empty url", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.content.extractText({ source: "image", url: "" })
    ).rejects.toThrow();
  });
});
