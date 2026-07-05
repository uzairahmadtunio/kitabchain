import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import { supabase, UNIVERSITIES, getGamificationLevel, type BookListing } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, BookOpen, ShieldCheck, Star, UserRound } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mine, setMine] = useState<BookListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", university: "", city: "", whatsapp_num: "", instagram_handle: "", is_verified_student: false, peer_rating: "", peer_reviews: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        university: profile.university ?? "",
        city: profile.city ?? "",
        whatsapp_num: profile.whatsapp_num ?? "",
        instagram_handle: profile.instagram_handle ?? "",
        is_verified_student: Boolean(profile.is_verified_student),
        peer_rating: profile.peer_rating?.toString() ?? "",
        peer_reviews: profile.peer_reviews?.toString() ?? "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("books_listings")
          .select("*")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setMine((data ?? []) as BookListing[]);
      } catch (error) {
        toast.error((error as Error).message || "Your listings could not be loaded right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (authLoading) return <AppLayout><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!user) return <AppLayout><div className="text-center py-24 text-muted-foreground">Sign in to view your profile.</div></AppLayout>;

  const donationCount = mine.filter((b) => b.is_donation).length;
  const gamificationLevel = useMemo(() => getGamificationLevel(mine.length, donationCount), [mine.length, donationCount]);
  const peerRating = Number(form.peer_rating || 0);
  const peerReviews = Number(form.peer_reviews || 0);

  const setStatus = async (bookId: string, status: BookListing["status"]) => {
    try {
      const { error } = await supabase.from("books_listings").update({ status }).eq("id", bookId);
      if (error) throw error;
      setMine((m) => m.map((b) => (b.id === bookId ? { ...b, status } : b)));
      toast.success(`Marked as ${status}`);
    } catch (error) {
      toast.error((error as Error).message || "Status update failed.");
    }
  };

  const handleDelete = async (bookId: string) => {
    const confirmed = window.confirm("Delete this listing permanently?");
    if (!confirmed) return;
    setDeletingId(bookId);
    try {
      const { error } = await supabase.from("books_listings").delete().eq("id", bookId);
      if (error) throw error;
      setMine((current) => current.filter((listing) => listing.id !== bookId));
      toast.success("Listing deleted.");
    } catch (error) {
      toast.error((error as Error).message || "Could not delete listing.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (bookId: string) => {
    navigate({ to: "/sell", search: { editId: bookId } as never });
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name || null,
        university: form.university || null,
        city: form.city || null,
        whatsapp_num: form.whatsapp_num || null,
        instagram_handle: form.instagram_handle ? form.instagram_handle.replace(/^@/, "") : null,
        is_verified_student: form.is_verified_student,
        peer_rating: Number(form.peer_rating || 0),
        peer_reviews: Number(form.peer_reviews || 0),
        gamification_level: gamificationLevel,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
      await refreshProfile();
    } catch (error) {
      toast.warning((error as Error).message || "Your profile was updated in the UI, but the server could not persist it right now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold text-primary">My Dashboard</h1>
        <p className="text-muted-foreground">Manage your listings, trust signals, and campus identity.</p>

        <Card className="mt-6 border-accent/20 bg-gradient-to-br from-accent/10 via-background to-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold">
                <UserRound className="w-4 h-4" /> {profile?.full_name ?? user.email}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Campus trust profile and activity badge</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-accent text-accent-foreground">{gamificationLevel}</Badge>
              {form.is_verified_student ? <Badge variant="outline" className="border-accent text-accent"><ShieldCheck className="w-3 h-3 mr-1" /> Verified Student</Badge> : <Badge variant="secondary">Pending verification</Badge>}
              <Badge variant="outline"><Star className="w-3 h-3 mr-1" />{peerRating > 0 ? `${peerRating.toFixed(1)} / 5` : "No rating yet"}</Badge>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-primary">My Active Items for Sale</h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : mine.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground">You haven't listed any books yet.</p>
              </Card>
            ) : (
              mine.map((b) => (
                <Card key={b.id} className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-md bg-secondary shrink-0 overflow-hidden flex items-center justify-center">
                    {b.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : <BookOpen className="w-6 h-6 text-primary/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-primary truncate">{b.title}</div>
                    <div className="text-xs text-muted-foreground">{b.author}</div>
                    <div className="text-sm font-medium mt-1">
                      {b.is_donation ? <span className="text-accent">FREE</span> : `Rs ${Number(b.price).toLocaleString()}`}
                      <Badge variant="outline" className="ml-2">{b.status}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant={b.status === "Available" ? "default" : "outline"} onClick={() => setStatus(b.id, "Available")}>Available</Button>
                      <Button size="sm" variant={b.status === "Reserved" ? "default" : "outline"} onClick={() => setStatus(b.id, "Reserved")}>Reserved</Button>
                      <Button size="sm" variant={b.status === "Sold" ? "default" : "outline"} onClick={() => setStatus(b.id, "Sold")}>Sold</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(b.id)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(b.id)} disabled={deletingId === b.id}>
                        {deletingId === b.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <Card className="p-5 h-fit">
            <h2 className="text-lg font-semibold text-primary mb-4">Account Settings</h2>
            <div className="space-y-3">
              <div>
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>University</Label>
                <Select value={form.university} onValueChange={(v) => setForm({ ...form, university: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {UNIVERSITIES.filter((u) => u !== "All Universities").map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>WhatsApp number</Label>
                <Input value={form.whatsapp_num} onChange={(e) => setForm({ ...form, whatsapp_num: e.target.value })} placeholder="+92…" />
              </div>
              <div>
                <Label>Instagram handle</Label>
                <Input value={form.instagram_handle} onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })} placeholder="@studentname" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                <div>
                  <Label className="text-sm">Verified student</Label>
                  <p className="text-xs text-muted-foreground">Show a trust badge on your listings.</p>
                </div>
                <Switch checked={form.is_verified_student} onCheckedChange={(v) => setForm({ ...form, is_verified_student: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Peer rating</Label>
                  <Input type="number" min="0" max="5" value={form.peer_rating} onChange={(e) => setForm({ ...form, peer_rating: e.target.value })} placeholder="4.8" />
                </div>
                <div>
                  <Label>Reviews</Label>
                  <Input type="number" min="0" value={form.peer_reviews} onChange={(e) => setForm({ ...form, peer_reviews: e.target.value })} placeholder="12" />
                </div>
              </div>
              <div className="rounded-lg border border-border/70 p-3 text-sm text-muted-foreground">
                <div className="font-medium text-primary">Gamification status</div>
                <div className="mt-1">{gamificationLevel} · {donationCount > 0 ? `${donationCount} donation${donationCount > 1 ? "s" : ""} shared` : `${mine.length} listing${mine.length === 1 ? "" : "s"} active`}</div>
              </div>
              <Button onClick={saveProfile} disabled={saving} className="w-full bg-accent hover:bg-accent/90">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save changes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
