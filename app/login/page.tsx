"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { AuthLayout, nextPath } from "@/components/auth-layout";
import { GoogleSignIn } from "@/components/google-sign-in";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { track } from "@/lib/analytics";
import { errorMessage, isValidEmail } from "@/lib/utils";

export default function LoginPage() {
  const { store, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) router.replace(nextPath());
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email.trim())) return setError("Enter a valid email address");
    if (!password) return setError("Enter your password");
    setBusy(true);
    try {
      await store.signIn(email.trim(), password);
      track("login");
      toast.success("Welcome back!");
      router.replace(nextPath());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // With Supabase, sign-in is Google only. The email form below is for local mode (no Supabase).
  if (store.mode === "supabase") return <GoogleSignIn variant="login" />;

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to keep building your travel story.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Log in
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="font-semibold text-electric-600 hover:underline">Forgot password?</Link>
        <span className="text-muted">
          New here? <Link href="/signup" className="font-semibold text-sunset-600 hover:underline">Create an account</Link>
        </span>
      </div>
    </AuthLayout>
  );
}
