"use client";

import { Gift, Home, LogOut, Map, Plane, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Logo } from "@/components/brand";
import { useAuth } from "@/components/providers";
import { PageLoader } from "@/components/ui/misc";
import { cn, firstName } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/trips", label: "Trips", icon: Plane },
  { href: "/map", label: "Map", icon: Map },
  { href: "/wrapped", label: "Wrapped", icon: Sparkles },
  { href: "/invite", label: "Invite", icon: Gift },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, store } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (loading || user) return;
    let cancelled = false;
    void (async () => {
      // If this page was the OAuth return (e.g. /dashboard?code=…) and no session came of it, carry the
      // reason to /login instead of silently showing the sign-in button again.
      const query = new URLSearchParams(window.location.search);
      let reason = (await store.authCallbackError?.().catch(() => null)) ?? null;
      if (!reason && query.has("code")) {
        reason = `the sign-in returned to ${window.location.origin} but this browser has no pending sign-in for it (it may have started on a different web address)`;
      }
      if (cancelled) return;
      const q = new URLSearchParams({ next: pathname });
      if (reason) q.set("error_description", reason);
      router.replace(`/login?${q}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, pathname, router, store]);

  if (loading || !user) return <PageLoader label={loading ? "Loading…" : "Redirecting to login…"} />;

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      {store.mode === "local" && (
        <div className="bg-electric-500 px-4 py-1.5 text-center text-xs font-semibold text-white">
          Local mode — your data is saved in this browser only. Connect Supabase to sync across devices.
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-navy-900/8 bg-cream-100/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden flex-1 items-center gap-1 sm:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  active(n.href) ? "bg-navy-900 text-cream-100" : "text-ink/70 hover:bg-navy-900/5 hover:text-ink",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold transition hover:bg-navy-900/5",
                active("/profile") && "bg-navy-900/5",
              )}
            >
              <Avatar name={profile?.full_name ?? user.email} url={profile?.avatar_url} />
              <span className="hidden md:inline">{firstName(profile?.full_name)}</span>
            </Link>
            <button
              onClick={async () => {
                await store.signOut();
                router.replace("/");
              }}
              className="hidden rounded-full p-2 text-muted transition hover:bg-navy-900/5 hover:text-ink sm:block"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>

      <nav
        className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-full bg-navy-900 px-2 py-2 shadow-2xl sm:hidden"
        aria-label="Main"
      >
        {[...NAV.slice(0, 4), { href: "/profile", label: "Me", icon: User }].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition",
              active(n.href) ? "bg-cream-100 text-navy-900" : "text-cream-200/70",
            )}
          >
            <n.icon className="size-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Avatar({ name, url, size = 32 }: { name?: string | null; url?: string | null; size?: number }) {
  const initial = (name || "T").trim()[0]?.toUpperCase() ?? "T";
  if (url)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span
      className="grid place-items-center rounded-full bg-gradient-to-br from-sunset-400 to-electric-500 font-display font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-sunset-600">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
