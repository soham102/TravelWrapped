"use client";

import { encodeCanvasVideo, type VideoResult } from "@/lib/video/encode";
import { renderTrack, type TrackKey } from "@/lib/video/music";
import { getFonts, loadImage } from "@/lib/video/photo-scenes";
import type { Journey } from "./build";
import { createJourneyRenderer } from "./render";
import { buildSchedule, type Schedule } from "./schedule";

/** Longest video we make; longer journeys are played back proportionally faster to fit. */
const MAX_VIDEO_SECONDS = 90;
const MAX_GIF_SECONDS = 24;

/** A schedule whose times are scaled by 1/factor (factor > 1 = faster). */
function compress(s: Schedule, factor: number): Schedule {
  if (factor <= 1) return s;
  const k = 1 / factor;
  return {
    duration: s.duration * k,
    revealAt: s.revealAt.map((t) => t * k),
    departAt: s.departAt.map((t) => t * k),
    segments: s.segments.map((g) => ({ ...g, start: g.start * k, end: g.end * k })),
  };
}

async function loadPhotos(j: Journey, signal?: AbortSignal) {
  const photos = new Map<string, HTMLImageElement>();
  for (const s of j.stops) {
    if (signal?.aborted) break;
    if (!s.photo) continue;
    const img = await loadImage(s.photo.url); // crossOrigin=anonymous; a photo that can't load is skipped
    if (img) photos.set(s.id, img);
  }
  return photos;
}

export async function renderJourneyVideo(opts: {
  journey: Journey;
  music: TrackKey | null;
  onProgress?: (label: string, fraction: number) => void;
  signal?: AbortSignal;
}): Promise<VideoResult> {
  const { journey } = opts;
  const base = buildSchedule(journey);
  const schedule = compress(base, base.duration / MAX_VIDEO_SECONDS);
  opts.onProgress?.("Loading fonts & photos…", 0.02);
  const [fonts, photos] = await Promise.all([getFonts(), loadPhotos(journey, opts.signal)]);
  const W = 1080;
  const H = 1920;
  const draw = createJourneyRenderer({ journey, schedule, width: W, height: H, fonts, photos });
  opts.onProgress?.("Mixing the soundtrack…", 0.06);
  const audio = opts.music ? await renderTrack(opts.music, schedule.duration) : null;
  return encodeCanvasVideo({
    width: W,
    height: H,
    duration: schedule.duration,
    draw,
    audio,
    signal: opts.signal,
    onProgress: (f) => opts.onProgress?.("Rendering your journey…", 0.1 + f * 0.9),
  });
}

export async function renderJourneyGif(opts: {
  journey: Journey;
  onProgress?: (label: string, fraction: number) => void;
  signal?: AbortSignal;
}): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const { journey } = opts;
  const base = buildSchedule(journey);
  const schedule = compress(base, Math.max(1.5, base.duration / MAX_GIF_SECONDS));
  opts.onProgress?.("Loading fonts & photos…", 0.02);
  const [fonts, photos] = await Promise.all([getFonts(), loadPhotos(journey, opts.signal)]);

  const W = 360;
  const H = 640;
  const FPS = 8;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Couldn't start the GIF renderer in this browser.");
  const draw = createJourneyRenderer({ journey, schedule, width: W, height: H, fonts, photos });

  // One palette for the whole GIF (no colour flicker between frames), learnt from key moments.
  const keyTimes = [schedule.duration * 0.1, ...schedule.revealAt.slice(0, 6).map((t) => t + 1), schedule.duration - 1.5];
  const samples = keyTimes.map((t) => {
    draw(ctx, Math.min(schedule.duration, Math.max(0, t)));
    return ctx.getImageData(0, 0, W, H).data;
  });
  const merged = new Uint8ClampedArray(samples.reduce((n, s) => n + s.length, 0));
  let off = 0;
  for (const s of samples) {
    merged.set(s, off);
    off += s.length;
  }
  const palette = quantize(merged, 256);

  const gif = GIFEncoder();
  const frames = Math.round(schedule.duration * FPS);
  for (let f = 0; f < frames; f++) {
    if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    draw(ctx, f / FPS);
    const { data } = ctx.getImageData(0, 0, W, H);
    gif.writeFrame(applyPalette(data, palette), W, H, { palette: f === 0 ? palette : undefined, delay: 1000 / FPS, repeat: 0 });
    if (f % 4 === 0) {
      opts.onProgress?.("Drawing GIF frames…", 0.08 + (f / frames) * 0.9);
      await new Promise((r) => setTimeout(r, 0)); // keep the page responsive
    }
  }
  gif.finish();
  opts.onProgress?.("Done", 1);
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}
