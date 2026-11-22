"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { errorMessage, isValidEmail } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const { store } = useAuth();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email.trim())) return setError("Enter a valid email address");
    setBusy(true);
    try {
      await store.sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a secure link to set a new one.">
      {sent ? (
        <div className="rounded-3xl bg-jungle-500/10 p-6 text-center">
          <MailCheck className="mx-auto size-10 text-jungle-600" />
          <p className="mt-3 font-semibold">If an account exists for {email}, a reset link is on its way.</p>
          <p className="mt-1 text-sm text-muted">The link expires in about an hour.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-electric-600 hover:underline">Back to login</Link>
      </p>
    </AuthLayout>
  );
}
