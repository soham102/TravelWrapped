import Link from "next/link";
import { DISCLAIMER } from "@/lib/config";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id="tw-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5c85" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#tw-g)" />
      <path d="M8 21c4-8 12-12 16-10" stroke="#faf7f3" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeDasharray="2.5 3" />
      <circle cx="8" cy="21" r="2.6" fill="#faf7f3" />
      <path d="M24 7.5l2.2 3.8-4.3.6z" fill="#faf7f3" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)} aria-label="Travel Wrapped home">
      <LogoMark />
      <span className={cn("font-display text-lg font-extrabold tracking-tight", light ? "text-cream-100" : "text-ink")}>
        Travel<span className="text-sunset-500">Wrapped</span>
      </span>
    </Link>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return <p className={cn("text-xs", className)}>{DISCLAIMER}</p>;
}

export function SiteFooter({ dark = true }: { dark?: boolean }) {
  return (
    <footer className={cn(dark ? "bg-navy-950 text-cream-200/70" : "bg-cream-200 text-muted")}>
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo light={dark} />
          <p className="mt-3 max-w-xs text-sm">Your journeys. Your memories. Your year. Turn every trip into a story worth sharing.</p>
          <Disclaimer className={cn("mt-6 font-semibold", dark ? "text-cream-100" : "text-ink")} />
        </div>
        <nav className="space-y-2 text-sm" aria-label="Product">
          <p className={cn("font-semibold", dark ? "text-cream-100" : "text-ink")}>Product</p>
          <Link href="/demo" className="block hover:underline">See a sample Wrapped</Link>
          <Link href="/signup" className="block hover:underline">Create my Travel Wrapped</Link>
          <Link href="/#how" className="block hover:underline">How it works</Link>
        </nav>
        <nav className="space-y-2 text-sm" aria-label="Account">
          <p className={cn("font-semibold", dark ? "text-cream-100" : "text-ink")}>Account</p>
          <Link href="/login" className="block hover:underline">Log in</Link>
          <Link href="/dashboard" className="block hover:underline">Dashboard</Link>
          <Link href="/#privacy" className="block hover:underline">Privacy</Link>
        </nav>
      </div>
      <div className={cn("border-t px-5 py-5 text-center text-xs", dark ? "border-white/10" : "border-navy-900/10")}>
        Map boundaries: DataMeet / Survey of India-aligned. Basemap tiles © Esri, © OpenStreetMap contributors.
      </div>
    </footer>
  );
}
