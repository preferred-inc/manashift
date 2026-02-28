import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, Loader2, Lock, Globe, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FORMAT_EMOJI: Record<string, string> = {
  novel: "📖",
  manga: "🎌",
  flashcard: "🃏",
  video_script: "🎬",
  poem: "✍️",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  generating: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  pending: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function Library() {
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();

  const { data: myContents, isLoading } = trpc.content.myLibrary.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated }
  );

  const { data: bookmarked } = trpc.content.myBookmarks.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success("Content deleted");
      utils.content.myLibrary.invalidate();
    },
    onError: () => toast.error("Failed to delete"),
  });

  if (!isAuthenticated) {
    return (
      <div className="container py-32 text-center">
        <div className="text-6xl mb-6">📚</div>
        <h2 className="text-2xl font-bold mb-3">Sign in to view your library</h2>
        <p className="text-muted-foreground mb-8">Your created content will appear here.</p>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => (window.location.href = getLoginUrl())}
        >
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Library</h1>
          <p className="text-muted-foreground">All your created content</p>
        </div>
        <Link href="/create">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4" />
            Create new
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !myContents || myContents.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border/60 rounded-2xl">
          <div className="text-5xl mb-4">✨</div>
          <h3 className="text-xl font-semibold mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-6">Create your first piece of content to get started.</p>
          <Link href="/create">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4" />
              Create something
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myContents.map((content) => (
            <div
              key={content.id}
              className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-primary/30 transition-colors"
            >
              {/* Format icon */}
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                {FORMAT_EMOJI[content.outputFormat] ?? "📄"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">{content.title}</h3>
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 ${STATUS_COLOR[content.status]}`}
                  >
                    {content.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {content.isPublic ? (
                      <><Globe className="w-3 h-3" /> Public</>
                    ) : (
                      <><Lock className="w-3 h-3" /> Private</>
                    )}
                  </span>
                  <span>{content.outputFormat.replace("_", " ")}</span>
                  <span>{new Date(content.createdAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {content.status === "completed" && (
                  <Link href={`/content/${content.id}`}>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete content?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. "{content.title}" will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        onClick={() => deleteMutation.mutate({ id: content.id })}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bookmarked section */}
      {bookmarked && bookmarked.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold mb-6">Bookmarked</h2>
          <div className="space-y-3">
            {bookmarked.map(({ content }) => (
              <Link key={content.id} href={`/content/${content.id}`}>
                <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                    {FORMAT_EMOJI[content.outputFormat] ?? "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{content.title}</h3>
                    <p className="text-xs text-muted-foreground">{content.outputFormat.replace("_", " ")}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
