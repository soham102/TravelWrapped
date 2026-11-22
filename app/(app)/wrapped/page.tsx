"use client";

import { ArrowRight, Globe, Lock, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { buttonVariants } from "@/components/ui/button";
import { Badge, EmptyState, PageLoader } from "@/components/ui/misc";
import { useTrips } from "@/lib/hooks";
import type { WrappedRecord } from "@/lib/types";
import { plural } from "@/lib/utils";
import { availableYears, computeWrapped } from "@/lib/wrapped/compute";

export default function WrappedListPage() {
  const { store, profile } = useAuth();
  const { trips, loading } = useTrips();
  const [records, setRecords] = React.useState<WrappedRecord[] | null>(null);

  React.useEffect(() => {
    store.listWrapped().then(setRecords, () => setRecords([]));
  }, [store]);

  if (loading || !records) return <PageLoader />;

  const years = Array.from(new Set([...availableYears(trips), ...records.map((r) => r.year)])).sort((a, b) => b - a);

  return (
    <div>
      <PageHeader
        title="My Travel Wrapped"
        subtitle="One story for every year you travelled. Generate, replay, download and share."
        action={<Link href="/trips/new" className={buttonVariants({ variant: "outline" })}><Plus /> Add trip</Link>}
      />
      {years.length === 0 ? (
        <EmptyState icon={<Sparkles className="size-6" />} title="No Wrapped yet" body="Add at least one trip and we'll turn it into your story." action={<Link href="/trips/new" className={buttonVariants()}><Plus /> Add a trip</Link>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((y, i) => {
            const s = computeWrapped(trips, y, profile?.full_name ?? null);
            const rec = records.find((r) => r.year === y);
            const bg = ["linear-gradient(150deg,#6232f0,#ff6a3d)", "linear-gradient(150deg,#0e8f6e,#0b1026)", "linear-gradient(150deg,#ff6a3d,#ffc93c)"][i % 3];
            return (
              <Link key={y} href={`/wrapped/${y}`} className="grain group relative flex min-h-64 flex-col overflow-hidden rounded-[28px] p-6 text-cream-50" style={{ background: bg }}>
                <div className="relative z-10 flex items-center justify-between">
                  <Badge className="bg-white/20 text-cream-50">{rec ? "Generated" : "Ready to generate"}</Badge>
                  {rec && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold">
                      {rec.is_public ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />} {rec.is_public ? "Public" : "Private"}
                    </span>
                  )}
                </div>
                <p className="relative z-10 mt-4 font-display text-6xl font-extrabold leading-none">{y}</p>
                <p className="relative z-10 mt-2 font-serif text-xl italic">{s.totalTrips ? s.personality.title : "No trips this year"}</p>
                <p className="relative z-10 mt-1 text-sm text-cream-50/80">
                  {plural(s.totalTrips, "trip")} · {plural(s.cities.length, "place")} · {plural(s.states.length, "state")}
                </p>
                <span className="relative z-10 mt-auto inline-flex w-fit items-center gap-2 pt-6 text-sm font-bold">
                  {rec ? "Open" : "Generate"} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
