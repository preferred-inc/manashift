import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Search, Loader2, TrendingUp, Clock, Trophy, Tag, X } from "lucide-react";
import ContentCard from "@/components/ContentCard";

const FORMAT_FILTERS = [
  { value: undefined, label: "All" },
  { value: "novel", label: "📖 Novel" },
  { value: "manga", label: "🎌 Manga" },
  { value: "flashcard", label: "🃏 Flashcard" },
  { value: "video_script", label: "🎬 Video Script" },
  { value: "poem", label: "✍️ Poem" },
] as const;

const SORT_OPTIONS = [
  { value: "recent", label: "New", icon: Clock },
  { value: "trending", label: "Trending", icon: TrendingUp },
  { value: "top", label: "Top", icon: Trophy },
] as const;

const PERIOD_OPTIONS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
] as const;

export default function Discover() {
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [format, setFormat] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"recent" | "trending" | "top">("recent");
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);

  const { data, isLoading } = trpc.content.discover.useQuery({
    keyword: keyword || undefined,
    format: format as any,
    tagName: selectedTag,
    sortBy,
    period,
    limit: 24,
    offset: 0,
  });

  const { data: popularTags } = trpc.content.popularTags.useQuery({ limit: 15 });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput);
  };

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Discover</h1>
        <p className="text-muted-foreground">Explore content created by the community</p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 mb-10">
        <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-card border-border/60"
            />
          </div>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Search
          </Button>
        </form>

        {/* Sort tabs */}
        <div className="flex items-center gap-4">
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border/40">
            {SORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    sortBy === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Period filter (only show for trending/top) */}
          {sortBy !== "recent" && (
            <div className="flex gap-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    period === opt.value
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Format filters */}
        <div className="flex flex-wrap gap-2">
          {FORMAT_FILTERS.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setFormat(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                format === f.value
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                  : "bg-card text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Popular tags */}
        {popularTags && popularTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(undefined)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground"
              >
                #{selectedTag}
                <X className="w-3 h-3" />
              </button>
            )}
            {popularTags
              .filter((t) => t.tag.name !== selectedTag)
              .map((t) => (
                <button
                  key={t.tag.id}
                  onClick={() => setSelectedTag(t.tag.name)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border/40 hover:border-primary/40 hover:text-foreground transition-all"
                >
                  #{t.tag.name}
                  <span className="ml-1 text-[10px] opacity-60">{t.count}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No content found</h3>
          <p className="text-muted-foreground">
            {keyword ? `No results for "${keyword}"` : selectedTag ? `No content tagged #${selectedTag}` : "Be the first to share something!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {data.map((item) => (
            <ContentCard key={item.content.id} content={item.content} author={item.author} />
          ))}
        </div>
      )}
    </div>
  );
}
