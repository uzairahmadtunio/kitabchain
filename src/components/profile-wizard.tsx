import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { supabase, UNIVERSITIES } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, GraduationCap } from "lucide-react";

export function ProfileWizard() {
  const { user, refreshProfile } = useAuth();
  const [university, setUniversity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ university, whatsapp_num: whatsapp, city })
      .eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Profile complete — start browsing!");
    await refreshProfile();
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center mb-2">
            <GraduationCap className="w-6 h-6 text-accent" />
          </div>
          <DialogTitle>Complete your student profile</DialogTitle>
          <DialogDescription>
            Just two quick things so buyers on your campus can reach you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>University</Label>
            <Select value={university} onValueChange={setUniversity} required>
              <SelectTrigger>
                <SelectValue placeholder="Select your university" />
              </SelectTrigger>
              <SelectContent>
                {UNIVERSITIES.filter((u) => u !== "All Universities").map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore, Karachi, Islamabad…" />
          </div>
          <div>
            <Label>WhatsApp number</Label>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+92 300 1234567"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Used for buyer contact only. Never shown publicly.</p>
          </div>
          <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading || !university || !whatsapp}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save & continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
