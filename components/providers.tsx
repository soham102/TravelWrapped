"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { getStore, type Store } from "@/lib/store";
import type { AuthUser, Profile } from "@/lib/types";

interface AuthState {
  store: Store;
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export const REF_KEY = "tw_ref";

export function Providers({ children }: { children: React.ReactNode }) {
  const store = React.useMemo(() => getStore(), []);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshProfile = React.useCallback(async () => {
    try {
      setProfile(await store.getProfile());
    } catch {
      setProfile(null);
    }
  }, [store]);

  React.useEffect(() => {
    let alive = true;
    const handle = async (u: AuthUser | null) => {
      if (!alive) return;
      setUser(u);
      if (u) {
        await refreshProfile();
        // Attribute referral signups (code captured from /r/<code>)
        try {
          const code = localStorage.getItem(REF_KEY);
          if (code) {
            localStorage.removeItem(REF_KEY);
            void store.claimReferral(code);
          }
        } catch {
          /* ignore */
        }
      } else setProfile(null);
      if (alive) setLoading(false);
    };
    store.getUser().then(handle, () => handle(null));
    const unsub = store.onAuthChange((u) => void handle(u));
    return () => {
      alive = false;
      unsub();
    };
  }, [store, refreshProfile]);

  const value = React.useMemo(
    () => ({ store, user, profile, loading, refreshProfile }),
    [store, user, profile, loading, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Toaster position="top-center" richColors closeButton toastOptions={{ style: { borderRadius: 16 } }} />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <Providers>");
  return ctx;
}
