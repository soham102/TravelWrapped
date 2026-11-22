"use client";

import { BarChart3, Database, KeyRound, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Avatar, PageHeader } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Card, PageLoader } from "@/components/ui/misc";
import { errorMessage } from "@/lib/utils";

export default function ProfilePage() {
  const { store, profile, user, refreshProfile } = useAuth();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [home, setHome] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [pw, setPw] = React.useState("");
  const [pwSaving, setPwSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setHome(profile.home_city ?? "");
    }
  }, [profile]);

  if (!profile || !user) return <PageLoader />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (name.trim().length < 2 || name.trim().length > 80) return setErr("Name should be 2–80 characters");
    if (home.length > 80) return setErr("Home city should be under 80 characters");
    setSaving(true);
    try {
      await store.updateProfile({ full_name: name.trim(), home_city: home.trim() || null });
      await refreshProfile();
      toast.success("Profile saved");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Use at least 8 characters");
    setPwSaving(true);
    try {
      await store.updatePassword(pw);
      setPw("");
      toast.success("Password updated");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profile settings" />
      <div className="space-y-5">
        <Card>
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={profile.full_name ?? profile.email} url={profile.avatar_url} size={56} />
            <div>
              <p className="font-display text-xl font-bold">{profile.full_name || "Traveller"}</p>
              <p className="text-sm text-muted">{profile.email}</p>
            </div>
          </div>
          <form onSubmit={save} className="space-y-4" noValidate>
            <Field label="Display name" htmlFor="name" hint="Shown on your story cards and public Wrapped (first name only).">
              <Input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Home city" htmlFor="home" hint="Optional.">
              <Input id="home" value={home} maxLength={80} onChange={(e) => setHome(e.target.value)} placeholder="e.g. Pune" />
            </Field>
            {err && <p className="text-sm font-medium text-red-600">{err}</p>}
            <Button type="submit" loading={saving}>Save profile</Button>
          </form>
        </Card>

        <Card>
          <form onSubmit={changePw} className="space-y-4" noValidate>
            <p className="flex items-center gap-2 font-display text-lg font-bold"><KeyRound className="size-5" /> Change password</p>
            <Field label="New password" htmlFor="pw">
              <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </Field>
            <Button type="submit" variant="outline" loading={pwSaving}>Update password</Button>
          </form>
        </Card>

        <Card className="space-y-3">
          <p className="flex items-center gap-2 font-display text-lg font-bold"><Database className="size-5" /> Data & privacy</p>
          <p className="text-sm text-muted">
            {store.mode === "supabase"
              ? "Your trips and photos are stored in Supabase and protected by row-level security — only you can read them. Public links expose only your stats and map, never photos or notes."
              : "Local mode: everything is stored in this browser only. Clearing site data removes it."}
          </p>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-electric-600 hover:underline">
            <BarChart3 className="size-4" /> Product analytics (admins)
          </Link>
        </Card>

        <Button
          variant="outline"
          onClick={async () => {
            await store.signOut();
            router.replace("/");
          }}
        >
          <LogOut /> Log out
        </Button>
      </div>
    </div>
  );
}
