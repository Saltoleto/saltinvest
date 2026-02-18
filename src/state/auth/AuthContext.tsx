import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  configError: string | null;
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signUp(email: string, password: string): Promise<{ error?: string }>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<{ error?: string }>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configError = (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)
    ? "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local."
    : null;

  useEffect(() => {
    if (configError) {
      setLoading(false);
      setSession(null);
      setUser(null);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then((res: { data: { session: Session | null } }) => {
        if (!mounted) return;
        const sess = res.data.session ?? null;
        setSession(sess);
        setUser(sess?.user ?? null);
      })
      .finally(() => mounted && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      loading,
      configError,
      async signIn(email, password) {
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          return { error: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local." };
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
      async signUp(email, password) {
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          return { error: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local." };
        }
        const { error } = await supabase.auth.signUp({ email, password });
        return error ? { error: error.message } : {};
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async resetPassword(email) {
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          return { error: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local." };
        }
        const redirectTo = `${window.location.origin}/login`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        return error ? { error: error.message } : {};
      }
    }),
    [session, user, loading, configError]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
