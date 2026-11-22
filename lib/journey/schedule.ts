import type { Journey } from "./build";

/**
 * The journey as a timeline of segments (seconds at 1× speed). Both the live player and the
 * video/GIF renderer read from the same schedule, so exports match what users watched.
 */

export type Segment =
  | { kind: "intro"; start: number; end: number }
  | { kind: "travel"; stop: number; start: number; end: number }
  | { kind: "reveal"; stop: number; start: number; end: number }
  | { kind: "finale"; start: number; end: number }
  | { kind: "outro"; start: number; end: number };

export interface Schedule {
  segments: Segment[];
  duration: number;
  /** Time at which each stop is revealed (marker lands, card opens). */
  revealAt: number[];
  /** Time at which the route towards each stop starts (= revealAt for the first stop). */
  departAt: number[];
}

export interface Frame {
  segIndex: number;
  seg: Segment;
  /** 0‥1 progress through the current segment. */
  p: number;
  /** Index of the stop that is current (being travelled to or revealed). -1 during the intro. */
  stop: number;
  /** Number of stops whose marker is on the map. */
  revealed: number;
}

export function buildSchedule(j: Pick<Journey, "stops">): Schedule {
  const n = j.stops.length;
  const dense = n > 12;
  const REVEAL = dense ? 2.4 : 3.2;
  const segments: Segment[] = [];
  const revealAt: number[] = [];
  const departAt: number[] = [];
  let t = 0;
  const push = (s: Segment) => {
    segments.push(s);
    t = s.end;
  };

  push({ kind: "intro", start: 0, end: 3 });
  j.stops.forEach((s, i) => {
    if (i > 0) {
      const km = s.legKm ?? 0;
      // Longer hops take a little longer to fly; tiny hops (same town, revisits) are quick.
      const base = km < 15 ? 1 : Math.min(3.2, 1.6 + km / 1400);
      const dur = dense ? base * 0.75 : base;
      departAt.push(t);
      push({ kind: "travel", stop: i, start: t, end: t + dur });
    } else departAt.push(t);
    revealAt.push(t);
    push({ kind: "reveal", stop: i, start: t, end: t + REVEAL });
  });
  push({ kind: "finale", start: t, end: t + (n ? 5 : 3) });
  push({ kind: "outro", start: t, end: t + 4.5 });

  return { segments, duration: t, revealAt, departAt };
}

export function frameAt(s: Schedule, time: number): Frame {
  const t = Math.min(Math.max(0, time), s.duration);
  // Binary search for the segment containing t.
  let lo = 0;
  let hi = s.segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s.segments[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  const seg = s.segments[lo];
  const p = seg.end > seg.start ? Math.min(1, (t - seg.start) / (seg.end - seg.start)) : 1;
  const nStops = s.revealAt.length;
  let stop = -1;
  let revealed = 0;
  if (seg.kind === "travel") {
    stop = seg.stop;
    revealed = seg.stop;
  } else if (seg.kind === "reveal") {
    stop = seg.stop;
    revealed = seg.stop + 1;
  } else if (seg.kind === "finale" || seg.kind === "outro") {
    stop = nStops - 1;
    revealed = nStops;
  }
  return { segIndex: lo, seg, p, stop, revealed };
}

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
