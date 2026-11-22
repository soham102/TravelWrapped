"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { TravelJourneyPlayer, type JourneyShareConfig } from "@/components/journey/travel-journey-player";
import { useAuth } from "@/components/providers";
import { usePublicUrl } from "@/components/story/share-panel";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageLoader } from "@/components/ui/misc";
import { track } from "@/lib/analytics";
import { useTrips } from "@/lib/hooks";
import { buildJourney, locateMissing } from "@/lib/journey/build";
import { journeyShareUrl } from "@/lib/journey/share";
import type { Trip, WrappedRecord } from "@/lib/types";
import { stableStringify } from "@/lib/utils";
import { computeWrapped, toSnapshot, tripYear } from "@/lib/wrapped/compute";
import { sampleTrips } from "@/lib/wrapped/sample";

export default function JourneyPage() {
  const params = useParams<{ year: string }>();
  const year = Number(params.year);
  const valid = Number.isInteger(year) && year >= 2000 && year <= 2100;
  const { store, profile } = useAuth();
  const { trips, loading } = useTrips();
  const [record, setRecord] = React.useState<WrappedRecord | null | undefined>(undefined);
  const [located, setLocated] = React.useState<Trip[] | null>(null);
  const name = profile?.full_name ?? null;

  React.useEffect(() => {
    if (!valid) return;
    store.listWrapped().then(
      (rs) => setRecord(rs.find((r) => r.year === year) ?? null),
      () => setRecord(null),
    );
  }, [store, year, valid]);

  // Destinations saved without coordinates get a best-effort lookup (in memory only).
  const yearTrips = React.useMemo(() => trips.filter((t) => tripYear(t) === year), [trips, year]);
  React.useEffect(() => {
    if (loading) return;
    const ctrl = new AbortController();
    locateMissing(yearTrips, ctrl.signal).then(
      (t) => !ctrl.signal.aborted && setLocated(t),
      () => !ctrl.signal.aborted && setLocated(yearTrips),
    );
    return () => ctrl.abort();
  }, [loading, yearTrips]);

  const real = React.useMemo(() => (located ? buildJourney(located, year, name) : null), [located, year, name]);
  // No trips this year → a clearly-labelled sample journey so people see what they'd get.
  const sample = React.useMemo(() => buildJourney(sampleTrips(year), year, "Aanya", { sample: true }), [year]);
  const journey = real && real.stats.trips > 0 ? real : real ? sample : null;

  const stats = React.useMemo(() => computeWrapped(trips, year, name), [trips, year, name]);
  const snapshot = React.useMemo(() => toSnapshot(stats), [stats]);
  const wrappedUrl = usePublicUrl(record ?? null);
  const shareUrl = journeyShareUrl(wrappedUrl);
  const stale = record ? stableStringify(record.stats) !== stableStringify(snapshot) : false;

  if (!valid) return <EmptyState title="Unknown year" action={<Link href="/wrapped" className={buttonVariants()}>Back</Link>} />;
  if (loading || !journey || record === undefined) return <PageLoader label="Plotting your journey…" />;

  if (!journey.sample && journey.stops.length === 0)
    return (
      <EmptyState
        title="We couldn't place your destinations on the map"
        body={`None of your ${year} destinations have map coordinates${journey.unlocated.length ? ` (${journey.unlocated.map((u) => u.city).join(", ")})` : ""}. Edit a trip and pick each place from the search suggestions to pin it.`}
        action={<Link href="/trips" className={buttonVariants()}>Edit my trips</Link>}
      />
    );

  const publish = async () => {
    const saved = record && !stale ? record : await store.saveWrapped(year, snapshot);
    const r = saved.is_public ? saved : await store.setWrappedPublic(saved.id, true);
    setRecord(r);
    track("share_click", { channel: "public_link", format: "journey" });
    toast.success(record?.is_public ? "Public link updated with your latest trips" : "Public link created");
  };

  const share: JourneyShareConfig = journey.sample
    ? {
        url: typeof window !== "undefined" ? `${window.location.origin}/demo/journey` : null,
        text: "Watch a Travel Wrapped journey unfold on the map ✈️",
        publicNote: "This is a sample journey. Add your own trips to share yours.",
      }
    : {
        url: shareUrl,
        text: `Watch my ${year} travel journey: ${journey.stats.places} places, ${journey.stats.states} states, ${journey.stats.trips} trips ✈️ #TravelWrapped`,
        publish,
        publicNote: shareUrl ? (
          <>
            Anyone with the link can watch your route and totals (no photos, captions or notes). It shares the same public link as your Wrapped — revoke it anytime from your <Link href={`/wrapped/${year}`} className="font-semibold underline">Wrapped page</Link>.
            {stale && (
              <button type="button" onClick={() => publish().catch((e) => toast.error(String(e)))} className="mt-2 block font-semibold text-electric-600 underline">
                Your trips changed — update the public version
              </button>
            )}
            {store.mode === "local" && <span className="mt-1 block">Local mode: the link carries the public stats inside it, so it can&apos;t be revoked once shared.</span>}
          </>
        ) : undefined,
      };

  return (
    <TravelJourneyPlayer
      key={`${journey.sample ? "sample" : "real"}-${journey.stops.length}-${journey.stops.map((s) => s.id).join(",").length}`}
      journey={journey}
      closeHref={journey.sample ? "/dashboard" : `/wrapped/${year}`}
      share={share}
      fileBase={journey.sample ? "travel-journey-sample" : `travel-journey-${year}`}
      sampleCta={
        <Link href="/trips/new" className={buttonVariants({ variant: "light", size: "lg" })}>
          <Plus /> Add my trips to make mine
        </Link>
      }
    />
  );
}
