import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Edit2, Check, X } from "lucide-react";
import ContentCard from "@/components/ContentCard";

export default function Profile() {
  const params = useParams<{ id: string }>();
  const userId = parseInt(params.id ?? "0");
  const { user: currentUser, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");

  const { data, isLoading } = trpc.user.getProfile.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const updateBioMutation = trpc.user.updateBio.useMutation({
    onSuccess: () => {
      toast.success("Bio updated");
      setEditingBio(false);
      utils.user.getProfile.invalidate({ userId });
    },
    onError: () => toast.error("Failed to update bio"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-24 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-2xl font-bold mb-2">User not found</h2>
      </div>
    );
  }

  const { user, contents } = data;
  const isOwnProfile = currentUser?.id === userId;

  const startEditBio = () => {
    setBioText(user.bio ?? "");
    setEditingBio(true);
  };

  return (
    <div className="container py-12 max-w-4xl">
      {/* Profile header */}
      <div className="flex items-start gap-6 mb-12">
        <Avatar className="w-20 h-20 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
            {user.name?.charAt(0)?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{user.name ?? "Anonymous"}</h1>
            {isOwnProfile && !editingBio && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-foreground"
                onClick={startEditBio}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {editingBio ? (
            <div className="space-y-2">
              <Textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                placeholder="Tell the community about yourself..."
                className="bg-card border-border/60 focus:border-primary/60 resize-none min-h-20 text-sm"
                maxLength={500}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => updateBioMutation.mutate({ bio: bioText })}
                  disabled={updateBioMutation.isPending}
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => setEditingBio(false)}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {user.bio ?? (isOwnProfile ? "Add a bio to tell the community about yourself..." : "No bio yet.")}
            </p>
          )}

          <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{contents.length}</strong> public works
            </span>
            <span>Joined {new Date(user.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}</span>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div>
        <h2 className="text-xl font-bold mb-6">Published works</h2>
        {contents.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-muted-foreground">
              {isOwnProfile ? "You haven't published anything yet." : "No published works yet."}
            </p>
            {isOwnProfile && (
              <Link href="/create">
                <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
                  Create your first work
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {contents.map((content) => (
              <ContentCard key={content.id} content={content} author={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
