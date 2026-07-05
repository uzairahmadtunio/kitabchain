import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, ADMIN_EMAIL, type Profile } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user ?? null;
  const isAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data) {
      setProfile(data as Profile);
    } else {
      // create empty profile row
      const u = (await supabase.auth.getUser()).data.user;
      const insert = {
        id: uid,
        full_name: u?.user_metadata?.full_name ?? u?.email?.split("@")[0] ?? null,
        avatar_url: u?.user_metadata?.avatar_url ?? null,
        is_admin: u?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      };
      const { data: created } = await supabase.from("profiles").insert(insert).select().maybeSingle();
      setProfile((created as Profile) ?? null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      if (sess?.user) {
        loadProfile(sess.user.id);
      } else {
        setProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <Ctx.Provider value={{ user, session, profile, loading, isAdmin, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
