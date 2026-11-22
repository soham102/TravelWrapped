"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { trackOnce } from "@/lib/analytics";
import { type Journey, journeyFromSnapshot } from "@/lib/journey/build";
import type { WrappedSnapshot } from "@/lib/types";
import { TravelJourneyPlayer } from "./travel-journey-player";

/** A journey anyone can watch: a published (public-safe) snapshot, or the labelled demo. */
export function PublicJourney({
  snapshot,
  journey: given,
  mode,
  viewKey,
  closeHref,
}: {
  snapshot?: WrappedSnapshot;
  journey?: Journey;
  mode: "public" | "demo";
  viewKey: string;
  closeHref: string;
}) {
  const journey = React.useMemo(() => given ?? journeyFromSnapshot(snapshot!), [given, snapshot]);
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUrl(window.location.href);
    trackOnce(mode === "demo" ? "demo_view" : "public_view", `journey-${viewKey}`, { year: journey.year, format: "journey" });
  }, [mode, viewKey, journey.year]);

  if (journey.stops.length === 0)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 px-6 text-center text-cream-100">
        <p className="font-display text-4xl font-extrabold">No mapped destinations yet</p>
        <p className="max-w-md text-cream-200/70">This journey doesn&apos;t have any destinations with map coordinates.</p>
        <Link href="/" className={buttonVariants()}>Create your own Travel Wrapped</Link>
      </div>
    );

  return (
    <TravelJourneyPlayer
      journey={journey}
      closeHref={closeHref}
      fileBase={mode === "demo" ? "travel-journey-sample" : `travel-journey-${journey.ownerName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${journey.year}`}
      share={{
        url,
        text: mode === "demo" ? "Watch a Travel Wrapped journey unfold on the map ✈️" : `Watch ${journey.ownerName}'s ${journey.year} travel journey ✈️ #TravelWrapped`,
        publicNote: mode === "demo" ? "This is sample data." : undefined,
      }}
      sampleCta={
        <Link href="/signup" className={buttonVariants({ variant: "light", size: "lg" })}>
          Make my own <ArrowRight />
        </Link>
      }
    />
  );
}
