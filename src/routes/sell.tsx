import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import { supabase, BOARDS, CATEGORIES, CONDITIONS, EDUCATION_LEVELS, INSTITUTES, RESOURCE_TYPES } from "@/lib/supabase";
import { checkListingContent, getModerationMessage } from "@/lib/moderation-utils";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, BookOpen, Image as ImageIcon, CheckCircle2, Camera, Sparkles, Percent, Search, AlertCircle } from "lucide-react";

type SellSearch = { editId?: string };

export const Route = createFileRoute("/sell")({
  validateSearch: (s: Record<string, unknown>): SellSearch => ({
    editId: typeof s.editId === "string" ? s.editId : "",
  }),
  component: SellPage,
});

function SellPage() {
  const search = Route.useSearch();
  const editId = search.editId?.trim();
  const isEditMode = Boolean(editId);
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [scannerText, setScannerText] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [aiScanStatus, setAiScanStatus] = useState<"idle" | "scanning" | "filled">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);
  const [isFlagged, setIsFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState<string | null>(null);
  const [moderationMessage, setModerationMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    author: "",
    edition: "",
    category: "",
    condition: "",
    resource_type: "Textbook",
    market_price: "",
    price: "",
    is_donation: false,
    description: "",
    education_level: "University",
    board: "",
    institute_name: "",
    institute_other: "",
    specific_location: "",
  });

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const marketValue = Number(form.market_price || 0);
  const sellingValue = Number(form.price || 0);
  const discountPercent = useMemo(() => {
    if (!marketValue || !sellingValue || sellingValue >= marketValue) return 0;
    return Math.round(((marketValue - sellingValue) / marketValue) * 100);
  }, [marketValue, sellingValue]);
  const pricingTip = useMemo(() => {
    if (form.is_donation) return null;
    if (!form.title.trim() && !form.price && !form.market_price) return null;
    if (!marketValue) {
      return "Add a market price to unlock a smart pricing tip for faster student sales.";
    }
    if (!sellingValue) {
      return "Tip: Setting your price 10-20% lower than the market price guarantees a 3x faster sale among university students!";
    }
    if (sellingValue >= marketValue * 0.8) {
      return "Tip: Setting your price 10-20% lower than the market price guarantees a 3x faster sale among university students!";
    }
    return "Nice — your price is already comfortably below the market value.";
  }, [form.is_donation, form.market_price, form.price, form.title, marketValue, sellingValue]);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraError("Camera access is not supported in this browser.");
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setCameraError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Camera access failed:", error);
        const message = error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access and try again."
          : "Unable to access the camera right now.";
        setCameraError(message);
        toast.error(message);
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user || !editId) return;

    setLoadingEdit(true);
    (async () => {
      try {
        const { data, error } = await supabase.from("books_listings").select("*").eq("id", editId).maybeSingle();
        if (error) throw error;
        if (!data) {
          toast.error("Could not find the listing to edit.");
          return;
        }
        if (data.seller_id !== user.id) {
          toast.error("You can only edit your own listings.");
          return;
        }

        setListingId(editId);
        setForm({
          title: data.title,
          author: data.author || "",
          edition: data.edition || "",
          category: data.category || "",
          condition: data.condition || "",
          resource_type: data.resource_type || "Textbook",
          market_price: data.original_market_price?.toString() || "",
          price: (data.selling_price ?? data.price ?? 0).toString(),
          is_donation: data.is_donation,
          description: data.description || "",
          education_level: data.education_level || "University",
          board: data.board || "",
          institute_name: data.institute_name || "",
          institute_other: INSTITUTES.includes(data.institute_name || "") ? "" : data.institute_name || "",
          specific_location: data.specific_location || "",
        });
        setExistingImages(data.images || []);
        setFilePreviews([]);
        setSelectedFiles([]);
      } catch (error) {
        toast.error((error as Error).message || "Could not load listing for editing.");
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [user, editId]);
  const isFree = form.is_donation || sellingValue === 0;
  const showBoard = form.education_level === "School";
  const institutionValue = form.institute_name === "Other (Type your Institute)" ? form.institute_other : form.institute_name;

  if (authLoading || loadingEdit) {
    return <AppLayout><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  }
  if (!user) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md py-24 text-center">
          <h2 className="text-2xl font-bold text-primary">Sign in to sell a book</h2>
          <p className="text-muted-foreground mt-2">You need an account to create listings.</p>
        </div>
      </AppLayout>
    );
  }

  const inferBookMetadataFromImage = async (file: File) => {
    try {
      const normalizedName = `${file.name} ${scannerText}`.toLowerCase();
      const knownMatches = [
        { title: "Introduction to Algorithms", author: "Thomas H. Cormen", keywords: ["introduction to algorithms", "algorithms", "clrs", "cormen"] },
        { title: "Database System Concepts", author: "Abraham Silberschatz", keywords: ["database system concepts", "dbms", "silberschatz"] },
        { title: "Operating System Concepts", author: "Abraham Silberschatz", keywords: ["operating system concepts", "os concepts", "silberschatz"] },
        { title: "Computer Networking", author: "James Kurose", keywords: ["computer networking", "networking", "kurose"] },
        { title: "Calculus", author: "Stewart", keywords: ["calculus", "stewart"] },
        { title: "Physics", author: "Halliday", keywords: ["physics", "halliday", "serway"] },
        { title: "Organic Chemistry", author: "Solomons", keywords: ["organic chemistry", "solomons"] },
        { title: "Linear Algebra", author: "Strang", keywords: ["linear algebra", "strang"] },
      ];

      const match = knownMatches.find((candidate) =>
        candidate.keywords.some((keyword) => normalizedName.includes(keyword))
      );

      if (!match) return null;

      try {
        if (typeof createImageBitmap === "function") {
          const bitmap = await createImageBitmap(file);
          bitmap.close();
        }
      } catch {
        // Ignore browser-level image processing issues and continue with the lightweight match.
      }

      return {
        title: match.title,
        author: match.author,
      };
    } catch {
      return null;
    }
  };

  const handleFilesSelected = async (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!newFiles.length) return;

    setAiScanStatus("scanning");

    try {
      const nextPreviews = await Promise.all(
        newFiles.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("Could not read image file."));
              reader.readAsDataURL(file);
            }),
        ),
      );

      setFilePreviews((current) => [...current, ...nextPreviews]);
      setSelectedFiles((current) => [...current, ...newFiles]);

      const firstFile = newFiles[0];
      const inferred = await inferBookMetadataFromImage(firstFile);
      if (inferred) {
        setForm((prev) => ({
          ...prev,
          title: prev.title.trim() ? prev.title : inferred.title,
          author: prev.author.trim() ? prev.author : inferred.author,
        }));
        setAiScanStatus("filled");
      } else {
        setAiScanStatus("idle");
      }
    } catch {
      setAiScanStatus("idle");
    }
  };

  const removeImage = (index: number) => {
    setExistingImages((current) => {
      if (index < current.length) {
        return current.filter((_, currentIndex) => currentIndex !== index);
      }
      return current;
    });
    setFilePreviews((current) => {
      if (index >= existingImages.length) {
        return current.filter((_, currentIndex) => currentIndex !== index - existingImages.length);
      }
      return current;
    });
    setSelectedFiles((current) => {
      if (index >= existingImages.length) {
        return current.filter((_, currentIndex) => currentIndex !== index - existingImages.length);
      }
      return current;
    });
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    let images = existingImages;
    let uploadedUrls: string[] = [];

    // Upload files to Supabase Storage if user selected any files
    if (selectedFiles.length > 0) {
      setUploading(true);
      const bucket = "book-images";
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        try {
          const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
          const path = `${user.id}/${Date.now()}-${i}-${cleanName}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
          if (uploadError) {
            console.error("Storage upload error:", uploadError.message ?? uploadError);
            toast.error("Some images could not be uploaded to storage. They'll be saved as previews.");
            uploadedUrls.push(null as unknown as string);
            continue;
          }

          // Attempt to get public URL (handle different supabase client return shapes)
          try {
            const publicRes: any = await supabase.storage.from(bucket).getPublicUrl(path as string);
            const publicUrl = (publicRes?.data && (publicRes.data.publicUrl || publicRes.data.publicURL)) || publicRes?.publicURL || publicRes?.publicUrl;
            if (publicUrl) uploadedUrls.push(publicUrl as string);
            else {
              console.warn("No public URL returned for", path);
              uploadedUrls.push(null as unknown as string);
            }
          } catch (err) {
            console.error("getPublicUrl error:", err);
            uploadedUrls.push(null as unknown as string);
          }
        } catch (err) {
          console.error("Unexpected upload error:", err);
          toast.error("Unexpected error during image upload.");
          uploadedUrls.push(null as unknown as string);
        }
      }
      setUploading(false);

      // Merge uploaded URLs with previews; fallback to previews where upload failed
      const finalUrls = uploadedUrls.map((u, idx) => u || filePreviews[idx]).filter(Boolean) as string[];
      if (finalUrls.length) images = [...existingImages, ...finalUrls];
    }

    const basePayload = {
      seller_id: user.id,
      title: form.title.trim(),
      author: form.author.trim() || null,
      edition: form.edition.trim() || null,
      category: form.category || null,
      condition: form.condition || null,
      price: form.is_donation ? 0 : Number(form.price || 0),
      is_donation: form.is_donation,
      description: [form.description, `Resource type: ${form.resource_type}`, `Education level: ${form.education_level}`, showBoard && form.board ? `Board: ${form.board}` : null, institutionValue ? `Institute: ${institutionValue}` : null, form.market_price ? `Original market price: PKR ${Number(form.market_price).toLocaleString()}` : null].filter(Boolean).join("\n"),
      images: images.length > 0 ? images : null,
      status: "Available" as const,
    };

    // Run moderation check on title and description
    const moderationResult = checkListingContent(form.title.trim(), form.description.trim());
    setIsFlagged(moderationResult.isFlagged);
    setFlagReason(moderationResult.reason);
    if (moderationResult.isFlagged) {
      setModerationMessage(getModerationMessage(moderationResult));
    }

    const advancedPayload = {
      ...basePayload,
      resource_type: form.resource_type,
      education_level: form.education_level,
      board: showBoard ? form.board || null : null,
      institute_name: institutionValue || null,
      specific_location: form.specific_location?.trim() || null,
      original_market_price: marketValue || null,
      selling_price: isFree ? 0 : sellingValue || null,
      ...(moderationResult.isFlagged && {
        is_flagged: true,
        flag_reason: moderationResult.reason,
      }),
    };

    try {
      const listingPayload = isEditMode && listingId ? { ...advancedPayload } : advancedPayload;
      const query = isEditMode && listingId
        ? supabase.from("books_listings").update(listingPayload).eq("id", listingId).select().single()
        : supabase.from("books_listings").insert(listingPayload).select().single();
      const { data, error } = await query;
      if (error) {
        const isColumnError = error.message.toLowerCase().includes("column") || error.message.toLowerCase().includes("does not exist");
        if (isColumnError && !isEditMode) {
          const fallback = await supabase.from("books_listings").insert(basePayload).select().single();
          if (fallback.error) throw fallback.error;
          if (moderationResult.isFlagged) {
            toast.success(moderationMessage || "Your listing was submitted for review!");
          } else {
            toast.success("Your book is live!");
          }
          navigate({ to: "/book/$id", params: { id: (fallback.data as { id: string }).id } });
          return;
        }
        throw error;
      }
      if (moderationResult.isFlagged) {
        toast.success(moderationMessage || "Your listing was submitted for review!");
      } else {
        toast.success(isEditMode ? "Your listing is updated." : "Your book is live!");
      }
      navigate({ to: "/book/$id", params: { id: (data as { id: string }).id } });
    } catch (error) {
      toast.error((error as Error).message || "We could not publish your listing right now.");
      setIsFlagged(false);
      setFlagReason(null);
      setModerationMessage(null);
    } finally {
      setSaving(false);
    }
  };

  const canNext =
    (step === 1 && form.title && form.author) ||
    (step === 2 && form.category && form.condition && (form.is_donation || form.price || form.market_price)) ||
    step === 3;

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold text-primary">{isEditMode ? "Edit listing" : "List a book for sale"}</h1>
        <p className="text-muted-foreground">Reach students on your campus with a premium, trust-first listing experience.</p>

        {isFlagged && moderationMessage && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900">Content Under Review</div>
              <p className="text-sm text-amber-800 mt-1">{moderationMessage}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 my-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= n ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
              </div>
              {n < 3 && <div className={`h-0.5 flex-1 ${step > n ? "bg-accent" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold"><BookOpen className="w-5 h-5" /> Core book details</div>
              <Card className="border-dashed border-accent/40 bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-primary">AI barcode scanner</div>
                    <p className="text-sm text-muted-foreground">A polished scanner mockup for fast ISBN capture and lookup.</p>
                  </div>
                  <div className="rounded-full bg-accent/15 p-2 text-accent"><Camera className="w-5 h-5" /></div>
                </div>
                <div className="mt-4 rounded-2xl border border-border/70 bg-slate-950 p-4 text-white">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Camera preview</span>
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">Live</span>
                  </div>
                  <div className="mt-3 rounded-xl border border-dashed border-white/20 p-4">
                    <div className="mx-auto aspect-[4/3] w-full max-w-[16rem] overflow-hidden rounded-lg border border-white/10 bg-black">
                      {cameraError ? (
                        <div className="flex h-full items-center justify-center px-3 text-center text-sm text-slate-300">
                          {cameraError}
                        </div>
                      ) : (
                        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                    <Sparkles className="w-4 h-4 text-accent" />
                    {cameraError ? "Camera unavailable · grant permission to scan" : "Live camera feed ready · back camera active"}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Input value={scannerText} onChange={(e) => setScannerText(e.target.value)} placeholder="ISBN / mock lookup" />
                  <Button type="button" variant="outline" onClick={() => {
                    if (scannerText.trim()) {
                      toast.success("Mock scan ready — ISBN lookup would start here.");
                    }
                  }}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => upd("title", e.target.value)} placeholder="e.g. Introduction to Algorithms" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Author *</Label>
                  <Input value={form.author} onChange={(e) => upd("author", e.target.value)} placeholder="Cormen et al." />
                </div>
                <div>
                  <Label>Edition</Label>
                  <Input value={form.edition} onChange={(e) => upd("edition", e.target.value)} placeholder="3rd" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder="Any highlights, missing pages, notes inside…" rows={3} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold">Resource details, trust filters & price</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Resource type</Label>
                  <Select value={form.resource_type} onValueChange={(v) => upd("resource_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                    <SelectContent>{RESOURCE_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condition *</Label>
                  <Select value={form.condition} onValueChange={(v) => upd("condition", v)}>
                    <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                    <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => upd("category", v)}>
                    <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Education level</Label>
                  <Select value={form.education_level} onValueChange={(v) => upd("education_level", v)}>
                    <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                    <SelectContent>{EDUCATION_LEVELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {showBoard && (
                <div>
                  <Label>Board</Label>
                  <Select value={form.board} onValueChange={(v) => upd("board", v)}>
                    <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                    <SelectContent>{BOARDS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Institute name</Label>
                <Select value={form.institute_name} onValueChange={(v) => upd("institute_name", v)}>
                  <SelectTrigger><SelectValue placeholder="Select institute" /></SelectTrigger>
                  <SelectContent>{INSTITUTES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.institute_name === "Other (Type your Institute)" && (
                <div>
                  <Label>Other institute</Label>
                  <Input value={form.institute_other} onChange={(e) => upd("institute_other", e.target.value)} placeholder="Type your institute" />
                </div>
              )}
              <div>
                <Label>Campus department / specific location</Label>
                <Input
                  value={form.specific_location}
                  onChange={(e) => upd("specific_location", e.target.value)}
                  placeholder="e.g. CS Department, Admin Block, Library Lounge"
                />
              </div>
              <Card className="p-4 bg-accent/5 border-accent/30">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-accent font-semibold">Mark as donation</Label>
                    <p className="text-xs text-muted-foreground">Give it free to another student.</p>
                  </div>
                  <Switch checked={form.is_donation} onCheckedChange={(v) => { upd("is_donation", v); if (v) upd("price", "0"); }} />
                </div>
              </Card>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Original market price (PKR)</Label>
                  <Input type="number" value={form.market_price} onChange={(e) => upd("market_price", e.target.value)} placeholder="3000" />
                </div>
                <div>
                  <Label>Your selling price (PKR)</Label>
                  <Input type="number" value={form.price} onChange={(e) => upd("price", e.target.value)} disabled={form.is_donation} placeholder="900" />
                  {pricingTip && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      {pricingTip}
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent-foreground">
                <div className="flex items-center gap-2 font-semibold"><Percent className="w-4 h-4" /> Price transparency engine</div>
                {isFree ? (
                  <div className="mt-2 font-semibold text-accent">FREE / DONATION listing ready</div>
                ) : (
                  <div className="mt-2">
                    {discountPercent > 0 ? `${discountPercent}% OFF market value!` : "Set a market price to reveal the discount automatically."}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold"><ImageIcon className="w-5 h-5" /> Images & preview</div>
              <div>
                <div
                  className={`rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-all duration-300 ease-in-out ${isDraggingFiles ? "border-blue-500 bg-blue-50" : "hover:bg-slate-100"}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragLeave={() => setIsDraggingFiles(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDraggingFiles(false);
                    void handleFilesSelected(event.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files) {
                        void handleFilesSelected(event.target.files);
                      }
                    }}
                  />
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <ImageIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-slate-900">Upload product images</div>
                  <p className="mt-2 text-sm text-slate-600">Supports multiple JPG and PNG files. Drag & drop or browse from your device.</p>
                  <Button type="button" className="mt-5 rounded-2xl bg-slate-900 text-white hover:bg-blue-600" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }}>
                    Choose Files
                  </Button>
                </div>

                {aiScanStatus === "scanning" && (
                  <div className="mt-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800">
                    🤖 AI Scan: Extracting metadata...
                  </div>
                )}
                {aiScanStatus === "filled" && (
                  <div className="mt-3 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
                    Auto-filled from image!
                  </div>
                )}

                {(existingImages.length > 0 || filePreviews.length > 0) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[...existingImages, ...filePreviews].map((preview, index) => (
                      <div key={`${preview.slice(0, 16)}-${index}`} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <img src={preview} alt={`Preview ${index + 1}`} className="h-36 w-full object-cover" />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeImage(index);
                          }}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/80 text-sm text-white transition hover:bg-blue-600"
                          aria-label={`Remove image ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Card className="p-4 bg-secondary">
                <div className="text-sm font-semibold text-primary mb-2">Preview</div>
                <div className="text-sm">
                  <div className="font-medium">{form.title || "Untitled"}</div>
                  <div className="text-muted-foreground">{form.author}{form.edition && ` · ${form.edition} ed.`}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{form.resource_type}</span>
                    <span className="rounded-full bg-accent/10 px-2 py-1 text-xs text-accent">{form.education_level}</span>
                    {institutionValue && <span className="rounded-full bg-secondary px-2 py-1 text-xs">{institutionValue}</span>}
                  </div>
                  <div className="mt-3 text-primary font-bold">
                    {isFree ? <span className="text-accent">FREE / DONATION</span> : `Rs ${Number(form.price || 0).toLocaleString()}`}
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="flex justify-between pt-6 mt-6 border-t">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="bg-primary">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving || uploading} className="bg-accent hover:bg-accent/90">
                {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {uploading ? "Uploading images to campus cloud..." : saving ? "Publishing listing..." : "Publish listing"}
              </Button>
            )}
          </div>
        </Card>

        {!profile?.whatsapp_num && (
          <p className="text-xs text-center text-muted-foreground mt-4">
            Tip: add your WhatsApp number in your profile so buyers can reach you instantly.
          </p>
        )}
      </div>
    </AppLayout>
  );
}
