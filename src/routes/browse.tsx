import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { BookCard } from "@/components/book-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, CATEGORIES, CONDITIONS, EDUCATION_LEVELS, INSTITUTES, RESOURCE_TYPES, UNIVERSITIES, type BookListing } from "@/lib/supabase";
import { Loader2, X, SlidersHorizontal, Search as SearchIcon } from "lucide-react";

type Search = { q?: string; category?: string; university?: string; educationLevel?: string; institute?: string; resourceType?: string; priceCap?: string; condition?: string };

export const Route = createFileRoute("/browse")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : "",
    category: typeof s.category === "string" ? s.category : "",
    university: typeof s.university === "string" ? s.university : "",
    educationLevel: typeof s.educationLevel === "string" ? s.educationLevel : "",
    institute: typeof s.institute === "string" ? s.institute : "",
    resourceType: typeof s.resourceType === "string" ? s.resourceType : "",
    priceCap: typeof s.priceCap === "string" ? s.priceCap : "",
    condition: typeof s.condition === "string" ? s.condition : "",
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/browse" });
  const [rows, setRows] = useState<(BookListing & { profiles?: { university: string | null } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("books_listings")
        .select("*, profiles:seller_id(university)")
        .eq("status", "Available")
        .order("created_at", { ascending: false });
      setRows((data ?? []) as never);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search.category === "Free/Donations") {
        if (!r.is_donation) return false;
      } else if (search.category) {
        if (r.category !== search.category) return false;
      }
      if (search.university && search.university !== "All Universities") {
        if (r.profiles?.university !== search.university) return false;
      }
      if (search.educationLevel) {
        if (r.education_level !== search.educationLevel) return false;
      }
      if (search.institute) {
        if (r.institute_name !== search.institute) return false;
      }
      if (search.resourceType) {
        if (r.resource_type !== search.resourceType) return false;
      }
      if (search.condition) {
        if (r.condition !== search.condition) return false;
      }
      if (search.priceCap) {
        const cap = Number(search.priceCap);
        if (Number.isFinite(cap) && Number(r.price) > cap) return false;
      }
      if (search.q) {
        const q = search.q.toLowerCase();
        const hay = `${r.title} ${r.author ?? ""} ${r.edition ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search]);

  const setParam = (k: keyof Search, v: string) =>
    navigate({ search: ((prev: Search) => ({ ...prev, [k]: v })) as never });

  const activeFilters = [search.q, search.category, search.university, search.educationLevel, search.institute, search.resourceType, search.priceCap, search.condition].filter(
    (v) => v && v !== "All Universities" && v !== "all" && v !== "Any" && v !== "",
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-3xl border border-border/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <SlidersHorizontal className="w-4 h-4" /> Smart discovery
              </div>
              <h1 className="text-3xl font-bold text-primary">Browse Books</h1>
              <p className="text-sm text-muted-foreground mt-1">Find the right resource faster with local campus-aware filters.</p>
            </div>
            <div className="rounded-full border border-border/80 bg-slate-50 px-3 py-1 text-sm text-muted-foreground">
              {filtered.length} live results
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search title, author, edition…"
                value={search.q ?? ""}
                onChange={(e) => setParam("q", e.target.value)}
              />
            </div>
            <Select value={search.category || "all"} onValueChange={(v) => setParam("category", v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={search.university || "All Universities"} onValueChange={(v) => setParam("university", v === "All Universities" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="University" /></SelectTrigger>
              <SelectContent>
                {UNIVERSITIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={search.educationLevel || "all"} onValueChange={(v) => setParam("educationLevel", v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Education level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {EDUCATION_LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Select value={search.institute || "all"} onValueChange={(v) => setParam("institute", v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Institute" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All institutes</SelectItem>
                {INSTITUTES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={search.resourceType || "all"} onValueChange={(v) => setParam("resourceType", v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Resource type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any resource</SelectItem>
                {RESOURCE_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={search.condition || "all"} onValueChange={(v) => setParam("condition", v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any condition</SelectItem>
                {CONDITIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={search.priceCap || "all"} onValueChange={(v) => setParam("priceCap", v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Max price" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any budget</SelectItem>
                <SelectItem value="500">Under PKR 500</SelectItem>
                <SelectItem value="1000">Under PKR 1,000</SelectItem>
                <SelectItem value="2000">Under PKR 2,000</SelectItem>
                <SelectItem value="5000">Under PKR 5,000</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map((f) => (
              <Badge key={f} variant="secondary" className="gap-1">
                {f}
              </Badge>
            ))}
            <Button size="sm" variant="ghost" onClick={() => navigate({ search: { q: "", category: "", university: "", educationLevel: "", institute: "", resourceType: "", priceCap: "", condition: "" } as never })}>
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">No books match your filters.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((b) => <BookCard key={b.id} book={b} sellerUni={b.profiles?.university} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
