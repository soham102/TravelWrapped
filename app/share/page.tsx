"use client";

import Link from "next/link";
import * as React from "react";
import { PublicWrapped } from "@/components/public-wrapped";
import { PageLoader } from "@/components/ui/misc";
import { decodeSnapshot } from "@/lib/share";
import type { WrappedSnapshot } from "@/lib/types";

/** Local-mode public link: the public-safe snapshot is encoded in the URL hash (never sent to a server). */
export default function LocalSharePage() {
  const [s, setS] = React.useState<WrappedSnapshot | null | undefined>(undefined);

  React.useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!token) return setS(null);
    decodeSnapshot(token).then(
      (snap) => setS(snap && snap.personality && Array.isArray(snap.cities) ? { ...snap, highlights: [] } : null),
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
  return <PublicWrapped s={s} mode="public" viewKey="local" />;
}
