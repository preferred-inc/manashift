import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Search, Heart, MessageCircle, Eye, Loader2 } from "lucide-react";
import ContentCard from "@/components/ContentCard";

const FORMAT_FILTERS = [
  { value: undefined, label: "All" },
  { value: "novel", label: "📖 Novel" },
  { value: "manga", label: "🎌 Manga" },
  { value: "flashcard", label: "🃏 Flashcard" },
  { value: "video_script", label: "🎬 Video Script" },
  { value: "poem", label: "✍️ Poem" },
] as const;

export default function Discover() {
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [format, setFormat] = useState<string | undefined>(undefined);

  const { data, isLoading } = trpc.content.discover.useQuery({
    keyword: keyword || undefined,
    format: format as any,
    limit: 24,
    offset: 0,
  });

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
            {keyword ? `No results for "${keyword}"` : "Be the first to share something!"}
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
