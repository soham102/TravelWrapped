"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { AuthLayout } from "@/components/auth-layout";
import { GoogleSignIn } from "@/components/google-sign-in";
import { REF_KEY, useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { track } from "@/lib/analytics";
import { errorMessage, isValidEmail } from "@/lib/utils";

export default function SignupPage() {
  const { store, user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [referred, setReferred] = React.useState(false);

  React.useEffect(() => {
    try {
      setReferred(Boolean(localStorage.getItem(REF_KEY)));
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    if (!loading && user && !sentTo) router.replace("/dashboard");
  }, [loading, user, router, sentTo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Tell us your name (at least 2 characters)";
    if (name.trim().length > 80) errs.name = "Keep it under 80 characters";
    if (!isValidEmail(email.trim())) errs.email = "Enter a valid email address";
    if (password.length < 8) errs.password = "Use at least 8 characters";
    else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) errs.password = "Mix letters and numbers";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const { needsConfirmation } = await store.signUp(email.trim(), password, name.trim());
      track("signup", { referred, method: "email" });
      if (needsConfirmation) setSentTo(email.trim());
      else router.replace("/dashboard?welcome=1");
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  // With Supabase, sign-up is Google only. The email form below is for local mode (no Supabase).
  if (store.mode === "supabase") return <GoogleSignIn variant="signup" />;

  if (sentTo)
    return (
      <AuthLayout title="Check your inbox" subtitle="One last step before your travel year begins.">
        <div className="rounded-3xl bg-jungle-500/10 p-6 text-center">
          <MailCheck className="mx-auto size-10 text-jungle-600" />
          <p className="mt-3 font-semibold">We sent a confirmation link to {sentTo}.</p>
          <p className="mt-1 text-sm text-muted">Open it on this device to activate your account.</p>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Already confirmed? <Link href="/login" className="font-semibold text-sunset-600 hover:underline">Log in</Link>
        </p>
      </AuthLayout>
    );

  return (
    <AuthLayout title="Start your Wrapped" subtitle="Free, private by default, and ready in minutes.">
      {referred && (
        <p className="mb-5 rounded-2xl bg-electric-500/10 px-4 py-3 text-sm font-semibold text-electric-600">
          🎉 A friend invited you — welcome aboard!
        </p>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Your name" htmlFor="name" error={errors.name}>
          <Input id="name" autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Aanya Sharma" aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters, letters and numbers">
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
        </Field>
        {errors.form && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{errors.form}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create my Travel Wrapped
        </Button>
        <p className="text-center text-xs text-muted">Your trips and photos are private unless you choose to share them.</p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-sunset-600 hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
