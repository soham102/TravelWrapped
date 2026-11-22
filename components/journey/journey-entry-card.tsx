"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { IndiaMapSvg, type MapPoint } from "@/components/map/india-map-svg";
import type { Journey } from "@/lib/journey/build";
import { cn, plural } from "@/lib/utils";

/** Looping preview: the user's own route drawing itself on the India map. */
function JourneyPreview({ points, className }: { points: MapPoint[]; className?: string }) {
  const [loop, setLoop] = React.useState(0);
  React.useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setLoop((n) => n + 1), 6500);
    return () => clearInterval(id);
  }, []);
  return <IndiaMapSvg key={loop} width={300} height={330} theme="night" points={points} routes animate labels={4} className={className} />;
}

export function journeyPoints(j: Pick<Journey, "stops">): MapPoint[] {
  // group 0 for all stops so the preview connects the whole journey in order.
  return j.stops.map((s) => ({ lat: s.lat, lng: s.lng, label: s.city, group: 0 }));
}

/** Entry point: "Watch My Travel Journey". */
export function JourneyEntryCard({
  href,
  journey,
  className,
  compact = false,
}: {
  href: string;
  journey: Journey;
  className?: string;
  compact?: boolean;
}) {
  const points = React.useMemo(() => journeyPoints(journey), [journey]);
  return (
    <Link
      href={href}
      className={cn(
        "grain group relative grid items-center gap-4 overflow-hidden rounded-[28px] bg-navy-950 p-6 text-cream-100 transition hover:shadow-2xl sm:p-8",
        compact ? "sm:grid-cols-[1fr_200px]" : "md:grid-cols-[1.25fr_1fr]",
        className,
      )}
    >
      <div className="absolute -left-20 -top-24 size-72 rounded-full bg-electric-500/30 blur-3xl" />
      <div className="absolute -bottom-28 right-0 size-72 rounded-full bg-sunset-500/30 blur-3xl" />
      <div className="relative z-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sunset-400">
          New · My Travel Journey {journey.sample && <span className="ml-1 rounded-full bg-sun-400 px-2 py-0.5 tracking-normal text-navy-900">Sample</span>}
        </p>
        <h3 className={cn("mt-2 font-display font-extrabold leading-[0.95]", compact ? "text-3xl" : "text-4xl sm:text-5xl")}>Watch My Travel Journey</h3>
        <p className="mt-3 max-w-md text-cream-200/80">See every destination, every route and every adventure unfold on the map.</p>
        <p className="mt-2 text-xs font-semibold text-cream-200/55">
          {plural(journey.stats.places, "place")} · {plural(journey.stats.trips, "trip")} · {plural(journey.stats.states, "state")} · {journey.year}
        </p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-sunset-500 px-6 py-3.5 font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,51,102,0.9)] transition group-hover:gap-3 group-hover:bg-sunset-600">
          <Play className="size-4" fill="currentColor" /> Play My Travel Journey
        </span>
      </div>
      <JourneyPreview points={points} className={cn("relative z-10 mx-auto w-full", compact ? "max-w-[200px]" : "max-w-[300px]")} />
    </Link>
  );
}
