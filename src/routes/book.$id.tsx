import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, type BookListing, type Profile } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, MessageCircle, Phone, BookOpen, ArrowLeft, Loader2, ShieldCheck, Star, MapPin } from "lucide-react";
import { toast } from "sonner";
import { getOrCreateChatRoom } from "@/lib/chat-utils";

export const Route = createFileRoute("/book/$id")({
  component: BookDetail,
});

function BookDetail() {
  // ✅ HOOKS PHASE: All hooks declared at component top (before any conditionals)
  const { id } = Route.useParams();
  const { user, profile: myProfile } = useAuth();
  const navigate = useNavigate();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [book, setBook] = useState<BookListing | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getUser();
      setAuthUserId(sessionData?.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!id) {
        setLoading(false);
        setLoadingError("Listing not found.");
        return;
      }
      setLoading(true);
      setLoadingError(null);
      try {
        const { data, error } = await supabase.from("books_listings").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!data) {
          setBook(null);
          setLoadingError("Listing not found.");
          return;
        }

        const listing = data as BookListing;
        setBook(listing);

        const { data: p, error: sellerError } = await supabase.from("profiles").select("*").eq("id", listing.seller_id).maybeSingle();
        if (!sellerError) setSeller((p as Profile) ?? null);
      } catch (error) {
        const message = (error as Error)?.message || "This listing could not be loaded right now.";
        setLoadingError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ✅ Compute all derived values AFTER all hooks but BEFORE conditional renders
  const images = book?.images ?? [];
  const marketPrice = Number(book?.original_market_price || 0);
  const salePrice = Number(book?.selling_price ?? book?.price ?? 0);
  
  const discountPercent = useMemo(() => {
    if (!marketPrice || !salePrice || salePrice >= marketPrice) return 0;
    return Math.round(((marketPrice - salePrice) / marketPrice) * 100);
  }, [marketPrice, salePrice]);
  
  const isFree = book?.is_donation || salePrice === 0;
  const waLink = seller?.whatsapp_num && book
    ? `https://wa.me/${seller.whatsapp_num.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hi! I'm interested in your KitabChain listing: ${book.title}`)}`
    : null;
  const listingOwnerId = book ? ((book as BookListing & { user_id?: string; owner_id?: string })?.user_id || (book as BookListing & { user_id?: string; owner_id?: string })?.owner_id || book?.seller_id) : null;
  const canRespond = !!user && !!seller && user.id === seller.id;
  const canEdit = !!authUserId && !!listingOwnerId && authUserId === listingOwnerId;
  const sellerRating = seller?.peer_rating != null ? Number(seller.peer_rating) : null;

  // ✅ DEFENSIVE RENDERING: Check conditions AFTER all hooks declared
  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (loadingError || !book) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md py-24 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 mx-auto">
            <BookOpen className="w-10 h-10" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-slate-900">Listing not found</h2>
          <p className="mt-3 text-muted-foreground">We couldn't locate that book listing. It may have been removed or the link is invalid.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/">
              <Button className="bg-accent hover:bg-accent/90">Back to home</Button>
            </Link>
            <Link to="/browse">
              <Button variant="outline">Browse listings</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const sendMsg = () => {
    if (!draft.trim() || !user) return;
    setMsgs((m) => [...m, { from: myProfile?.full_name ?? "You", text: draft, at: new Date().toLocaleTimeString() }]);
    setDraft("");
    setTimeout(() => {
      setMsgs((m) => [...m, { from: seller?.full_name ?? "Seller", text: "Thanks for reaching out! When would you like to meet on campus?", at: new Date().toLocaleTimeString() }]);
    }, 900);
  };

  const sendOffer = () => {
    if (!offerDraft.trim() || !user) return;
    const amount = Number(offerDraft);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid offer amount.");
      return;
    }
    setMsgs((m) => [...m, { from: myProfile?.full_name ?? "You", text: `Offer: PKR ${amount.toLocaleString()}`, at: new Date().toLocaleTimeString(), kind: "offer", offerAmount: amount, status: "pending" }]);
    setOfferDraft("");
    setTimeout(() => {
      setMsgs((m) => [...m, { from: seller?.full_name ?? "Seller", text: "Offer received — the seller can accept or reject it here.", at: new Date().toLocaleTimeString() }]);
    }, 700);
  };

  const handleOfferDecision = async (index: number, decision: "accepted" | "rejected") => {
    const current = msgs[index];
    if (!current || !book) return;
    setMsgs((m) => m.map((msg, i) => i === index ? { ...msg, status: decision === "accepted" ? "accepted" : "rejected" } : msg));
    if (decision === "accepted") {
      try {
        const { error } = await supabase.from("books_listings").update({ status: "Reserved" }).eq("id", book.id);
        if (error) throw error;
        setBook((prev) => prev ? { ...prev, status: "Reserved" } : prev);
        toast.success("Digital handshake accepted — listing reserved.");
      } catch (error) {
        toast.error((error as Error).message || "The listing could not be reserved right now.");
      }
    }
  };

  const handleChatWithSeller = async () => {
    console.log("📱 handleChatWithSeller called", { user: user?.id, book: book?.id, seller_id: book?.seller_id });
    
    if (!user || !book) {
      console.error("❌ Missing user or book");
      toast.error("Unable to start chat");
      return;
    }

    console.log("✅ User and book present", { userId: user.id, bookId: book.id, bookSellerId: book.seller_id });

    // Ensure user is not the owner
    if (user.id === book.seller_id) {
      console.warn("⚠️ User is the book owner, cannot chat with self");
      toast.error("You cannot chat with yourself");
      return;
    }

    console.log("✅ User is not owner, proceeding to create chat room");
    setChatLoading(true);
    try {
      console.log("🔄 Calling getOrCreateChatRoom with:", {
        buyerId: user.id,
        sellerId: book.seller_id,
        bookId: book.id,
      });
      const room = await getOrCreateChatRoom(user.id, book.seller_id, book.id);
      console.log("📡 getOrCreateChatRoom returned:", room);
      
      if (room) {
        console.log("✅ Chat room created successfully, navigating to messages");
        navigate({ to: "/messages" });
      } else {
        console.error("❌ getOrCreateChatRoom returned null");
        toast.error("Failed to create chat room");
      }
    } catch (error) {
      console.error("❌ Exception in handleChatWithSeller:", error);
      toast.error("Error starting chat");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to browse
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="aspect-square bg-secondary rounded-xl overflow-hidden flex items-center justify-center">
              {images[activeImg] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[activeImg]} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-24 h-24 text-primary/30" />
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square rounded-md overflow-hidden border-2 ${i === activeImg ? "border-accent" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {book.is_donation && <Badge className="bg-accent text-accent-foreground">FREE / DONATION</Badge>}
              {book.resource_type && <Badge variant="secondary">{book.resource_type}</Badge>}
              {book.education_level && <Badge variant="outline">{book.education_level}</Badge>}
              <Badge variant="secondary">{book.condition}</Badge>
              <Badge variant="outline">{book.status}</Badge>
            </div>
            <h1 className="text-3xl font-bold text-primary">{book.title}</h1>
            <p className="text-muted-foreground mt-1">
              by {book.author}{book.edition && ` · ${book.edition} edition`}
            </p>

            <div className="text-4xl font-bold text-primary mt-6">
              {isFree ? <span className="text-accent">FREE</span> : `Rs ${Number(book.price).toLocaleString()}`}
            </div>
            {marketPrice > 0 && !isFree && (
              <div className="mt-2 text-sm text-muted-foreground">
                Market value: Rs {marketPrice.toLocaleString()} · {discountPercent > 0 ? `${discountPercent}% OFF` : "Great value"}
              </div>
            )}

            {book.description && (
              <div className="mt-5">
                <div className="text-sm font-semibold text-primary">Description</div>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{book.description}</p>
              </div>
            )}

            {seller && (
              <Card className="p-4 mt-6">
                <div className="text-xs uppercase text-muted-foreground tracking-wide font-semibold">Seller</div>
                <div className="mt-1 font-semibold text-primary">{seller.full_name ?? "Student"}</div>
                <div className="text-sm text-muted-foreground">{seller.university ?? "University not set"}{seller.city && ` · ${seller.city}`}</div>
                <div className="mt-2 flex items-center gap-1 text-sm text-accent">
                  <MapPin className="w-4 h-4" />
                  {book.specific_location ? `📍 ${book.specific_location}` : seller.university ?? "University campus"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {seller.is_verified_student ? <Badge className="bg-accent text-accent-foreground"><ShieldCheck className="w-3 h-3 mr-1" />Verified Student</Badge> : <Badge variant="secondary">Community seller</Badge>}
                  {seller.gamification_level && <Badge variant="outline">{seller.gamification_level}</Badge>}
                  {sellerRating !== null ? <Badge variant="outline"><Star className="w-3 h-3 mr-1" />{sellerRating.toFixed(1)} / 5</Badge> : null}
                  {seller.instagram_handle ? <Badge variant="outline">@{seller.instagram_handle}</Badge> : null}
                </div>
              </Card>
            )}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {user && user.id !== book?.seller_id ? (
                <Button
                  size="lg"
                  onClick={handleChatWithSeller}
                  className="bg-primary"
                  disabled={chatLoading}
                >
                  {chatLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-5 h-5 mr-2" />
                  )}
                  {chatLoading ? "Opening chat..." : "Chat with Seller"}
                </Button>
              ) : !user ? (
                <Button size="lg" className="bg-primary" disabled>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Sign in to Chat
                </Button>
              ) : null}
              {waLink ? (
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="w-full bg-accent hover:bg-accent/90">
                    <Phone className="w-5 h-5 mr-2" /> WhatsApp Contact
                  </Button>
                </a>
              ) : (
                <Button size="lg" disabled variant="outline">WhatsApp not shared</Button>
              )}
              {canEdit ? (
                <Button
                  size="lg"
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => navigate({ to: "/sell", search: { editId: book.id } as never })}
                >
                  Edit Listing
                </Button>
              ) : null}
            </div>
            {!user && <p className="text-xs text-muted-foreground mt-2">Sign in to chat with the seller.</p>}

            <Card className="mt-6 p-4 border-l-4 border-l-destructive bg-destructive/5">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-primary text-sm">Safety First</div>
                  <p className="text-sm text-muted-foreground">
                    Always meet your buyer/seller in well-lit, public campus areas like the central library or university cafeteria during daylight hours.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
