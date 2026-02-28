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
