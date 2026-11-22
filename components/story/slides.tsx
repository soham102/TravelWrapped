"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import * as React from "react";
import { LogoMark } from "@/components/brand";
import { IndiaMapSvg } from "@/components/map/india-map-svg";
import { statsToPoints } from "@/lib/hooks";
import type { WrappedStats, WrappedSnapshot } from "@/lib/types";
import { MONTH_NAMES, brandHost, fmtNumber, fmtRange, parseDate, plural } from "@/lib/utils";
import { shareLine } from "@/lib/wrapped/compute";
import {
  ACHIEVEMENT_ICONS,
  Canvas,
  CountUp,
  PERSONALITY_ICONS,
  R,
  SlideBrand,
  SlideFooter,
  fitSize,
} from "./primitives";
import { Scene, sceneFor } from "./scenes";

export type StoryData = WrappedStats | WrappedSnapshot;
export interface SlideProps {
  s: StoryData;
  interactive?: boolean;
}

/* 1 ─ Intro */
export function IntroSlide({ s }: SlideProps) {
  const photos = s.highlights.map((h) => h.photoUrl).filter(Boolean).slice(0, 3) as string[];
  const scene = sceneFor(s.mostExplored?.tags);
  return (
    <Canvas className="grain bg-navy-900 text-cream-100">
      <div className="absolute -left-24 -top-24 size-80 rounded-full bg-electric-500/60 blur-3xl" />
      <div className="absolute -right-24 top-60 size-72 rounded-full bg-sunset-500/50 blur-3xl" />
      <SlideBrand year={s.year} />
      <div className="relative z-10 flex h-full flex-col px-6 pb-14 pt-20">
        <R delay={0.1}>
          <p className="font-serif text-2xl italic text-cream-200">Hey {s.ownerName},</p>
        </R>
        <R delay={0.25} y={30}>
          <p
            className="font-display text-[132px] font-extrabold leading-[0.85] tracking-tighter"
            style={{ backgroundImage: "linear-gradient(120deg,#ffc93c,#ff6a3d 45%,#b9a3ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
          >
            {s.year}
          </p>
        </R>
        <div className="relative mt-4 flex-1">
          {photos.length > 0 ? (
            photos.map((src, i) => (
              <R
                key={src}
                delay={0.5 + i * 0.15}
                scale={0.8}
                className="absolute"
                style={{ width: 150, left: [24, 150, 80][i], top: [10, 40, 120][i] }}
              >
                <div className="rounded-md bg-cream-50 p-1.5 pb-6 shadow-2xl" style={{ transform: `rotate(${[-8, 7, -2][i]}deg)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" crossOrigin="anonymous" className="aspect-square w-full rounded-sm object-cover" />
                </div>
              </R>
            ))
          ) : (
            <R delay={0.5} className="absolute inset-x-[-24px] bottom-0">
              <Scene kind={scene} tone="light" className="h-56 w-full" />
            </R>
          )}
        </div>
        <R delay={0.7}>
          <p className="font-display text-[34px] font-extrabold leading-[1.02]">
            Your Travel Wrapped is here!
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-cream-200/80">
            {plural(s.totalTrips, "trip")} · {plural(s.cities.length, "place")} · one unforgettable year <ArrowRight className="size-4" />
          </p>
        </R>
      </div>
    </Canvas>
  );
}

/* 2 ─ Year in numbers */
export function NumbersSlide({ s }: SlideProps) {
  const rows: { value: number; label: string; fmt?: (n: number) => string }[] = [
    { value: s.totalTrips, label: s.totalTrips === 1 ? "trip taken" : "trips taken" },
    { value: s.cities.length, label: s.cities.length === 1 ? "place explored" : "places explored" },
    { value: s.states.length, label: s.states.length === 1 ? "state / UT" : "states & UTs" },
  ];
  if (s.totalKm != null) rows.push({ value: s.totalKm, label: "km logged", fmt: fmtNumber });
  else rows.push({ value: s.totalDays, label: s.totalDays === 1 ? "day on the road" : "days on the road" });
  return (
    <Canvas className="grain bg-sunset-500 text-cream-50">
      <svg className="absolute inset-0" viewBox="0 0 360 640" aria-hidden>
        <path d="M-20 560 C 80 470, 40 330, 180 300 S 330 140, 390 60" stroke="#fff5e6" strokeOpacity="0.35" strokeWidth="2.5" strokeDasharray="6 8" fill="none" />
      </svg>
      <SlideBrand year={s.year} />
      <div className="relative z-10 flex h-full flex-col px-6 pb-12 pt-20">
        <R delay={0.05}>
          <p className="font-serif text-3xl italic">Your {s.year},</p>
          <p className="font-display text-4xl font-extrabold leading-none">by the numbers</p>
        </R>
        <div className="mt-8 flex flex-1 flex-col justify-center gap-5">
          {rows.map((r, i) => (
            <R key={r.label} delay={0.25 + i * 0.18} x={-30} y={0} className="flex items-baseline gap-4 border-b border-cream-50/25 pb-4">
              <span className="min-w-[2ch] font-display text-[76px] font-extrabold leading-[0.85] tabular-nums text-navy-900">
                <CountUp value={r.value} delay={0.3 + i * 0.18} format={r.fmt} />
              </span>
              <span className="text-lg font-bold leading-tight">{r.label}</span>
            </R>
          ))}
        </div>
        {s.totalKm != null && s.kmTripsCount < s.totalTrips && (
          <p className="text-[11px] font-medium text-cream-50/80">Km from the {plural(s.kmTripsCount, "trip")} where you logged distance.</p>
        )}
      </div>
    </Canvas>
  );
}

/* 3 ─ India map */
export function MapSlide({ s, interactive }: SlideProps) {
  const points = statsToPoints(s);
  return (
    <Canvas className="bg-navy-950 text-cream-100">
      <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric-500/20 blur-3xl" />
      <SlideBrand year={s.year} />
      <div className="relative z-10 flex h-full flex-col px-5 pb-12 pt-20">
        <R delay={0.05}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sunset-400">Your India map</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-none">
            {s.states.length > 0 ? `${plural(s.states.length, "state")} lit up` : "Your map awaits"}
          </p>
        </R>
        <div className="relative -mx-2 mt-2 flex-1">
          <IndiaMapSvg
            width={340}
            height={420}
            theme="night"
            visitedStates={s.states}
            points={points}
            labels={interactive ? 0 : 7}
            routes
            interactive={interactive}
            animate={!!interactive}
            className="h-full w-full"
          />
        </div>
        <R delay={0.4} className="grid grid-cols-3 gap-2 text-center">
          {[
            [s.states.length, "states"],
            [s.cities.filter((c) => c.country === "India").length, "places in India"],
            [s.totalTrips, "trips"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-white/8 px-2 py-2.5">
              <p className="font-display text-2xl font-extrabold">{v}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cream-200/70">{l}</p>
            </div>
          ))}
        </R>
      </div>
    </Canvas>
  );
}

/* 4 ─ Most explored destination */
export function MostExploredSlide({ s }: SlideProps) {
  const m = s.mostExplored;
  const name = m?.city ?? "—";
  return (
    <Canvas className="grain bg-electric-500 text-cream-50">
      <div className="absolute -right-28 -top-20 size-80 rounded-full bg-sunset-400/50 blur-3xl" />
      <SlideBrand year={s.year} />
      <div className="relative z-10 flex h-full flex-col px-6 pt-20">
        <R delay={0.05}>
          <p className="font-serif text-[28px] italic leading-tight">
            {s.mostExploredBasis === "visits" ? "The place you kept coming back to" : "Where you spent the most time"}
          </p>
        </R>
        <R delay={0.25} y={40}>
          <p className="mt-6 font-display font-extrabold uppercase leading-[0.85] tracking-tight" style={{ fontSize: fitSize(name, [[5, 92], [7, 76], [9, 62], [12, 50], [16, 40]], 32) }}>
            {name}
          </p>
          {m && <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-cream-50/80">{[m.state, m.country !== "India" ? m.country : null].filter(Boolean).join(" · ")}</p>}
        </R>
        {m && (
          <R delay={0.45} className="mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-navy-900 px-5 py-3">
            <span className="font-display text-3xl font-extrabold text-sun-400">
              {s.mostExploredBasis === "visits" ? m.visits : Math.round(m.days)}
            </span>
            <span className="text-sm font-semibold leading-tight">
              {s.mostExploredBasis === "visits" ? "separate trips here" : Math.round(m.days) === 1 ? "day spent here" : "days spent here"}
            </span>
          </R>
        )}
        <R delay={0.55} className="absolute inset-x-0 bottom-0">
          <Scene kind={sceneFor(m?.tags)} className="h-60 w-full" />
        </R>
      </div>
    </Canvas>
  );
}

/* 5 ─ Timeline */
export function TimelineSlide({ s }: SlideProps) {
  const max = 7;
  const items = s.timeline.slice(0, max);
  const more = s.timeline.length - items.length;
  return (
    <Canvas className="bg-cream-100 text-ink">
      <SlideBrand year={s.year} light={false} />
      <div className="relative z-10 flex h-full flex-col px-6 pb-10 pt-20">
        <R delay={0.05}>
          <p className="font-display text-[34px] font-extrabold leading-none">Your year,</p>
          <p className="font-serif text-3xl italic text-sunset-600">trip by trip</p>
        </R>
        <div className="relative mt-6 flex-1">
          <div className="absolute bottom-2 left-[42px] top-2 w-[2px] bg-gradient-to-b from-sunset-500 via-electric-500 to-jungle-500" />
          <div className="flex h-full flex-col justify-between">
            {items.map((t, i) => (
              <R key={t.id} delay={0.15 + i * 0.1} x={-20} y={0} className="flex items-center gap-3">
                <span className="w-[30px] text-right text-[11px] font-extrabold uppercase text-muted">{MONTH_NAMES[parseDate(t.start).getMonth()]}</span>
                <span className="relative z-10 size-[14px] shrink-0 rounded-full border-[3px] border-cream-100" style={{ background: ["#ff6a3d", "#7b4dff", "#17b890", "#ffc93c", "#0b1026"][i % 5] }} />
                <div className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2 shadow-[0_1px_0_rgba(11,16,38,0.06)]">
                  <p className="truncate text-[13px] font-bold leading-tight">{t.name}</p>
                  <p className="truncate text-[11px] text-muted">
                    {fmtRange(t.start, t.end)} · {t.cities.slice(0, 3).join(" → ")}
                  </p>
                </div>
              </R>
            ))}
            {items.length === 0 && <p className="text-muted">No trips this year yet.</p>}
          </div>
        </div>
        {more > 0 && <p className="mt-3 text-center text-sm font-bold text-electric-600">+ {plural(more, "more trip")}</p>}
        <div className="mt-4 flex h-10 items-end gap-1" aria-label="Trips per month">
          {s.monthCounts.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="w-full rounded-t-sm bg-sunset-500" style={{ height: n ? 6 + n * 8 : 2, opacity: n ? 1 : 0.2 }} />
              <span className="text-[7px] font-bold text-muted">{MONTH_NAMES[i][0]}</span>
            </div>
          ))}
        </div>
      </div>
    </Canvas>
  );
}

/* 6 ─ Longest adventure */
export function LongestSlide({ s }: SlideProps) {
  const t = s.longestTrip;
  return (
    <Canvas className="grain bg-jungle-600 text-cream-50">
      <div className="absolute -bottom-24 -left-16 size-80 rounded-full bg-sun-400/40 blur-3xl" />
      <SlideBrand year={s.year} />
      <div className="relative z-10 flex h-full flex-col px-6 pb-12 pt-20">
        <R delay={0.05}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sun-400">Your longest adventure</p>
        </R>
        <R delay={0.2} y={40} className="mt-4 flex items-end gap-3">
          <span className="font-display text-[170px] font-extrabold leading-[0.78] tracking-tighter">
            <CountUp value={t?.days ?? 0} delay={0.3} />
          </span>
          <span className="pb-3 font-display text-3xl font-extrabold leading-none">{t?.days === 1 ? "day" : "days"}</span>
        </R>
        <R delay={0.4} className="mt-6">
          <p className="font-display text-3xl font-extrabold leading-tight">{t?.name ?? "—"}</p>
          {t && <p className="mt-1 text-sm font-semibold text-cream-50/80">{fmtRange(t.start, t.end)}</p>}
        </R>
        {t && (
          <R delay={0.55} className="mt-auto">
            <div className="rounded-3xl bg-navy-900/35 p-5 backdrop-blur-sm">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-cream-50/70">The route</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                {t.cities.map((c, i) => (
                  <React.Fragment key={c + i}>
                    {i > 0 && <span className="h-[2px] w-4 bg-sun-400" />}
                    <span className="rounded-full bg-cream-50 px-3 py-1 text-sm font-bold text-jungle-600">{c}</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-4 flex gap-2 text-xs font-bold">
                <span className="rounded-full border border-cream-50/40 px-3 py-1">{t.type}</span>
                <span className="rounded-full border border-cream-50/40 px-3 py-1">{t.category}</span>
              </div>
            </div>
          </R>
        )}
      </div>
    </Canvas>
  );
}

/* 7 ─ Personality */
export function PersonalitySlide({ s }: SlideProps) {
  const p = s.personality;
  const Icon = PERSONALITY_ICONS[p.key] ?? Sparkles;
  return (
    <Canvas className="grain text-cream-50" style={{ background: "linear-gradient(160deg,#6232f0 0%,#7b4dff 35%,#ff6a3d 100%)" }}>
      <SlideBrand year={s.year} />
      <div className="relative z-10 flex h-full flex-col items-center px-6 pb-12 pt-20 text-center">
        <R delay={0.05}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cream-50/80">Your travel personality</p>
        </R>
        <R delay={0.2} scale={0.6} className="relative mt-8">
          <div className="absolute inset-0 scale-150 rounded-full bg-sun-400/30 blur-2xl" />
          <div className="relative grid size-36 place-items-center rounded-full border-4 border-cream-50/80 bg-navy-900">
            <Icon className="size-16 text-sun-400" strokeWidth={1.6} />
          </div>
        </R>
        <R delay={0.4} className="mt-8">
          <p className="font-display text-[42px] font-extrabold leading-[0.95]">{p.title}</p>
          <p className="mt-3 font-serif text-2xl italic text-cream-50/90">{p.tagline}</p>
        </R>
        <R delay={0.6} className="mt-auto w-full rounded-3xl bg-navy-900/40 p-5 text-left backdrop-blur-sm">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cream-50/70">Why you got this</p>
          <ul className="space-y-1.5">
            {p.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm font-semibold leading-snug">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sun-400" />
                {r}
              </li>
            ))}
          </ul>
        </R>
      </div>
    </Canvas>
  );
}

/* 8 ─ Highlights */
export function HighlightsSlide({ s }: SlideProps) {
  const withPhotos = s.highlights.filter((h) => h.photoUrl).slice(0, 4);
  const quotes = s.highlights.filter((h) => h.text).slice(0, withPhotos.length ? 2 : 3);
  const postcards = s.cities.slice(0, 4);
  return (
    <Canvas className="bg-navy-900 text-cream-100">
      <SlideBrand year={s.year} />
      <div className="relative z-10 flex h-full flex-col px-6 pb-10 pt-20">
        <R delay={0.05}>
          <p className="font-serif text-3xl italic text-sunset-300">Moments that</p>
          <p className="font-display text-[34px] font-extrabold leading-none">made your year</p>
        </R>
        {withPhotos.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {withPhotos.map((h, i) => (
              <R key={h.photoUrl} delay={0.2 + i * 0.12} scale={0.85}>
                <div className="rounded-md bg-cream-50 p-1.5 pb-1 shadow-xl" style={{ transform: `rotate(${[-3, 2.5, 2, -2.5][i]}deg)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.photoUrl!} alt="" crossOrigin="anonymous" className="aspect-[4/3] w-full rounded-sm object-cover" />
                  <p className="truncate px-1 py-1 text-[11px] font-bold text-ink">{h.city}</p>
                </div>
              </R>
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {postcards.map((c, i) => (
              <R key={c.city} delay={0.2 + i * 0.12} scale={0.85} className="overflow-hidden rounded-2xl" style={{ background: ["#ff6a3d", "#7b4dff", "#17b890", "#ffc93c"][i % 4] }}>
                <Scene kind={sceneFor(c.tags)} className="h-24 w-full" />
                <p className="px-3 pb-3 pt-1 font-display text-lg font-extrabold leading-tight text-navy-900">{c.city}</p>
              </R>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex flex-1 flex-col justify-end gap-3">
          {quotes.map((h, i) => (
            <R key={h.text} delay={0.5 + i * 0.15} className="rounded-3xl bg-white/8 p-4">
              <p className="font-serif text-xl italic leading-snug">“{h.text}”</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.15em] text-sunset-300">
                {h.city} · {MONTH_NAMES[parseDate(h.date).getMonth()]}
              </p>
            </R>
          ))}
          {withPhotos.length === 0 && quotes.length === 0 && (
            <p className="text-center text-xs text-cream-200/60">Postcards from your year. Add photos & moments to your trips to fill this page.</p>
          )}
        </div>
      </div>
    </Canvas>
  );
}

/* 9 ─ Achievements */
export function AchievementsSlide({ s }: SlideProps) {
  const list = s.achievements.slice(0, 6);
  return (
    <Canvas className="bg-navy-950 text-cream-100">
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sun-400/25 to-transparent" />
      <SlideBrand year={s.year} />
      <div className="relative z-10 flex h-full flex-col px-6 pb-12 pt-20">
        <R delay={0.05}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sun-400">Achievements unlocked</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-none">
            {list.length} {list.length === 1 ? "badge" : "badges"} earned
          </p>
        </R>
        <div className="mt-6 grid flex-1 grid-cols-2 content-start gap-2.5">
          {list.map((a, i) => {
            const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Sparkles;
            const bg = ["#ff6a3d", "#7b4dff", "#17b890", "#ffc93c", "#ff8a5b", "#9877ff"][i % 6];
            return (
              <R key={a.key} delay={0.15 + i * 0.1} scale={0.7} className="flex flex-col rounded-3xl bg-white/[0.06] p-3.5">
                <span className="grid size-10 place-items-center rounded-2xl" style={{ background: bg }}>
                  <Icon className="size-5 text-navy-950" strokeWidth={2.4} />
                </span>
                <p className="mt-3 text-[15px] font-extrabold leading-tight">{a.title}</p>
                <p className="mt-1 text-[11px] leading-snug text-cream-200/70">{a.detail}</p>
              </R>
            );
          })}
        </div>
        {s.achievements.length > list.length && (
          <p className="text-center text-xs font-semibold text-cream-200/60">+ {s.achievements.length - list.length} more</p>
        )}
      </div>
    </Canvas>
  );
}

/* 10 ─ Share card */
export function ShareSlide({ s }: SlideProps) {
  return (
    <Canvas className="bg-cream-100 text-ink">
      <div className="absolute -right-20 -top-20 size-72 rounded-full bg-sunset-400/40 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-electric-400/30 blur-3xl" />
      <div className="relative z-10 flex h-full flex-col px-6 pb-8 pt-10">
        <div className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="font-display text-sm font-extrabold">Travel Wrapped {s.year}</span>
        </div>
        <R delay={0.1} className="mt-8">
          <p className="font-serif text-[34px] leading-[1.08]">{shareLine(s)}</p>
        </R>
        <R delay={0.3} className="relative -mx-2 mt-2 flex-1">
          <IndiaMapSvg width={340} height={300} theme="cream" visitedStates={s.states} points={statsToPoints(s)} className="h-full w-full" />
        </R>
        <R delay={0.45} className="flex items-end justify-between border-t-2 border-ink pt-4">
          <div>
            <p className="font-display text-2xl font-extrabold leading-none">{s.ownerName}</p>
            <p className="mt-1 text-sm font-semibold text-electric-600">{s.personality.title}</p>
          </div>
          <div className="text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            Make yours at
            <br />
            <span className="text-ink">{brandHost()}</span>
          </div>
        </R>
      </div>
    </Canvas>
  );
}

export const SLIDES = [
  { key: "intro", title: "Intro", C: IntroSlide },
  { key: "numbers", title: "Your travel year", C: NumbersSlide },
  { key: "map", title: "Your India map", C: MapSlide },
  { key: "most", title: "Most explored", C: MostExploredSlide },
  { key: "timeline", title: "Timeline", C: TimelineSlide },
  { key: "longest", title: "Longest adventure", C: LongestSlide },
  { key: "personality", title: "Personality", C: PersonalitySlide },
  { key: "highlights", title: "Highlights", C: HighlightsSlide },
  { key: "achievements", title: "Achievements", C: AchievementsSlide },
  { key: "share", title: "Share card", C: ShareSlide },
] as const;

export { SlideFooter };
