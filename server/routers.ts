import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import {
  addComment,
  createContent,
  deleteComment,
  deleteContent,
  getBookmarkedContents,
  getContentById,
  getContentTags,
  getComments,
  getFollowCounts,
  getRemixes,
  getUserById,
  incrementRemixCount,
  incrementViewCount,
  isBookmarked,
  isFollowing,
  isLiked,
  listFollowingFeed,
  listPopularTags,
  listPublicContents,
  listUserContents,
  setContentTags,
  toggleBookmark,
  toggleFollow,
  toggleLike,
  updateContent,
  updateUserBio,
} from "./db";
import { OUTPUT_FORMATS } from "../drizzle/schema";
import { storagePut } from "./storage";

// ─── Output format schemas ────────────────────────────────────────────────────

const NovelData = z.object({
  chapters: z.array(z.object({ title: z.string(), body: z.string() })),
});

const MangaData = z.object({
  panels: z.array(
    z.object({
      panelNumber: z.number(),
      description: z.string(), // scene description for image gen
      dialogue: z.array(z.object({ character: z.string(), text: z.string() })),
      imageUrl: z.string().optional(),
    })
  ),
  characters: z.array(z.object({ name: z.string(), description: z.string() })),
});

const FlashcardData = z.object({
  cards: z.array(z.object({ question: z.string(), answer: z.string(), hint: z.string().optional() })),
});

const VideoScriptData = z.object({
  scenes: z.array(
    z.object({
      sceneNumber: z.number(),
      visualDescription: z.string(),
      narration: z.string(),
      duration: z.string(),
    })
  ),
  totalDuration: z.string(),
  targetAudience: z.string(),
});

const PoemData = z.object({
  stanzas: z.array(z.object({ lines: z.array(z.string()) })),
  style: z.string(),
  rhythm: z.string().optional(),
});

// ─── AI Generation helpers ────────────────────────────────────────────────────

async function generateNovel(sourceText: string, title: string): Promise<string> {
  const res = await invokeLLM({
    messages: [
      {
        role: "system" as const,
        content: `あなたは優れた小説家です。与えられた情報・テキストを元に、読者が内容を自然に記憶・理解できる短編小説を日本語で書いてください。
必ず以下のJSON形式で返してください:
{
  "chapters": [
    { "title": "章タイトル", "body": "本文（500〜800字）" }
  ]
}
章は2〜4章構成にしてください。`,
      },
      { role: "user" as const, content: `タイトル: ${title}\n\n素材:\n${sourceText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "novel_output",
        strict: true,
        schema: {
          type: "object",
          properties: {
            chapters: {
              type: "array",
              items: {
                type: "object",
                properties: { title: { type: "string" }, body: { type: "string" } },
                required: ["title", "body"],
                additionalProperties: false,
              },
            },
          },
          required: ["chapters"],
          additionalProperties: false,
        },
      },
    },
  });
  return (res.choices[0]?.message?.content as string) ?? "{}";
}

async function generateManga(sourceText: string, title: string): Promise<{ data: string; panels: any[] }> {
  // Step 1: Generate script
  const scriptRes = await invokeLLM({
    messages: [
      {
        role: "system" as const,
        content: `あなたは漫画原作者です。与えられた情報・テキストを元に、読者が内容を楽しく記憶できる漫画のシナリオを日本語で作成してください。
必ず以下のJSON形式で返してください:
{
  "characters": [{ "name": "キャラ名", "description": "外見・性格の説明" }],
  "panels": [
    {
      "panelNumber": 1,
      "description": "コマの場面説明（英語で、画像生成AI向け）",
      "dialogue": [{ "character": "キャラ名", "text": "セリフ" }]
    }
  ]
}
コマ数は6〜10コマにしてください。教育的な内容を自然なストーリーに落とし込んでください。`,
      },
      { role: "user" as const, content: `タイトル: ${title}\n\n素材:\n${sourceText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "manga_script",
        strict: true,
        schema: {
          type: "object",
          properties: {
            characters: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, description: { type: "string" } },
                required: ["name", "description"],
                additionalProperties: false,
              },
            },
            panels: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  panelNumber: { type: "number" },
                  description: { type: "string" },
                  dialogue: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { character: { type: "string" }, text: { type: "string" } },
                      required: ["character", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["panelNumber", "description", "dialogue"],
                additionalProperties: false,
              },
            },
          },
          required: ["characters", "panels"],
          additionalProperties: false,
        },
      },
    },
  });

  const scriptData = JSON.parse((scriptRes.choices[0]?.message?.content as string) ?? "{}");
  const panels = scriptData.panels ?? [];

  // Step 2: Generate images for first 4 panels (to keep cost/time reasonable)
  const panelsWithImages = await Promise.all(
    panels.slice(0, 4).map(async (panel: any, i: number) => {
      try {
        const { url } = await generateImage({
          prompt: `manga style comic panel, black and white ink illustration, ${panel.description}, clean lines, expressive characters, educational content`,
        });
        return { ...panel, imageUrl: url };
      } catch {
        return panel;
      }
    })
  );

  const allPanels = [...panelsWithImages, ...panels.slice(4)];
  const finalData = { ...scriptData, panels: allPanels };
  return { data: JSON.stringify(finalData), panels: allPanels as any[] };
}

async function generateFlashcards(sourceText: string, title: string): Promise<string> {
  const res = await invokeLLM({
    messages: [
      {
        role: "system" as const,
        content: `あなたは優秀な教育者です。与えられたテキストから、学習に最適なフラッシュカードを日本語で作成してください。
必ず以下のJSON形式で返してください:
{
  "cards": [
    { "question": "問い", "answer": "答え", "hint": "ヒント（任意）" }
  ]
}
カード枚数は8〜15枚にしてください。重要な概念・用語・事実を網羅してください。`,
      },
      { role: "user" as const, content: `タイトル: ${title}\n\n素材:\n${sourceText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "flashcard_output",
        strict: true,
        schema: {
          type: "object",
          properties: {
            cards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                  hint: { type: "string" },
                },
                required: ["question", "answer", "hint"],
                additionalProperties: false,
              },
            },
          },
          required: ["cards"],
          additionalProperties: false,
        },
      },
    },
  });
  return (res.choices[0]?.message?.content as string) ?? "{}";
}

async function generateVideoScript(sourceText: string, title: string): Promise<string> {
  const res = await invokeLLM({
    messages: [
      {
        role: "system" as const,
        content: `あなたはYouTubeの教育系動画クリエイターです。与えられた情報を元に、視聴者が楽しく学べる解説動画のスクリプトを日本語で作成してください。
必ず以下のJSON形式で返してください:
{
  "targetAudience": "想定視聴者",
  "totalDuration": "合計時間（例: 5分30秒）",
  "scenes": [
    {
      "sceneNumber": 1,
      "visualDescription": "映像の説明（テロップ・アニメーション・イラスト等）",
      "narration": "ナレーション原稿",
      "duration": "このシーンの時間（例: 30秒）"
    }
  ]
}
シーン数は5〜8シーンにしてください。`,
      },
      { role: "user" as const, content: `タイトル: ${title}\n\n素材:\n${sourceText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "video_script_output",
        strict: true,
        schema: {
          type: "object",
          properties: {
            targetAudience: { type: "string" },
            totalDuration: { type: "string" },
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sceneNumber: { type: "number" },
                  visualDescription: { type: "string" },
                  narration: { type: "string" },
                  duration: { type: "string" },
                },
                required: ["sceneNumber", "visualDescription", "narration", "duration"],
                additionalProperties: false,
              },
            },
          },
          required: ["targetAudience", "totalDuration", "scenes"],
          additionalProperties: false,
        },
      },
    },
  });
  return (res.choices[0]?.message?.content as string) ?? "{}";
}

async function generatePoem(sourceText: string, title: string): Promise<string> {
  const res = await invokeLLM({
    messages: [
      {
        role: "system" as const,
        content: `あなたは詩人です。与えられた情報・テキストを元に、内容を覚えやすい詩（うた）を日本語で作成してください。
必ず以下のJSON形式で返してください:
{
  "style": "詩のスタイル（例: 七五調、自由詩、ラップ等）",
  "rhythm": "リズムの説明",
  "stanzas": [
    { "lines": ["行1", "行2", "行3", "行4"] }
  ]
}
連（スタンザ）は3〜6連にしてください。`,
      },
      { role: "user" as const, content: `タイトル: ${title}\n\n素材:\n${sourceText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "poem_output",
        strict: true,
        schema: {
          type: "object",
          properties: {
            style: { type: "string" },
            rhythm: { type: "string" },
            stanzas: {
              type: "array",
              items: {
                type: "object",
                properties: { lines: { type: "array", items: { type: "string" } } },
                required: ["lines"],
                additionalProperties: false,
              },
            },
          },
          required: ["style", "rhythm", "stanzas"],
          additionalProperties: false,
        },
      },
    },
  });
  return (res.choices[0]?.message?.content as string) ?? "{}";
}

// ─── Remix text extraction ───────────────────────────────────────────────────

function extractTextFromOutputData(outputData: string, format: string): string {
  try {
    const data = JSON.parse(outputData);
    switch (format) {
      case "novel":
        return (data.chapters ?? []).map((ch: any) => `${ch.title}\n${ch.body}`).join("\n\n");
      case "manga":
        return (data.panels ?? [])
          .map((p: any) => {
            const dialogues = (p.dialogue ?? []).map((d: any) => `${d.character}: ${d.text}`).join("\n");
            return `${p.description}\n${dialogues}`;
          })
          .join("\n\n");
      case "flashcard":
        return (data.cards ?? []).map((c: any) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n");
      case "video_script":
        return (data.scenes ?? []).map((s: any) => s.narration).join("\n\n");
      case "poem":
        return (data.stanzas ?? []).map((s: any) => (s.lines ?? []).join("\n")).join("\n\n");
      default:
        return outputData;
    }
  } catch {
    return outputData;
  }
}

// ─── Routers ──────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Content generation ─────────────────────────────────────────────────
  content: router({
    generate: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          description: z.string().optional(),
          sourceText: z.string().min(10).max(10000),
          outputFormat: z.enum(OUTPUT_FORMATS),
          tags: z.array(z.string()).max(5).default([]),
          isPublic: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Create placeholder record
        const contentId = await createContent({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          sourceText: input.sourceText,
          outputFormat: input.outputFormat,
          outputData: "{}",
          isPublic: input.isPublic,
          status: "generating",
        });

        try {
          let outputData: string;

          switch (input.outputFormat) {
            case "novel":
              outputData = await generateNovel(input.sourceText, input.title);
              break;
            case "manga":
              const mangaResult = await generateManga(input.sourceText, input.title);
              outputData = mangaResult.data;
              break;
            case "flashcard":
              outputData = await generateFlashcards(input.sourceText, input.title);
              break;
            case "video_script":
              outputData = await generateVideoScript(input.sourceText, input.title);
              break;
            case "poem":
              outputData = await generatePoem(input.sourceText, input.title);
              break;
            default:
              throw new Error("Unsupported format");
          }

          // Generate cover image
          let coverImageUrl: string | undefined;
          try {
            const coverPrompt = `${input.outputFormat} cover art for "${input.title}", artistic, colorful, educational, modern illustration style`;
            const { url } = await generateImage({ prompt: coverPrompt });
            coverImageUrl = url;
          } catch {
            // cover image is optional
          }

          await updateContent(contentId, {
            outputData,
            coverImageUrl,
            status: "completed",
          });

          if (input.tags.length > 0) {
            await setContentTags(contentId, input.tags);
          }

          return { contentId, status: "completed" };
        } catch (err) {
          await updateContent(contentId, { status: "failed" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Generation failed" });
        }
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const content = await getContentById(input.id);
        if (!content) throw new TRPCError({ code: "NOT_FOUND" });
        if (!content.isPublic && content.userId !== ctx.user?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await incrementViewCount(input.id);
        const contentTags = await getContentTags(input.id);
        const author = await getUserById(content.userId);
        const liked = ctx.user ? await isLiked(ctx.user.id, input.id) : false;
        const bookmarked = ctx.user ? await isBookmarked(ctx.user.id, input.id) : false;
        return { content, author, tags: contentTags, liked, bookmarked };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          isPublic: z.boolean().optional(),
          tags: z.array(z.string()).max(5).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const content = await getContentById(input.id);
        if (!content) throw new TRPCError({ code: "NOT_FOUND" });
        if (content.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await updateContent(input.id, {
          title: input.title,
          description: input.description,
          isPublic: input.isPublic,
        });
        if (input.tags) await setContentTags(input.id, input.tags);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteContent(input.id, ctx.user.id);
        return { success: true };
      }),

    // ─── Discovery ────────────────────────────────────────────────────────
    discover: publicProcedure
      .input(
        z.object({
          format: z.enum(OUTPUT_FORMATS).optional(),
          keyword: z.string().optional(),
          tagName: z.string().optional(),
          sortBy: z.enum(["recent", "trending", "top"]).default("recent"),
          period: z.enum(["week", "month", "all"]).default("all"),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return listPublicContents(input);
      }),

    popularTags: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ input }) => {
        return listPopularTags(input?.limit ?? 20);
      }),

    // ─── My library ───────────────────────────────────────────────────────
    myLibrary: protectedProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        const items = await listUserContents(ctx.user.id, input);
        return items;
      }),

    // ─── Comments ─────────────────────────────────────────────────────────
    getComments: publicProcedure
      .input(z.object({ contentId: z.number() }))
      .query(async ({ input }) => {
        return getComments(input.contentId);
      }),

    addComment: protectedProcedure
      .input(z.object({ contentId: z.number(), body: z.string().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        await addComment(ctx.user.id, input.contentId, input.body);
        return { success: true };
      }),

    deleteComment: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteComment(input.commentId, ctx.user.id);
        return { success: true };
      }),

    // ─── Likes ────────────────────────────────────────────────────────────
    toggleLike: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const liked = await toggleLike(ctx.user.id, input.contentId);
        return { liked };
      }),

    // ─── Bookmarks ────────────────────────────────────────────────────────
    toggleBookmark: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const bookmarked = await toggleBookmark(ctx.user.id, input.contentId);
        return { bookmarked };
      }),

    myBookmarks: protectedProcedure.query(async ({ ctx }) => {
      return getBookmarkedContents(ctx.user.id);
    }),

    // ─── Remix ──────────────────────────────────────────────────────────
    remix: protectedProcedure
      .input(
        z.object({
          contentId: z.number(),
          targetFormat: z.enum(OUTPUT_FORMATS),
          title: z.string().min(1).max(255).optional(),
          tags: z.array(z.string()).max(5).default([]),
          isPublic: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const original = await getContentById(input.contentId);
        if (!original) throw new TRPCError({ code: "NOT_FOUND" });
        if (!original.isPublic && original.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.targetFormat === original.outputFormat) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Target format must differ from original" });
        }

        const sourceText = extractTextFromOutputData(original.outputData, original.outputFormat);
        const title = input.title ?? `${original.title} (${input.targetFormat.replace("_", " ")})`;

        const contentId = await createContent({
          userId: ctx.user.id,
          title,
          description: `Remixed from "${original.title}"`,
          sourceText,
          outputFormat: input.targetFormat,
          outputData: "{}",
          isPublic: input.isPublic,
          status: "generating",
          parentContentId: original.id,
        });

        try {
          let outputData: string;
          switch (input.targetFormat) {
            case "novel":
              outputData = await generateNovel(sourceText, title);
              break;
            case "manga":
              const mangaResult = await generateManga(sourceText, title);
              outputData = mangaResult.data;
              break;
            case "flashcard":
              outputData = await generateFlashcards(sourceText, title);
              break;
            case "video_script":
              outputData = await generateVideoScript(sourceText, title);
              break;
            case "poem":
              outputData = await generatePoem(sourceText, title);
              break;
            default:
              throw new Error("Unsupported format");
          }

          let coverImageUrl: string | undefined;
          try {
            const coverPrompt = `${input.targetFormat} cover art for "${title}", artistic, colorful, educational, modern illustration style`;
            const { url } = await generateImage({ prompt: coverPrompt });
            coverImageUrl = url;
          } catch {}

          await updateContent(contentId, { outputData, coverImageUrl, status: "completed" });
          if (input.tags.length > 0) await setContentTags(contentId, input.tags);
          await incrementRemixCount(original.id);

          return { contentId, status: "completed" };
        } catch (err) {
          await updateContent(contentId, { status: "failed" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Remix generation failed" });
        }
      }),

    getRemixes: publicProcedure
      .input(z.object({ contentId: z.number() }))
      .query(async ({ input }) => {
        return getRemixes(input.contentId);
      }),

    // ─── Feed ───────────────────────────────────────────────────────────
    feed: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        return listFollowingFeed(ctx.user.id, input);
      }),
  }),

  // ─── User profile ──────────────────────────────────────────────────────────
  user: router({
    getProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        const user = await getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });
        const userContents = await listUserContents(input.userId, { limit: 20 });
        const publicContents = userContents.filter((c) => c.isPublic && c.status === "completed");
        const followCounts = await getFollowCounts(input.userId);
        const following = ctx.user ? await isFollowing(ctx.user.id, input.userId) : false;
        return { user, contents: publicContents, followCounts, following };
      }),

    updateBio: protectedProcedure
      .input(z.object({ bio: z.string().max(500) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserBio(ctx.user.id, input.bio);
        return { success: true };
      }),

    toggleFollow: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot follow yourself" });
        }
        const following = await toggleFollow(ctx.user.id, input.userId);
        return { following };
      }),
  }),
});

export type AppRouter = typeof appRouter;
