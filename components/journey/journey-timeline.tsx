"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import * as React from "react";
import type { Journey } from "@/lib/journey/build";
import { shortMonth } from "@/lib/journey/build";
import { type JourneyClock, type Speed, useClockState } from "@/lib/journey/clock";
import { cn } from "@/lib/utils";

const SPEEDS: Speed[] = [0.5, 1, 2];

/** Playback controls + a scrubbable timeline with one tick per destination. */
export function JourneyTimeline({ journey, clock }: { journey: Journey; clock: JourneyClock }) {
  const st = useClockState(clock);
  const fill = React.useRef<HTMLDivElement>(null);
  const track = React.useRef<HTMLDivElement>(null);
  const { revealAt } = clock.schedule;
  const dur = clock.duration;
  const stops = journey.stops;
  const current = st.stop >= 0 ? stops[st.stop] : null;

  // Progress bar is updated straight from the animation clock (no React re-render per frame).
  React.useEffect(
    () =>
      clock.onTick((t) => {
        if (fill.current) fill.current.style.transform = `scaleX(${dur ? t / dur : 0})`;
        track.current?.setAttribute("aria-valuenow", String(Math.round((t / dur) * 100)));
      }),
    [clock, dur],
  );

  const seekFromPointer = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    clock.seek(((clientX - box.left) / box.width) * dur);
  };

  const dragging = React.useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-stop]")) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => dragging.current && seekFromPointer(e.clientX);
  const onPointerUp = () => (dragging.current = false);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") clock.seek(clock.time + 2);
    else if (e.key === "ArrowLeft") clock.seek(clock.time - 2);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const btn = "grid size-10 shrink-0 place-items-center rounded-full text-cream-100 transition hover:bg-white/10 disabled:opacity-30 sm:size-11";
  const atEnd = st.ended;

  return (
    <div className="pointer-events-auto rounded-[26px] border border-white/10 bg-navy-900/80 px-3 pb-3 pt-2.5 text-cream-100 shadow-2xl backdrop-blur-xl sm:px-4">
      {/* Current destination */}
      <div className="flex items-center justify-between gap-3 px-1 pb-2 text-xs">
        <p className="min-w-0 truncate font-semibold">
          {current ? (
            <>
              <span className="text-sunset-400">{st.stop + 1}/{stops.length}</span> · {current.city}
              <span className="text-cream-200/50"> · {shortMonth(current.date)}</span>
            </>
          ) : (
            <span className="text-cream-200/60">{stops.length} destinations · {journey.year}</span>
          )}
        </p>
        <div className="flex shrink-0 rounded-full bg-white/8 p-0.5" role="radiogroup" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={st.speed === s}
              onClick={() => clock.setSpeed(s)}
              className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold transition", st.speed === s ? "bg-cream-100 text-navy-900" : "text-cream-200/70 hover:text-cream-50")}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label="Journey timeline"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mx-1 h-7 cursor-pointer touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-electric-400/60 rounded-full"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/12">
          <div ref={fill} className="h-full w-full origin-left rounded-full bg-gradient-to-r from-sunset-500 via-sun-400 to-electric-400" style={{ transform: "scaleX(0)" }} />
        </div>
        {revealAt.map((t, i) => {
          const done = i < st.revealed;
          const active = i === st.stop;
          return (
            <button
              key={stops[i].id}
              data-stop
              onClick={() => clock.goToStop(i)}
              title={`${i + 1}. ${stops[i].city} · ${shortMonth(stops[i].date)}`}
              aria-label={`Go to stop ${i + 1}: ${stops[i].city}`}
              className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5"
              style={{ left: `${(t / dur) * 100}%` }}
            >
              <span
                className={cn(
                  "block rounded-full border-2 transition-all",
                  active ? "size-3.5 border-cream-50 bg-sunset-500 shadow-[0_0_12px_rgba(255,51,102,0.9)]" : done ? "size-2.5 border-navy-900 bg-sun-400" : "size-2.5 border-white/40 bg-navy-800",
                  "group-hover:scale-125",
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Buttons */}
      <div className="mt-1 flex items-center justify-center gap-1 sm:gap-2">
        <button onClick={() => clock.replay()} className={btn} aria-label="Replay from the start">
          <RotateCcw className="size-4" />
        </button>
        <button onClick={() => clock.prev()} className={btn} aria-label="Previous destination">
          <SkipBack className="size-5" />
        </button>
        <button
          onClick={() => (atEnd ? clock.replay() : clock.toggle())}
          className="grid size-14 place-items-center rounded-full bg-sunset-500 text-white shadow-[0_8px_30px_-6px_rgba(255,51,102,0.9)] transition hover:bg-sunset-600 active:scale-95"
          aria-label={st.playing ? "Pause" : atEnd ? "Replay" : "Play"}
        >
          {st.playing ? <Pause className="size-6" fill="currentColor" /> : atEnd ? <RotateCcw className="size-6" /> : <Play className="ml-0.5 size-6" fill="currentColor" />}
        </button>
        <button onClick={() => clock.next()} className={btn} aria-label="Next destination" disabled={atEnd}>
          <SkipForward className="size-5" />
        </button>
        <span className="w-10 sm:w-11" aria-hidden />
      </div>
    </div>
  );
}
