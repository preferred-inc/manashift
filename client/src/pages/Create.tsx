import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Sparkles, Loader2, X, Lock, Globe } from "lucide-react";

const OUTPUT_FORMATS = [
  { value: "novel", label: "📖 Novel", desc: "Short story format" },
  { value: "manga", label: "🎌 Manga", desc: "Comic panels with AI art" },
  { value: "flashcard", label: "🃏 Flashcard", desc: "Q&A study cards" },
  { value: "video_script", label: "🎬 Video Script", desc: "YouTube explainer" },
  { value: "poem", label: "✍️ Poem", desc: "Verse & rhythm" },
] as const;

type OutputFormat = (typeof OUTPUT_FORMATS)[number]["value"];

export default function Create() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("novel");
  const [isPublic, setIsPublic] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const generateMutation = trpc.content.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Content generated successfully!");
      navigate(`/content/${data.contentId}`);
    },
    onError: (err) => {
      toast.error("Generation failed: " + err.message);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="container py-32 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-6">✨</div>
          <h2 className="text-2xl font-bold mb-3">Sign in to create</h2>
          <p className="text-muted-foreground mb-8">
            Create an account to start transforming your content into any format.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            Sign in to get started
          </Button>
        </div>
      </div>
    );
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, "");
      if (!tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sourceText.trim()) {
      toast.error("Title and content are required");
      return;
    }
    generateMutation.mutate({ title, description, sourceText, outputFormat, tags, isPublic });
  };

  const isLoading = generateMutation.isPending;

  return (
    <div className="container py-12 max-w-3xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Create new content</h1>
        <p className="text-muted-foreground">Transform your ideas into any format with AI</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g. The French Revolution"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-card border-border/60 focus:border-primary/60"
            maxLength={255}
            disabled={isLoading}
          />
        </div>

        {/* Source text */}
        <div className="space-y-2">
          <Label htmlFor="sourceText" className="text-sm font-medium">
            Content to transform <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="sourceText"
            placeholder="Paste your text here — notes, articles, study material, anything you want to transform..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="bg-card border-border/60 focus:border-primary/60 min-h-48 resize-none"
            maxLength={10000}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground text-right">{sourceText.length}/10000</p>
        </div>

        {/* Output format */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Output format</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {OUTPUT_FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                type="button"
                onClick={() => setOutputFormat(fmt.value)}
                disabled={isLoading}
                className={`relative rounded-xl border p-4 text-left transition-all duration-150 ${
                  outputFormat === fmt.value
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                    : "border-border/60 bg-card hover:border-primary/40 hover:bg-card/80"
                }`}
              >
                <div className="text-2xl mb-2">{fmt.label.split(" ")[0]}</div>
                <div className="font-medium text-sm">{fmt.label.split(" ").slice(1).join(" ")}</div>
                <div className="text-xs text-muted-foreground mt-1">{fmt.desc}</div>
                {outputFormat === fmt.value && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Brief description of what this content is about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-card border-border/60 focus:border-primary/60 min-h-20 resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Tags <span className="text-muted-foreground font-normal">(up to 5, press Enter)</span>
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pl-3 pr-2 py-1">
                #{tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          {tags.length < 5 && (
            <Input
              placeholder="Add a tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="bg-card border-border/60 focus:border-primary/60"
              disabled={isLoading}
            />
          )}
        </div>

        {/* Visibility */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            {isPublic ? (
              <Globe className="w-5 h-5 text-primary" />
            ) : (
              <Lock className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <div className="font-medium text-sm">{isPublic ? "Public" : "Private"}</div>
              <div className="text-xs text-muted-foreground">
                {isPublic ? "Visible to everyone in the community" : "Only visible to you"}
              </div>
            </div>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={isLoading} />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          disabled={isLoading || !title.trim() || !sourceText.trim()}
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-14 text-base"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating with AI...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate {OUTPUT_FORMATS.find((f) => f.value === outputFormat)?.label}
            </>
          )}
        </Button>

        {isLoading && (
          <p className="text-center text-sm text-muted-foreground animate-pulse">
            AI is transforming your content — this may take 30–60 seconds...
          </p>
        )}
      </form>
    </div>
  );
}
