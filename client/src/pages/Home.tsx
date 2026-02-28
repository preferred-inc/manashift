import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Sparkles, BookOpen, Film, FileText, Layers, ArrowRight, Zap, Users, Globe } from "lucide-react";

const FORMAT_CARDS = [
  {
    icon: "📖",
    title: "Novel",
    description: "Transform your content into an immersive short story",
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
  },
  {
    icon: "🎌",
    title: "Manga",
    description: "AI generates comic panels with illustrations",
    color: "from-pink-500/20 to-rose-500/20",
    border: "border-pink-500/30",
  },
  {
    icon: "🃏",
    title: "Flashcard",
    description: "Extract key concepts into study cards",
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
  },
  {
    icon: "🎬",
    title: "Video Script",
    description: "Create YouTube-style explainer video scripts",
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
  {
    icon: "✍️",
    title: "Poem",
    description: "Distill ideas into memorable verse and rhythm",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
  },
];

const STATS = [
  { icon: Zap, label: "Formats supported", value: "5" },
  { icon: Users, label: "Community works", value: "∞" },
  { icon: Globe, label: "Languages", value: "JA / EN" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-primary/5 blur-2xl" />
      </div>

      {/* Hero Section */}
      <section className="relative container pt-24 pb-16 text-center">
        <Badge variant="outline" className="mb-6 border-primary/40 text-primary bg-primary/10 px-4 py-1.5">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          AI-Powered Content Transformation
        </Badge>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
          Any input.
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, oklch(0.75 0.22 295), oklch(0.65 0.20 320))",
            }}
          >
            Your format.
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Paste text, upload an image, or drop a document — Transmemo transforms it into a{" "}
          <strong className="text-foreground">novel, manga, flashcards, video script, or poem</strong>{" "}
          tailored to how you learn best.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <Link href="/create">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/25 px-8">
                <Sparkles className="w-5 h-5" />
                Start Creating
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/25 px-8"
              onClick={() => (window.location.href = getLoginUrl())}
            >
              <Sparkles className="w-5 h-5" />
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          <Link href="/discover">
            <Button size="lg" variant="outline" className="gap-2 border-border/60 hover:bg-secondary px-8">
              <Globe className="w-5 h-5" />
              Explore Community
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-12 mt-16">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-foreground">{value}</div>
              <div className="text-sm text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Format Cards */}
      <section className="relative container pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Choose your format</h2>
          <p className="text-muted-foreground">Same content, five different ways to experience it</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {FORMAT_CARDS.map((card) => (
            <div
              key={card.title}
              className={`relative rounded-2xl border ${card.border} bg-gradient-to-br ${card.color} p-6 hover:scale-105 transition-transform duration-200 cursor-default`}
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="font-bold text-lg mb-2 text-foreground">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative border-t border-border/50 bg-card/30">
        <div className="container py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground">Three steps to transform your content</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Input your content",
                desc: "Paste text, write notes, or describe what you want to learn about",
                icon: FileText,
              },
              {
                step: "02",
                title: "Choose a format",
                desc: "Select how you want the AI to transform it — novel, manga, flashcards, and more",
                icon: Layers,
              },
              {
                step: "03",
                title: "Share & discover",
                desc: "Publish your creation to the community and discover what others have made",
                icon: Globe,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-5">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-xs font-mono text-primary/60 mb-2">{step}</div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="container py-24 text-center">
          <div className="max-w-2xl mx-auto rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to transform?</h2>
            <p className="text-muted-foreground mb-8">
              Join the community and start creating content in the format that works for you.
            </p>
            <Button
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/25 px-10"
              onClick={() => (window.location.href = getLoginUrl())}
            >
              <Sparkles className="w-5 h-5" />
              Get started — it's free
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
