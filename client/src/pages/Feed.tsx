import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Compass, Rss } from "lucide-react";
import ContentCard from "@/components/ContentCard";

export default function Feed() {
  const { data, isLoading } = trpc.content.feed.useQuery({ limit: 30, offset: 0 });

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Rss className="w-7 h-7 text-primary" />
          Feed
        </h1>
        <p className="text-muted-foreground">Latest content from people you follow</p>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">📡</div>
          <h3 className="text-xl font-semibold mb-2">Your feed is empty</h3>
          <p className="text-muted-foreground mb-6">
            Follow creators on Discover to see their latest works here
          </p>
          <Link href="/discover">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Compass className="w-4 h-4" />
              Explore Discover
            </Button>
          </Link>
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
