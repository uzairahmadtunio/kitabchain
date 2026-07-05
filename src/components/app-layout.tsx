import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Home, PlusCircle, Search, ShieldCheck, User, LogOut, Store, HeartHandshake, MessageCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AuthDialog } from "./auth-dialog";
import { ProfileWizard } from "./profile-wizard";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [authOpen, setAuthOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);

  const needsWizard =
    !!user && !loading && profile && (!profile.university || !profile.whatsapp_num);

  const requireAuth = (fn: () => void) => {
    if (!user) setAuthOpen(true);
    else fn();
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/browse", search: { q: query, category: "", university: "" } as never });
  };

  const initials =
    profile?.full_name?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3 md:gap-6">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img
              src={typeof window !== "undefined" ? "/kitabchain_logo.png" : "/kitabchain_logo.png"}
              alt="KitabChain Logo - Connecting Knowledge, Building Futures"
              className="h-9 w-auto rounded-md shadow-sm"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                const fallbacks = ["/kitabchain_logo.png", "/kitabchain_logo.webp", "/kitabchain_logo.svg"];
                const attempted = Number(img.dataset.attempted || "0");
                const next = attempted + 1;
                if (next < fallbacks.length) {
                  img.dataset.attempted = String(next);
                  img.src = fallbacks[next];
                } else {
                  // final fallback: show invisible alt (keeps layout)
                  img.style.display = "none";
                }
              }}
            />
            <span className="font-semibold text-lg text-slate-950 hidden sm:inline">KitabChain</span>
          </Link>

          <form onSubmit={submitSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, authors, editions…"
                className="pl-9 border-slate-200 bg-slate-50/80 focus-visible:border-blue-500 focus-visible:bg-white"
              />
            </div>
          </form>

          <nav className="hidden md:flex items-center gap-2">
            <Link to="/browse">
              <Button variant="ghost" className="gap-2">
                <Store className="w-4 h-4" /> Browse Books
              </Button>
            </Link>
            <Link to="/wishlist">
              <Button variant="ghost" className="gap-2">
                <HeartHandshake className="w-4 h-4" /> Wishlist
              </Button>
            </Link>
            {user && (
              <Link to="/messages">
                <Button variant="ghost" className="gap-2">
                  <MessageCircle className="w-4 h-4" /> Messages
                </Button>
              </Link>
            )}
            <Button
              onClick={() => requireAuth(() => navigate({ to: "/sell" }))}
              className="gap-2 bg-slate-950 text-white transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-blue-600"
            >
              <PlusCircle className="w-4 h-4" /> Sell a Book
            </Button>
          </nav>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-2 ring-transparent hover:ring-accent transition">
                  <Avatar>
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium truncate">{profile?.full_name ?? "Student"}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <User className="w-4 h-4 mr-2" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/sell" })}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Sell a Book
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/messages" })}>
                  <MessageCircle className="w-4 h-4 mr-2" /> Messages
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/admin" })}
                    className="bg-accent/10 text-accent focus:bg-accent/20 focus:text-accent font-semibold"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" /> Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => setAuthOpen(true)} variant="outline">
              Sign in
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-8">{children}</main>

      <footer className="hidden md:block border-t border-border py-6 text-center text-sm text-muted-foreground">
        KitabChain · Books that circulate, knowledge that compounds.
      </footer>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
        <div className="grid grid-cols-6">
          {[
            { to: "/", label: "Home", icon: Home },
            { to: "/browse", label: "Search", icon: Search },
            { to: "/wishlist", label: "Wish", icon: HeartHandshake },
            ...(user
              ? [{ to: "/messages", label: "Messages", icon: MessageCircle }]
              : []),
            { to: "/sell", label: "Sell", icon: PlusCircle, needsAuth: true },
            { to: "/profile", label: "Profile", icon: User, needsAuth: true },
          ].map(({ to, label, icon: Icon, needsAuth }) => {
            const active = pathname === to;
            return (
              <button
                key={to}
                onClick={() =>
                  needsAuth ? requireAuth(() => navigate({ to })) : navigate({ to })
                }
                className={`flex flex-col items-center gap-1 py-2.5 text-xs ${
                  active ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      {needsWizard && <ProfileWizard />}
    </div>
  );
}
