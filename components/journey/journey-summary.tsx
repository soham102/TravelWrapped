"use client";

import { motion } from "framer-motion";
import { Download, MapPinOff, RotateCcw, Share2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import type { Journey } from "@/lib/journey/build";
import { fmtNumber, plural } from "@/lib/utils";

export function JourneyIntro({ journey }: { journey: Journey }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,5,20,0.65),rgba(11,5,20,0.15)_70%)]" />
      <motion.p
        className="relative text-xs font-bold uppercase tracking-[0.3em] text-sunset-400"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {journey.ownerName}&apos;s travel journey
      </motion.p>
      <motion.h1
        className="relative mt-3 font-serif text-5xl italic leading-[1.02] text-cream-50 sm:text-7xl"
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.35, duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        Your {journey.year} journey
        <br />
        <span className="text-sun-400">begins…</span>
      </motion.h1>
      <motion.p className="relative mt-5 text-sm font-semibold text-cream-200/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
        {plural(journey.stops.length, "stop")} · {plural(journey.stats.trips, "trip")}
      </motion.p>
    </motion.div>
  );
}

export function EnRouteChip({ from, to, km }: { from: string; to: string; km: number | null }) {
  return (
    <motion.div
      className="pointer-events-none rounded-full border border-white/10 bg-navy-900/75 px-4 py-2 text-center text-cream-100 shadow-xl backdrop-blur-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cream-200/60">Next stop</p>
      <p className="font-display text-lg font-extrabold leading-tight">
        {from} <span className="text-sunset-400">→</span> {to}
      </p>
      {km != null && km >= 15 && <p className="text-[11px] font-semibold text-sun-400">≈ {fmtNumber(km)} km as the crow flies</p>}
    </motion.div>
  );
}

/** Finale ("AND THAT WAS YOUR 2026!" + numbers) and the closing screen with download/share. */
export function JourneySummary({
  journey,
  closing,
  onReplay,
  onDownload,
  onShare,
  extra,
}: {
  journey: Journey;
  /** Second phase: closing words + actions. */
  closing: boolean;
  onReplay: () => void;
  onDownload: () => void;
  onShare: () => void;
  extra?: React.ReactNode;
}) {
  const st = journey.stats;
  const items: { v: string; l: string; c: string }[] = [
    { v: String(st.stops), l: st.stops === 1 ? "Destination explored" : "Destinations explored", c: "text-sunset-400" },
    { v: String(st.places), l: st.places === 1 ? "City visited" : "Cities visited", c: "text-sun-400" },
    { v: String(st.states), l: st.states === 1 ? "State explored" : "States explored", c: "text-jungle-300" },
    { v: String(st.trips), l: st.trips === 1 ? "Trip" : "Trips", c: "text-electric-300" },
  ];
  if (st.countries.length > 1) items.push({ v: String(st.countries.length), l: "Countries", c: "text-cream-50" });
  if (st.km != null) items.push({ v: fmtNumber(st.km), l: st.kmTrips < st.trips ? `Km logged (${plural(st.kmTrips, "trip")})` : "Km travelled", c: "text-sunset-300" });

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end px-4 pb-10 text-center md:items-start md:justify-center md:pb-36 md:pl-10 md:pt-24 md:text-left"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/60 to-transparent md:bg-gradient-to-r md:from-navy-950/95 md:via-navy-950/70 md:to-transparent" />
      <div className="relative w-full max-w-2xl md:max-w-[440px]">
        <motion.h2
          className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-cream-50 md:text-5xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 16, stiffness: 160 }}
        >
          And that was your <span className="text-sunset-400">{journey.year}!</span>
        </motion.h2>

        <div className="mx-auto mt-5 grid max-w-xl grid-cols-3 gap-2 md:mx-0 md:gap-2.5">
          {items.map((it, i) => (
            <motion.div
              key={it.l}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2.5 backdrop-blur md:px-3 md:py-3"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.12 }}
            >
              <p className={`font-display text-2xl font-extrabold tabular-nums md:text-4xl ${it.c}`}>{it.v}</p>
              <p className="mt-0.5 text-[9.5px] font-bold uppercase leading-tight tracking-wider text-cream-200/65 md:text-[11px]">{it.l}</p>
            </motion.div>
          ))}
        </div>

        {journey.unlocated.length > 0 && (
          <p className="mx-auto mt-3 flex max-w-md items-center justify-center gap-1.5 text-xs text-cream-200/55 md:mx-0 md:justify-start">
            <MapPinOff className="size-3.5 shrink-0" />
            {plural(journey.unlocated.length, "place")} counted but not on the map (no coordinates): {journey.unlocated.slice(0, 3).map((u) => u.city).join(", ")}
            {journey.unlocated.length > 3 && "…"}
          </p>
        )}

        {closing && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <p className="mx-auto mt-5 max-w-lg font-serif text-xl italic leading-snug text-cream-100 md:mx-0 md:mt-7 md:text-3xl">
              Every destination became a memory. <span className="text-sun-400">Every journey became a story.</span>
            </p>
            <div className="pointer-events-auto mt-5 flex flex-wrap justify-center gap-2 md:justify-start md:gap-2.5">
              <Button onClick={onDownload} className="md:h-14 md:px-7">
                <Download /> Download My Journey
              </Button>
              <Button variant="glass" onClick={onShare} className="md:h-14 md:px-7">
                <Share2 /> Share My Journey
              </Button>
              <Button variant="glass" size="icon" onClick={onReplay} aria-label="Replay journey" className="md:size-14">
                <RotateCcw />
              </Button>
            </div>
            {extra && <div className="pointer-events-auto mt-4">{extra}</div>}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
