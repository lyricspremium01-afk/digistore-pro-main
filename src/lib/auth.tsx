import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  referral_code: string;
  balance: number;
  level: number;
  status: "active" | "suspended" | "frozen";
  total_sales: number;
};

type Role = "user" | "seller" | "admin" | "super_admin";

type Ctx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: Role[];
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null, session: null, profile: null, roles: [], isAdmin: false,
  loading: true, refresh: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    setRoles(((r ?? []) as { role: Role }[]).map((x) => x.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null); setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
  setSession(s);
  setUser(s?.user ?? null);
  if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
  else setLoading(false);
}).catch(() => setLoading(false));
setTimeout(() => setLoading(false), 3000);

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => { if (user) await loadProfile(user.id); };
  const signOut = async () => { await supabase.auth.signOut(); };

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  return (
    <AuthCtx.Provider value={{ user, session, profile, roles, isAdmin, loading, refresh, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
