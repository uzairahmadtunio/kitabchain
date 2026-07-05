import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { supabase, type BookListing } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Users, Package, CheckCircle2, ShieldCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<(BookListing & { profiles?: { full_name: string | null; university: string | null } | null })[]>([]);
  const [profilesCount, setProfilesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: books }, { count }] = await Promise.all([
      supabase.from("books_listings").select("*, profiles:seller_id(full_name, university)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);
    setRows((books ?? []) as never);
    setProfilesCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (authLoading) return <AppLayout><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!isAdmin) return (
    <AppLayout>
      <div className="mx-auto max-w-md py-24 text-center">
        <ShieldCheck className="w-12 h-12 mx-auto text-destructive mb-3" />
        <h2 className="text-2xl font-bold text-primary">Restricted</h2>
        <p className="text-muted-foreground mt-2">This area is for KitabChain administrators only.</p>
        <Link to="/"><Button className="mt-4">Back home</Button></Link>
      </div>
    </AppLayout>
  );

  const active = rows.filter((r) => r.status === "Available").length;
  const sold = rows.filter((r) => r.status === "Sold").length;

  const filtered = rows.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (r.title + " " + (r.author ?? "") + " " + (r.profiles?.full_name ?? "")).toLowerCase().includes(q);
  });

  const del = async (id: string) => {
    if (!confirm("Delete this listing permanently?")) return;
    const { error } = await supabase.from("books_listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Listing deleted");
  };

  const markSold = async (id: string) => {
    const { error } = await supabase.from("books_listings").update({ status: "Sold" }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "Sold" } : x)));
    toast.success("Marked Sold");
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-6 h-6 text-accent" />
          <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Full moderation control over KitabChain.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Metric icon={Package} label="Active Listings" value={active} color="text-primary" />
          <Metric icon={Users} label="Registered Profiles" value={profilesCount} color="text-accent" />
          <Metric icon={CheckCircle2} label="Total Closed Deals" value={sold} color="text-emerald-600" />
        </div>

        <Card className="mt-8 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-primary">All Listings</h2>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter title, author, seller…" className="max-w-xs" />
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium text-primary">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.author}</div>
                      </TableCell>
                      <TableCell>
                        <div>{r.profiles?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.profiles?.university ?? "—"}</div>
                      </TableCell>
                      <TableCell>{r.is_donation ? <span className="text-accent font-semibold">FREE</span> : `Rs ${Number(r.price).toLocaleString()}`}</TableCell>
                      <TableCell><Badge variant={r.status === "Sold" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-2">
                        {r.status !== "Sold" && (
                          <Button size="sm" variant="outline" onClick={() => markSold(r.id)}>Mark Sold</Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => del(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No listings.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <div className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-primary">{value}</div>
      </div>
    </Card>
  );
}
