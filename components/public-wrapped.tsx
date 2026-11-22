"use client";

import { ArrowRight, Download, Map as MapIcon, Play } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Logo, SiteFooter } from "@/components/brand";
import { IndiaMapSvg } from "@/components/map/india-map-svg";
import { useExportStage } from "@/components/story/export-stage";
import { MapPoster, ScaledFrame } from "@/components/story/formats";
import { AnimateCtx } from "@/components/story/primitives";
import type { StoryData } from "@/components/story/slides";
import { StoryViewer } from "@/components/story/story-viewer";
import { Button, buttonVariants } from "@/components/ui/button";
import { trackOnce } from "@/lib/analytics";
import { statsToPoints } from "@/lib/hooks";
import { plural } from "@/lib/utils";
import { shareLine } from "@/lib/wrapped/compute";

export function PublicWrapped({ s, mode, viewKey, journeyHref }: { s: StoryData; mode: "public" | "demo"; viewKey: string; journeyHref?: string }) {
  const [viewer, setViewer] = React.useState(false);
  const { stage, download, busy } = useExportStage(s, mode === "demo" ? "travel-wrapped-sample" : `travel-wrapped-${s.ownerName.toLowerCase()}`);

  React.useEffect(() => {
    trackOnce(mode === "demo" ? "demo_view" : "public_view", viewKey, { year: s.year });
  }, [mode, viewKey, s.year]);

  return (
    <div className="min-h-screen bg-navy-950 text-cream-100">
      {stage}
      {viewer && <StoryViewer s={s} onClose={() => setViewer(false)} />}
      {mode === "demo" && (
        <div className="bg-sun-400 px-4 py-2 text-center text-sm font-bold text-navy-900">
          Sample data — this is what your Travel Wrapped looks like. <Link href="/signup" className="underline">Make yours →</Link>
        </div>
      )}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo light />
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>Create yours</Link>
      </header>

      <section className="grain relative overflow-hidden">
        <div className="absolute -left-40 top-0 size-[32rem] rounded-full bg-electric-500/30 blur-3xl" />
        <div className="absolute -right-40 bottom-0 size-[32rem] rounded-full bg-sunset-500/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-sunset-400">{s.ownerName}&apos;s Travel Wrapped {s.year}</p>
            <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] sm:text-7xl">{s.personality.title}</h1>
            <p className="mt-5 max-w-xl font-serif text-2xl italic text-cream-200 sm:text-3xl">{shareLine(s)}</p>
            <div className="mt-8 grid max-w-lg grid-cols-4 gap-2">
              {[
                [s.totalTrips, "trips"],
                [s.cities.length, "places"],
                [s.states.length, "states"],
                [s.totalDays, "days"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/8 p-3 text-center">
                  <p className="font-display text-3xl font-extrabold">{v}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cream-200/60">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setViewer(true)}>
                <Play /> Watch the story
              </Button>
              {journeyHref && (
                <Link href={journeyHref} className={buttonVariants({ size: "lg", variant: "electric" })}>
                  <MapIcon /> Watch the journey
                </Link>
              )}
              <Link href="/signup" className={buttonVariants({ size: "lg", variant: "glass" })}>
                Make my own <ArrowRight />
              </Link>
            </div>
          </div>
          <IndiaMapSvg width={420} height={480} theme="night" visitedStates={s.states} points={statsToPoints(s)} labels={8} routes animate interactive className="mx-auto w-full max-w-md" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid items-start gap-8 md:grid-cols-[1fr_1.1fr]">
          <div className="mx-auto w-full max-w-[340px]">
            <StoryViewer s={s} embedded />
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold">The year in places</h2>
            <p className="mt-2 text-cream-200/70">{plural(s.states.length, "state")} · {plural(s.cities.length, "place")} · personality: {s.personality.title}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-cream-200/80">
              {s.personality.reasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {s.cities.map((c) => (
                <span key={c.city + c.state + c.country} className="rounded-full bg-white/8 px-3 py-1 text-sm font-semibold">{c.city}</span>
              ))}
            </div>
            <div className="mt-8 max-w-[300px] overflow-hidden rounded-2xl shadow-2xl">
              <AnimateCtx.Provider value={false}>
                <ScaledFrame w={400} h={560}>
                  <MapPoster s={s} />
                </ScaledFrame>
              </AnimateCtx.Provider>
            </div>
            <Button variant="glass" className="mt-4" onClick={() => download("poster")} loading={busy === "poster"}>
              <Download /> Download map poster
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="rounded-[32px] bg-sunset-500 p-8 text-center sm:p-12">
          <p className="font-display text-3xl font-extrabold text-navy-950 sm:text-5xl">Where did your {s.year} take you?</p>
          <p className="mx-auto mt-3 max-w-lg text-cream-50">Add your trips and get your own map, personality and shareable story in minutes. Free.</p>
          <Link href="/signup" className={buttonVariants({ size: "lg", variant: "dark", className: "mt-6" })}>
            Create my Travel Wrapped <ArrowRight />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
