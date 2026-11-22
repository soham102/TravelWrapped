"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { AuthLayout, nextPath } from "@/components/auth-layout";
import { GoogleButton } from "@/components/google-button";
import { REF_KEY, useAuth } from "@/components/providers";

const noopSubscribe = () => () => {};

function readReferred() {
  try {
    return Boolean(localStorage.getItem(REF_KEY));
  } catch {
    return false;
  }
}

/** Supabase redirects back with ?error_description=… when Google sign-in is cancelled or fails. */
function readOAuthError() {
  const p = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const msg = p.get("error_description") || hash.get("error_description");
  return msg ? msg.replace(/\+/g, " ") : null;
}

/**
 * The whole sign-in page when Supabase is configured: one Google button. The first Google sign-in
 * creates the account (name and photo come from Google), so login and signup are the same step.
 */
export function GoogleSignIn({ variant }: { variant: "login" | "signup" }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const referred = React.useSyncExternalStore(noopSubscribe, readReferred, () => false);
  const oauthError = React.useSyncExternalStore(noopSubscribe, readOAuthError, () => null);

  React.useEffect(() => {
    if (!loading && user) router.replace(nextPath(variant === "signup" ? "/dashboard?welcome=1" : "/dashboard"));
  }, [loading, user, router, variant]);

  return (
    <AuthLayout
      title={variant === "signup" ? "Start your Wrapped" : "Welcome back"}
      subtitle={variant === "signup" ? "Free, private by default, and ready in minutes." : "Sign in to keep building your travel story."}
    >
      {referred && (
        <p className="mb-5 rounded-2xl bg-electric-500/10 px-4 py-3 text-sm font-semibold text-electric-600">🎉 A friend invited you — welcome aboard!</p>
      )}
      {oauthError && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          Google sign-in didn&apos;t complete: {oauthError}. Please try again.
        </p>
      )}
      <GoogleButton next={nextPath(variant === "signup" ? "/dashboard?welcome=1" : "/dashboard")} />
      <p className="mt-5 text-center text-sm text-muted">
        {variant === "signup" ? "Already have an account? The same button signs you in." : "New here? The same button creates your account."}
      </p>
      <p className="mt-8 text-center text-xs text-muted">
        We only use your Google name, email and profile photo. Your trips and photos stay private unless you choose to share them.
      </p>
    </AuthLayout>
  );
}
