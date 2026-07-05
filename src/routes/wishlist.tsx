import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { supabase, BOARDS, EDUCATION_LEVELS, INSTITUTES } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    education_level: "University",
    board: "",
    institute_name: "",
    institute_other: "",
    notes: "",
  });

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const showBoard = form.education_level === "School";
  const instituteValue = form.institute_name === "Other (Type your Institute)" ? form.institute_other : form.institute_name;

  const submit = async () => {
    if (!user) {
      toast.error("Sign in to request a book.");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      education_level: form.education_level,
      board: showBoard ? form.board || null : null,
      institute_name: instituteValue || null,
      notes: form.notes.trim() || null,
    };

    try {
      const { error } = await supabase.from("book_requests").insert(payload);
      if (error) throw error;
      toast.success("Your request has been logged.");
      setForm({ title: "", education_level: "University", board: "", institute_name: "", institute_other: "", notes: "" });
    } catch (error) {
      toast.error((error as Error).message || "Your request could not be logged right now.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <AppLayout><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-2 text-accent font-semibold mb-2"><Sparkles className="w-5 h-5" /> Wishlist hub</div>
        <h1 className="text-3xl font-bold text-primary">Request a book</h1>
        <p className="text-muted-foreground mt-2">Tell us what students are looking for and we’ll keep the community aligned around the next available copy.</p>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] mt-8">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label>Book title</Label>
                <Input value={form.title} onChange={(e) => upd("title", e.target.value)} placeholder="e.g. Organic Chemistry by Clayden" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Education level</Label>
                  <Select value={form.education_level} onValueChange={(v) => upd("education_level", v)}>
                    <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                    <SelectContent>{EDUCATION_LEVELS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Institute / campus</Label>
                  <Select value={form.institute_name} onValueChange={(v) => upd("institute_name", v)}>
                    <SelectTrigger><SelectValue placeholder="Select institute" /></SelectTrigger>
                    <SelectContent>{INSTITUTES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {showBoard && (
                <div>
                  <Label>Board</Label>
                  <Select value={form.board} onValueChange={(v) => upd("board", v)}>
                    <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                    <SelectContent>{BOARDS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {form.institute_name === "Other (Type your Institute)" && (
                <div>
                  <Label>Other institute</Label>
                  <Input value={form.institute_other} onChange={(e) => upd("institute_other", e.target.value)} placeholder="Type your institute" />
                </div>
              )}
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => upd("notes", e.target.value)} rows={4} placeholder="Any extra details? Edition, author, or urgency." />
              </div>
              <Button onClick={submit} disabled={saving} className="w-full bg-accent hover:bg-accent/90">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Log request
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-secondary/40">
            <h2 className="text-lg font-semibold text-primary">Why this helps</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• Students can request resources before they become available.</li>
              <li>• The request is tagged with level, board, and institute context.</li>
              <li>• Sellers can discover demand from the same network and respond faster.</li>
            </ul>
            <div className="mt-6 rounded-xl border border-dashed border-accent/40 p-4 text-sm text-muted-foreground">
              <div className="font-semibold text-primary">Tip</div>
              <p className="mt-1">If the book is very urgent, mention the edition or author so buyers and sellers can spot it quickly.</p>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
