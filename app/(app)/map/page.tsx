"use client";

import { Download, MapPin, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";
import { PageHeader } from "@/components/app-shell";
import { TRIP_COLORS } from "@/lib/colors";
import { useAuth } from "@/components/providers";
import { useExportStage } from "@/components/story/export-stage";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, EmptyState, PageLoader, StatTile } from "@/components/ui/misc";
import { useTrips } from "@/lib/hooks";
import { STATE_NAMES } from "@/lib/geo/india";
import { cn, fmtNumber, fmtRange, plural } from "@/lib/utils";
import { availableYears, computeWrapped, tripYear } from "@/lib/wrapped/compute";

const LeafletMap = dynamic(() => import("@/components/map/india-map-leaflet"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-navy-900 text-sm text-cream-200/60">Loading map…</div>,
});

export default function MapPage() {
  const { profile } = useAuth();
  const { trips, loading } = useTrips();
  const years = availableYears(trips);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = React.useState<number | null>(null);
  const y = year ?? (years.includes(thisYear) ? thisYear : years[0] ?? thisYear);

  const stats = React.useMemo(() => computeWrapped(trips, y, profile?.full_name ?? null), [trips, y, profile?.full_name]);
  const yearTrips = React.useMemo(
    () => trips.filter((t) => tripYear(t) === y).sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [trips, y],
  );
  const { stage, download, busy } = useExportStage(stats, `travel-wrapped-${y}`);

  if (loading) return <PageLoader />;

  if (trips.length === 0)
    return (
      <>
        <PageHeader title="My Travel Map" />
        <EmptyState icon={<MapPin className="size-6" />} title="Your map is waiting" body="Add a trip and its destinations will light up here." action={<Link href="/trips/new" className={buttonVariants()}><Plus /> Add a trip</Link>} />
      </>
    );

  const india = stats.cities.filter((c) => c.country === "India");
  const abroad = stats.cities.filter((c) => c.country !== "India");
  const unpinned = stats.cities.filter((c) => c.lat == null).length;

  return (
    <div>
      {stage}
      <PageHeader
        title="My Travel Map"
        subtitle={`${plural(stats.states.length, "state")} of ${STATE_NAMES.length} explored in ${y}`}
        action={
          <Button onClick={() => download("poster")} loading={busy === "poster"} variant="dark">
            <Download /> Download map poster
          </Button>
        }
      />

      {years.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {years.map((yy) => (
            <button key={yy} onClick={() => setYear(yy)} className={cn("rounded-full border-2 px-4 py-1.5 text-sm font-semibold", yy === y ? "border-navy-900 bg-navy-900 text-cream-100" : "border-navy-900/10 bg-white")}>
              {yy}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="States explored" value={stats.states.length} accent="sunset" />
        <StatTile label="Cities explored" value={stats.cities.length} accent="electric" />
        <StatTile label="Total trips" value={stats.totalTrips} accent="jungle" />
        {stats.totalKm != null ? (
          <StatTile label="Km logged" value={fmtNumber(stats.totalKm)} accent="navy" sub={stats.kmTripsCount < stats.totalTrips ? `from ${plural(stats.kmTripsCount, "trip")} with distance` : undefined} />
        ) : (
          <StatTile label="Total distance" value="—" accent="navy" sub="Add km to your trips to see this" />
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-[28px] border border-navy-900/10 bg-navy-900">
          <LeafletMap trips={yearTrips} visitedStates={stats.states} />
        </div>
        <div className="space-y-4">
          <Card>
            <p className="font-display text-lg font-bold">Trips on the map</p>
            <ul className="mt-3 space-y-2">
              {yearTrips.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="size-3.5 shrink-0 rounded-full ring-2 ring-navy-900" style={{ background: TRIP_COLORS[i % TRIP_COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{t.trip_name}</span>
                  <span className="shrink-0 text-xs text-muted">{fmtRange(t.start_date, t.end_date)}</span>
                </li>
              ))}
              {yearTrips.length === 0 && <li className="text-sm text-muted">No trips in {y}.</li>}
            </ul>
          </Card>
          <Card>
            <p className="font-display text-lg font-bold">States & UTs ({stats.states.length})</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {stats.states.map((s) => (
                <span key={s} className="rounded-full bg-sunset-500/12 px-3 py-1 text-sm font-semibold text-sunset-600">{s}</span>
              ))}
              {stats.states.length === 0 && <p className="text-sm text-muted">None yet</p>}
            </div>
          </Card>
          <Card>
            <p className="font-display text-lg font-bold">Places ({stats.cities.length})</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {india.map((c) => (
                <span key={c.city + c.state} className="rounded-full bg-cream-100 px-3 py-1 text-sm font-semibold">
                  {c.city}{c.visits > 1 && <span className="ml-1 text-electric-600">×{c.visits}</span>}
                </span>
              ))}
              {abroad.map((c) => (
                <span key={c.city + c.country} className="rounded-full bg-electric-500/10 px-3 py-1 text-sm font-semibold text-electric-600">
                  {c.city}, {c.country}
                </span>
              ))}
            </div>
            {unpinned > 0 && <p className="mt-3 text-xs text-muted">{plural(unpinned, "place")} added manually without coordinates — counted, but not pinned.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
