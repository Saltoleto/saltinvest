import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

export function asErrorMessage(err: unknown): string {
  const e = err as any;
  return e?.message ?? "Erro inesperado.";
}

export function pgErrorMessage(err: PostgrestError | null): string | null {
  if (!err) return null;
  return err.message;
}

export async function requireUserId(): Promise<string> {
  // Performance: avoid calling auth.getUser() repeatedly (network) on every query.
  // getSession() reads from local storage and is effectively instant.
  // Keep a tiny in-memory cache and invalidate on auth state changes.
  if (cachedUserId) return cachedUserId;
  if (!authListenerAttached) attachAuthListener();
  if (cachedUserIdPromise) return cachedUserIdPromise;

  cachedUserIdPromise = (async () => {
    const { data: sess } = await supabase.auth.getSession();
    const sid = sess.session?.user?.id;
    if (sid) {
      cachedUserId = sid;
      return sid;
    }

    // Fallback (should be rare): network roundtrip.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error("Usuário não autenticado.");
    cachedUserId = data.user.id;
    return data.user.id;
  })().finally(() => {
    cachedUserIdPromise = null;
  });

  return cachedUserIdPromise;
}

let cachedUserId: string | null = null;
let cachedUserIdPromise: Promise<string> | null = null;
let authListenerAttached = false;

function attachAuthListener() {
  if (authListenerAttached) return;
  authListenerAttached = true;
  supabase.auth.onAuthStateChange(() => {
    cachedUserId = null;
    cachedUserIdPromise = null;
  });
}

export function monthRangeISO(d = new Date()): { start: string; end: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}
