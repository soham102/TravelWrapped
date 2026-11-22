"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { PageLoader } from "@/components/ui/misc";
import { errorMessage } from "@/lib/utils";

export default function ResetPasswordPage() {
  const { store, user, loading } = useAuth();
  const router = useRouter();
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [waited, setWaited] = React.useState(false);

  // The recovery link signs the user in via the URL; give the client a moment to exchange it.
  React.useEffect(() => {
    const t = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Use at least 8 characters");
    if (pw !== pw2) return setError("Passwords don't match");
    setBusy(true);
    try {
      await store.updatePassword(pw);
      toast.success("Password updated");
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading || (!user && !waited)) return <PageLoader label="Verifying your reset link…" />;

  return (
    <AuthLayout title="Choose a new password">
      {!user ? (
        <div className="rounded-3xl bg-red-50 p-6 text-sm text-red-700">
          This reset link is invalid or has expired.{" "}
          <Link href="/forgot-password" className="font-semibold underline">Request a new one</Link>.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="New password" htmlFor="pw">
            <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <Field label="Confirm password" htmlFor="pw2">
            <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </Field>
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>Update password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
