"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { GOOGLE_AUTH_ENABLED } from "@/lib/config";
import { errorMessage } from "@/lib/utils";

export function GoogleButton({ next = "/dashboard" }: { next?: string }) {
  const { store } = useAuth();
  const [loading, setLoading] = React.useState(false);
  if (!GOOGLE_AUTH_ENABLED || store.mode !== "supabase") return null;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        loading={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await store.signInWithGoogle(next);
          } catch (e) {
            toast.error(errorMessage(e));
            setLoading(false);
          }
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12s4.3 9.8 9.7 9.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        Continue with Google
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-navy-900/10" /> or <span className="h-px flex-1 bg-navy-900/10" />
      </div>
    </>
  );
}
