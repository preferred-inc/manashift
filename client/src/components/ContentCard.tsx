import { Link } from "wouter";
import { Heart, MessageCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
// Content type inline
type Content = {
  id: number;
  title: string;
  description: string | null;
  outputFormat: string;
  coverImageUrl: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isPublic: boolean;
  status: string;
  userId: number;
  createdAt: Date;
};

const FORMAT_EMOJI: Record<string, string> = {
  novel: "📖",
  manga: "🎌",
  flashcard: "🃏",
  video_script: "🎬",
  poem: "✍️",
};

const FORMAT_COLOR: Record<string, string> = {
  novel: "border-violet-500/40 text-violet-400 bg-violet-500/10",
  manga: "border-pink-500/40 text-pink-400 bg-pink-500/10",
  flashcard: "border-blue-500/40 text-blue-400 bg-blue-500/10",
  video_script: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  poem: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
};

interface Props {
  content: Content;
  author?: { id: number; name: string | null } | null;
}

export default function ContentCard({ content, author }: Props) {
  const emoji = FORMAT_EMOJI[content.outputFormat] ?? "📄";
  const colorClass = FORMAT_COLOR[content.outputFormat] ?? "border-border text-muted-foreground bg-muted";

  return (
    <Link href={`/content/${content.id}`}>
      <div className="group rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 overflow-hidden cursor-pointer">
        {/* Cover image or placeholder */}
        <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {content.coverImageUrl ? (
            <img
              src={content.coverImageUrl}
              alt={content.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl opacity-40">{emoji}</span>
            </div>
          )}
          {/* Format badge overlay */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
              {emoji} {content.outputFormat.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Content info */}
        <div className="p-4">
          <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {content.title}
          </h3>
          {content.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{content.description}</p>
          )}

          {/* Author & stats */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {author?.name ?? "Anonymous"}
            </span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {content.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {content.commentCount}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {content.viewCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
