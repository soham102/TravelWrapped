"use client";

import Link from "next/link";
import * as React from "react";
import { PublicJourney } from "@/components/journey/public-journey";
import { PageLoader } from "@/components/ui/misc";
import { decodeSnapshot } from "@/lib/share";
import type { WrappedSnapshot } from "@/lib/types";

/** Local-mode public journey: the public-safe snapshot travels in the URL hash (never sent to a server). */
export default function LocalShareJourneyPage() {
  const [s, setS] = React.useState<WrappedSnapshot | null | undefined>(undefined);
  const [hash, setHash] = React.useState("");

  React.useEffect(() => {
    const token = window.location.hash.slice(1);
    setHash(window.location.hash);
    if (!token) return setS(null);
    decodeSnapshot(token).then(
      (snap) => setS(snap && Array.isArray(snap.cities) && Array.isArray(snap.timeline) ? { ...snap, highlights: [] } : null),
      () => setS(null),
    );
  }, []);

  if (s === undefined) return <div className="min-h-screen bg-navy-950"><PageLoader /></div>;
  if (s === null)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 px-6 text-center text-cream-100">
        <p className="font-display text-4xl font-extrabold">This link looks broken</p>
        <Link href="/" className="rounded-full bg-sunset-500 px-6 py-3 font-semibold text-white">Create your own Travel Wrapped</Link>
      </div>
    );
  return <PublicJourney snapshot={s} mode="public" viewKey="local" closeHref={`/share${hash}`} />;
}
