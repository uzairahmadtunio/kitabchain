import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookCard } from "@/components/book-card";
import { supabase, UNIVERSITIES, type BookListing } from "@/lib/supabase";
import { ArrowRight, Atom, Code2, GraduationCap, HeartHandshake, Loader2, Search, Sigma, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const CAT_META = [
  { label: "Programming & SE", icon: Code2, color: "from-blue-500/20 to-indigo-500/20" },
  { label: "Pre-Calculus/Math", icon: Sigma, color: "from-emerald-500/20 to-teal-500/20" },
  { label: "Applied Physics", icon: Atom, color: "from-orange-500/20 to-red-500/20" },
  { label: "Entry Test Preparation", icon: GraduationCap, color: "from-purple-500/20 to-pink-500/20" },
  { label: "Free/Donations", icon: HeartHandshake, color: "from-accent/30 to-accent/10" },
];

function HomePage() {
  const [books, setBooks] = useState<(BookListing & { profiles?: { university: string | null } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [university, setUniversity] = useState("All Universities");
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  const filteredUniversities = useMemo(() => {
    const value = query.trim().toLowerCase();
    const base = UNIVERSITIES.filter((entry) => entry !== "All Universities");

    const ranked = base
      .map((entry) => ({
        label: entry,
        featured: entry === "The University of Larkana",
        match: value ? entry.toLowerCase().includes(value) : true,
      }))
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        if (value) {
          if (a.match !== b.match) return a.match ? -1 : 1;
        }
        return a.label.localeCompare(b.label);
      })
      .filter((entry) => (value ? entry.match : true));

    return ranked.slice(0, 6);
  }, [query]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("books_listings")
        .select("*, profiles:seller_id(university)")
        .eq("status", "Available")
        .order("created_at", { ascending: false })
        .limit(12);
      const { data } = await q;
      let rows = (data ?? []) as (BookListing & { profiles?: { university: string | null } | null })[];
      if (university !== "All Universities") {
        rows = rows.filter((r) => r.profiles?.university === university);
      }
      setBooks(rows);
      setLoading(false);
    })();
  }, [university]);

  const handleSelectUniversity = (selected: string) => {
    setUniversity(selected);
    setQuery(selected);
    setShowSuggestions(false);
  };

  const handleExplore = () => {
    navigate({
      to: "/browse",
      search: { q: "", category: "", university: university === "All Universities" ? "" : university } as never,
    });
  };

  return (
    <AppLayout>
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(5,150,105,0.14),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(99,102,241,0.12),_transparent_24%),linear-gradient(135deg,_#fcfdff_0%,_#f8fafc_100%)]">
        <div className="absolute left-1/2 top-[-8rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="px-4 py-16 md:py-24 lg:py-28">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <div className="hero-animate inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Premium campus marketplace
            </div>

            <h1 className="hero-animate hero-animate-delay-1 mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl">
              Discover trusted study resources with a
              <span className="ml-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                beautifully simple search experience.
              </span>
            </h1>

            <p className="hero-animate hero-animate-delay-2 mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Buy, sell, and exchange books, notes, and campus essentials through a premium student-first network built for clarity and trust.
            </p>

            <div className="hero-animate hero-animate-delay-3 mt-10 w-full max-w-3xl rounded-[32px] border border-slate-200/90 bg-white/75 p-3 shadow-[0_30px_120px_-45px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-4">
              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                      className="h-12 rounded-2xl border-slate-200 bg-white pl-10 text-base shadow-sm transition-all duration-300 ease-in-out focus-visible:border-emerald-400 focus-visible:ring-emerald-400"
                      placeholder="Search for your university, like The University of Larkana"
                    />
                  </div>
                  <Button onClick={handleExplore} size="lg" className="h-12 rounded-2xl bg-slate-900 px-5 text-white transition-all duration-300 ease-in-out hover:-translate-y-1 hover:bg-emerald-600 hover:shadow-xl">
                    Explore now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {showSuggestions && filteredUniversities.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Suggested campuses
                    </div>
                    {filteredUniversities.map((entry) => (
                      <button
                        key={entry.label}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectUniversity(entry.label)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-300 ease-in-out hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <GraduationCap className="h-4 w-4 text-emerald-600" />
                          {entry.label}
                        </span>
                        {entry.featured && (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            Featured
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">Campus-ready</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">Verified student trust</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">Donation-friendly</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Explore by subject</p>
            <h2 className="text-2xl font-semibold text-slate-900">A refined way to find what you need</h2>
          </div>
          <p className="text-sm text-slate-600">Clean categories, instant discovery, and a premium browsing experience.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {CAT_META.map(({ label, icon: Icon, color }) => (
            <button
              key={label}
              onClick={() => navigate({ to: "/browse", search: { q: "", category: label, university: "" } as never })}
              className="group text-left"
            >
              <Card className={`h-full border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl ${color}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
                <div className="mt-4 font-semibold text-slate-900">{label}</div>
                <p className="mt-2 text-sm text-slate-600">Browse curated listings tailored to your study path.</p>
              </Card>
            </button>
          ))}
        </div>
      </section>

      {/* Feed */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary">Latest listings</h2>
          <Link to="/browse" className="text-sm text-accent hover:underline font-medium">
            See all →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : books.length === 0 ? (
          <EmptyState university={university} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {books.map((b) => (
              <BookCard key={b.id} book={b} sellerUni={b.profiles?.university} />
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}

function EmptyState({ university }: { university: string }) {
  return (
    <Card className="p-12 text-center border-dashed">
      <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-accent" />
      </div>
      <h3 className="text-xl font-semibold text-primary">Be the first to list a book</h3>
      <p className="text-muted-foreground mt-1">
        No active listings {university !== "All Universities" ? `for ${university}` : "yet"}. Start the shelf.
      </p>
      <Link to="/sell">
        <Button className="mt-6 bg-accent hover:bg-accent/90">Sell a book</Button>
      </Link>
    </Card>
  );
}
