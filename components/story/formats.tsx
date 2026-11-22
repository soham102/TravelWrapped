"use client";

import * as React from "react";
import { LogoMark } from "@/components/brand";
import { IndiaMapSvg } from "@/components/map/india-map-svg";
import { statsToPoints } from "@/lib/hooks";
import { MONTH_NAMES, brandHost, fmtNumber, fmtRange, parseDate, plural } from "@/lib/utils";
import { Canvas } from "./primitives";
import type { StoryData } from "./slides";

/* B ─ Instagram post (1:1) */
export function PostCard({ s }: { s: StoryData }) {
  const stats: [string | number, string][] = [
    [s.totalTrips, s.totalTrips === 1 ? "trip" : "trips"],
    [s.cities.length, s.cities.length === 1 ? "place" : "places"],
    [s.states.length, s.states.length === 1 ? "state" : "states"],
    s.totalKm != null ? [fmtNumber(s.totalKm), "km"] : [s.totalDays, "days away"],
  ];
  return (
    <Canvas w={360} h={360} className="grain bg-navy-900 text-cream-100">
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-sunset-500/50 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-electric-500/50 blur-3xl" />
      <div className="relative z-10 grid h-full grid-cols-[1.05fr_1fr] gap-2 p-5">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <LogoMark className="size-5" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-cream-200/80">Travel Wrapped</span>
          </div>
          <p className="mt-3 font-display text-[64px] font-extrabold leading-[0.8] tracking-tighter text-sunset-400">{s.year}</p>
          <p className="mt-2 font-serif text-lg italic leading-tight">{s.ownerName}&apos;s year in journeys</p>
          <div className="mt-auto grid grid-cols-2 gap-x-2 gap-y-2.5">
            {stats.map(([v, l]) => (
              <div key={l}>
                <p className="font-display text-[26px] font-extrabold leading-none">{v}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-cream-200/70">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-full bg-cream-100 px-2.5 py-1 text-center text-[10px] font-extrabold text-navy-900">{s.personality.title}</p>
        </div>
        <div className="-my-2 -mr-3">
          <IndiaMapSvg width={180} height={330} theme="night" visitedStates={s.states} points={statsToPoints(s)} markerSize={0.9} padding={4} className="h-full w-full" />
        </div>
      </div>
    </Canvas>
  );
}

/* C ─ Travel map poster */
export function MapPoster({ s }: { s: StoryData }) {
  const india = s.cities.filter((c) => c.country === "India");
  return (
    <Canvas w={400} h={560} className="bg-[#0a0f24] text-cream-100">
      <div className="absolute inset-3 rounded-[18px] border border-cream-100/15" />
      <div className="relative z-10 flex h-full flex-col px-8 pb-7 pt-8">
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-sunset-400">Travel Wrapped · {s.year}</p>
          <p className="mt-2 font-display text-[30px] font-extrabold leading-none">{s.ownerName}&apos;s India</p>
          <p className="mt-1 font-serif text-base italic text-cream-200/80">{s.personality.title}</p>
        </div>
        <div className="relative -mx-3 mt-1 flex-1">
          <IndiaMapSvg width={360} height={360} theme="night" visitedStates={s.states} points={statsToPoints(s)} labels={10} routes className="h-full w-full" />
        </div>
        <div className="grid grid-cols-4 border-y border-cream-100/15 py-3 text-center">
          {[
            [s.states.length, "states"],
            [india.length, "places"],
            [s.totalTrips, "trips"],
            s.totalKm != null ? [fmtNumber(s.totalKm), "km"] : [s.totalDays, "days"],
          ].map(([v, l]) => (
            <div key={String(l)}>
              <p className="font-display text-xl font-extrabold">{v}</p>
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-cream-200/60">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 line-clamp-2 text-center text-[9px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-cream-200/70">
          {s.cities.map((c) => c.city).join(" · ")}
        </p>
        <p className="mt-2 text-center text-[8px] font-bold uppercase tracking-[0.3em] text-cream-200/40">{brandHost()}</p>
      </div>
    </Canvas>
  );
}

/* D ─ Travel timeline poster */
export function TimelinePoster({ s }: { s: StoryData }) {
  const items = s.timeline.slice(0, 9);
  const dense = items.length > 6;
  const hl = new Map(s.highlights.map((h) => [h.tripName, h]));
  return (
    <Canvas className="bg-cream-50 text-ink">
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-sunset-500 via-electric-500 to-jungle-500" />
      <div className="relative z-10 flex h-full flex-col px-6 pb-6 pt-8">
        <div className="flex items-end justify-between border-b-2 border-ink pb-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted">Travel Wrapped</p>
            <p className="font-display text-[30px] font-extrabold leading-none">A year of journeys</p>
          </div>
          <p className="font-display text-3xl font-extrabold text-sunset-500">{s.year}</p>
        </div>
        <div className="mt-3 flex flex-1 flex-col gap-2 overflow-hidden">
          {items.map((t, i) => {
            const h = hl.get(t.name);
            const d = parseDate(t.start);
            return (
              <div key={t.id} className="flex gap-3">
                <div className="w-10 shrink-0 text-center">
                  <p className="font-display text-xl font-extrabold leading-none">{d.getDate()}</p>
                  <p className="text-[9px] font-bold uppercase text-sunset-600">{MONTH_NAMES[d.getMonth()]}</p>
                </div>
                <div className="relative flex min-w-0 flex-1 gap-2 border-l-2 pl-3" style={{ borderColor: ["#ff6a3d", "#7b4dff", "#17b890"][i % 3] }}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold leading-tight">{t.name}</p>
                    <p className="truncate text-[10px] font-medium text-muted">
                      {t.cities.join(" → ")} · {plural(t.days, "day")}
                    </p>
                    {h?.text && !dense && <p className="mt-0.5 line-clamp-2 font-serif text-[13px] italic leading-snug">“{h.text}”</p>}
                  </div>
                  {h?.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.photoUrl} alt="" crossOrigin="anonymous" className={dense ? "size-9 rounded-md object-cover" : "size-12 rounded-lg object-cover"} />
                  )}
                </div>
              </div>
            );
          })}
          {s.timeline.length > items.length && <p className="text-center text-xs font-bold text-electric-600">+ {plural(s.timeline.length - items.length, "more trip")}</p>}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-ink/15 pt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          <span>{s.ownerName} · {fmtRange(s.timeline[0]?.start ?? `${s.year}-01-01`, s.timeline[s.timeline.length - 1]?.end ?? `${s.year}-12-31`)}</span>
          <span>{brandHost()}</span>
        </div>
      </div>
    </Canvas>
  );
}

export const FORMATS = [
  { key: "story", title: "Instagram Story", ratio: "9:16", size: "1080 × 1920", w: 360, h: 640, scale: 3 },
  { key: "post", title: "Instagram Post", ratio: "1:1", size: "1080 × 1080", w: 360, h: 360, scale: 3, C: PostCard },
  { key: "poster", title: "Travel Map Poster", ratio: "5:7", size: "1200 × 1680", w: 400, h: 560, scale: 3, C: MapPoster },
  { key: "timeline", title: "Travel Timeline", ratio: "9:16", size: "1080 × 1920", w: 360, h: 640, scale: 3, C: TimelinePoster },
] as const;

/** Scales a fixed-size canvas to fit its container width. */
export function ScaledFrame({ w, h, children, className, maxHeight }: { w: number; h: number; children: React.ReactNode; className?: string; maxHeight?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const byW = el.clientWidth / w;
      const byH = maxHeight ? maxHeight / h : Infinity;
      setScale(Math.min(byW, byH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h, maxHeight]);
  return (
    <div ref={ref} className={className}>
      <div style={{ width: w * scale, height: h * scale, margin: "0 auto", overflow: "hidden" }}>
        <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left", visibility: scale ? "visible" : "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
