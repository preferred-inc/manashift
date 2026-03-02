import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Heart, Bookmark, MessageCircle, Eye, ArrowLeft, Loader2, Send, Trash2, Globe, Lock, Shuffle, GitFork } from "lucide-react";
import { useLocation } from "wouter";
import ContentCard from "@/components/ContentCard";

// ─── Format Viewers ────────────────────────────────────────────────────────────

function NovelViewer({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      {(data.chapters ?? []).map((ch: any, i: number) => (
        <div key={i}>
          <h2 className="text-xl font-bold mb-4 text-primary">{ch.title}</h2>
          <p className="text-foreground leading-8 whitespace-pre-wrap font-serif text-base">{ch.body}</p>
        </div>
      ))}
    </div>
  );
}

function MangaViewer({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      {/* Characters */}
      {data.characters && data.characters.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="font-bold mb-3 text-sm text-muted-foreground uppercase tracking-wider">Characters</h3>
          <div className="flex flex-wrap gap-3">
            {data.characters.map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panels */}
      <div className="space-y-6">
        {(data.panels ?? []).map((panel: any) => (
          <div key={panel.panelNumber} className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-muted/30">
              <span className="text-xs font-mono text-muted-foreground">Panel {panel.panelNumber}</span>
            </div>
            {panel.imageUrl && (
              <img
                src={panel.imageUrl}
                alt={`Panel ${panel.panelNumber}`}
                className="w-full max-h-80 object-cover"
              />
            )}
            <div className="p-4">
              <p className="text-xs text-muted-foreground italic mb-3">{panel.description}</p>
              {panel.dialogue && panel.dialogue.length > 0 && (
                <div className="space-y-2">
                  {panel.dialogue.map((d: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-xs font-bold text-primary shrink-0 pt-0.5">{d.character}:</span>
                      <span className="text-sm">「{d.text}」</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlashcardViewer({ data }: { data: any }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [current, setCurrent] = useState(0);
  const cards = data.cards ?? [];

  if (cards.length === 0) return <p className="text-muted-foreground">No cards generated.</p>;

  const card = cards[current];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Card {current + 1} of {cards.length}</span>
        <div className="flex gap-1">
          {cards.map((_: any, i: number) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setFlipped({}); }}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        className="relative min-h-48 rounded-2xl border border-border/60 bg-card p-8 cursor-pointer hover:border-primary/40 transition-all flex flex-col items-center justify-center text-center"
        onClick={() => setFlipped((prev) => ({ ...prev, [current]: !prev[current] }))}
      >
        {!flipped[current] ? (
          <>
            <div className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">Question</div>
            <p className="text-xl font-semibold">{card.question}</p>
            {card.hint && (
              <p className="text-sm text-muted-foreground mt-4">Hint: {card.hint}</p>
            )}
            <p className="text-xs text-muted-foreground mt-6">Tap to reveal answer</p>
          </>
        ) : (
          <>
            <div className="text-xs text-primary mb-4 uppercase tracking-wider">Answer</div>
            <p className="text-xl font-semibold text-primary">{card.answer}</p>
            <p className="text-xs text-muted-foreground mt-6">Tap to flip back</p>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 justify-center">
        <Button
          variant="outline"
          onClick={() => { setCurrent(Math.max(0, current - 1)); setFlipped({}); }}
          disabled={current === 0}
          className="border-border/60"
        >
          ← Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => { setCurrent(Math.min(cards.length - 1, current + 1)); setFlipped({}); }}
          disabled={current === cards.length - 1}
          className="border-border/60"
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

function VideoScriptViewer({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-muted/30 border border-border/60">
        <div>
          <span className="text-xs text-muted-foreground">Target Audience</span>
          <p className="text-sm font-medium">{data.targetAudience}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Total Duration</span>
          <p className="text-sm font-medium">{data.totalDuration}</p>
        </div>
      </div>
      {(data.scenes ?? []).map((scene: any) => (
        <div key={scene.sceneNumber} className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {scene.sceneNumber}
            </div>
            <span className="text-xs text-muted-foreground">{scene.duration}</span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Visual</p>
              <p className="text-sm bg-muted/40 rounded-lg p-3 italic">{scene.visualDescription}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Narration</p>
              <p className="text-sm leading-relaxed">{scene.narration}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PoemViewer({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Style: <strong className="text-foreground">{data.style}</strong></span>
        {data.rhythm && <span>Rhythm: <strong className="text-foreground">{data.rhythm}</strong></span>}
      </div>
      <div className="space-y-8">
        {(data.stanzas ?? []).map((stanza: any, i: number) => (
          <div key={i} className="space-y-2">
            {stanza.lines.map((line: string, j: number) => (
              <p key={j} className="text-lg font-serif leading-relaxed">{line}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentViewer({ format, outputData }: { format: string; outputData: string }) {
  let data: any = {};
  try { data = JSON.parse(outputData); } catch {}

  switch (format) {
    case "novel": return <NovelViewer data={data} />;
    case "manga": return <MangaViewer data={data} />;
    case "flashcard": return <FlashcardViewer data={data} />;
    case "video_script": return <VideoScriptViewer data={data} />;
    case "poem": return <PoemViewer data={data} />;
    default: return <pre className="text-sm text-muted-foreground whitespace-pre-wrap">{outputData}</pre>;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const REMIX_FORMATS = [
  { value: "novel", label: "📖 Novel" },
  { value: "manga", label: "🎌 Manga" },
  { value: "flashcard", label: "🃏 Flashcard" },
  { value: "video_script", label: "🎬 Video Script" },
  { value: "poem", label: "✍️ Poem" },
] as const;

export default function ContentDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [commentText, setCommentText] = useState("");
  const [showRemixMenu, setShowRemixMenu] = useState(false);

  const { data, isLoading, error } = trpc.content.getById.useQuery({ id }, { enabled: !!id });
  const { data: comments, isLoading: commentsLoading } = trpc.content.getComments.useQuery({ contentId: id }, { enabled: !!id });
  const { data: remixes } = trpc.content.getRemixes.useQuery({ contentId: id }, { enabled: !!id });

  const likeMutation = trpc.content.toggleLike.useMutation({
    onSuccess: (res) => {
      utils.content.getById.invalidate({ id });
      toast.success(res.liked ? "Liked!" : "Unliked");
    },
  });

  const bookmarkMutation = trpc.content.toggleBookmark.useMutation({
    onSuccess: (res) => {
      utils.content.getById.invalidate({ id });
      toast.success(res.bookmarked ? "Bookmarked!" : "Removed from bookmarks");
    },
  });

  const remixMutation = trpc.content.remix.useMutation({
    onSuccess: (res) => {
      toast.success("Remix created!");
      navigate(`/content/${res.contentId}`);
    },
    onError: () => toast.error("Remix failed"),
  });

  const commentMutation = trpc.content.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.content.getComments.invalidate({ contentId: id });
      utils.content.getById.invalidate({ id });
      toast.success("Comment added");
    },
  });

  const deleteCommentMutation = trpc.content.deleteComment.useMutation({
    onSuccess: () => {
      utils.content.getComments.invalidate({ contentId: id });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-24 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-2xl font-bold mb-2">Content not found</h2>
        <Link href="/discover">
          <Button variant="outline" className="mt-4">Back to Discover</Button>
        </Link>
      </div>
    );
  }

  const { content, author, liked, bookmarked } = data;

  return (
    <div className="container py-10 max-w-4xl">
      {/* Back */}
      <Link href="/discover">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground mb-8 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/10">
                {content.outputFormat.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-xs border-border/60 text-muted-foreground">
                {content.isPublic ? <><Globe className="w-3 h-3 mr-1" />Public</> : <><Lock className="w-3 h-3 mr-1" />Private</>}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
            {content.description && (
              <p className="text-muted-foreground">{content.description}</p>
            )}
          </div>
          {content.coverImageUrl && (
            <img
              src={content.coverImageUrl}
              alt={content.title}
              className="w-24 h-24 rounded-xl object-cover shrink-0 border border-border/60"
            />
          )}
        </div>

        {/* Author & stats */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link href={`/profile/${author?.id}`}>
            <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {author?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{author?.name ?? "Anonymous"}</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />{content.viewCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              className={`gap-2 border-border/60 ${liked ? "text-rose-400 border-rose-400/40 bg-rose-400/10" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => {
                if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                likeMutation.mutate({ contentId: id });
              }}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              {content.likeCount}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`gap-2 border-border/60 ${bookmarked ? "text-amber-400 border-amber-400/40 bg-amber-400/10" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => {
                if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                bookmarkMutation.mutate({ contentId: id });
              }}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
              Save
            </Button>
            {/* Remix button */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                onClick={() => {
                  if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                  setShowRemixMenu(!showRemixMenu);
                }}
                disabled={remixMutation.isPending}
              >
                {remixMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shuffle className="w-4 h-4" />
                )}
                Remix
                {(content as any).remixCount > 0 && <span className="text-xs opacity-70">{(content as any).remixCount}</span>}
              </Button>
              {showRemixMenu && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border/60 rounded-xl shadow-xl p-2 min-w-44">
                  <p className="text-xs text-muted-foreground px-3 py-1.5 font-medium">Convert to:</p>
                  {REMIX_FORMATS
                    .filter((f) => f.value !== content.outputFormat)
                    .map((f) => (
                      <button
                        key={f.value}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setShowRemixMenu(false);
                          remixMutation.mutate({ contentId: id, targetFormat: f.value, isPublic: true });
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Remix source link */}
      {(content as any).parentContentId && (
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <GitFork className="w-4 h-4" />
          <span>Remixed from</span>
          <Link href={`/content/${(content as any).parentContentId}`}>
            <span className="text-primary hover:underline cursor-pointer">original content</span>
          </Link>
        </div>
      )}

      {/* Content viewer */}
      <div className="rounded-2xl border border-border/60 bg-card p-8 mb-10">
        <ContentViewer format={content.outputFormat} outputData={content.outputData} />
      </div>

      {/* Remixes */}
      {remixes && remixes.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Shuffle className="w-5 h-5" />
            Remixes ({remixes.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {remixes.map((item) => (
              <ContentCard key={item.content.id} content={item.content} author={item.author} />
            ))}
          </div>
        </div>
      )}

      {/* Source text (collapsed) */}
      <details className="mb-10 rounded-xl border border-border/60 bg-card">
        <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          View source text
        </summary>
        <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{content.sourceText}</p>
        </div>
      </details>

      {/* Comments */}
      <div>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comments ({content.commentCount})
        </h2>

        {/* Add comment */}
        {isAuthenticated ? (
          <div className="flex gap-3 mb-8">
            <Avatar className="w-8 h-8 shrink-0 mt-1">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="bg-card border-border/60 focus:border-primary/60 resize-none min-h-20"
                maxLength={1000}
              />
              <Button
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!commentText.trim() || commentMutation.isPending}
                onClick={() => commentMutation.mutate({ contentId: id, body: commentText })}
              >
                <Send className="w-3.5 h-3.5" />
                Post comment
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 rounded-xl border border-border/60 bg-card text-center">
            <p className="text-sm text-muted-foreground mb-3">Sign in to leave a comment</p>
            <Button
              size="sm"
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => (window.location.href = getLoginUrl())}
            >
              Sign in
            </Button>
          </div>
        )}

        {/* Comment list */}
        {commentsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !comments || comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-5">
            {comments.map(({ comment, author: commentAuthor }) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                    {commentAuthor.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{commentAuthor.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{comment.body}</p>
                </div>
                {user?.id === comment.userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteCommentMutation.mutate({ commentId: comment.id })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
