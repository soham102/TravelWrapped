"use client";

import { Camera } from "lucide-react";
import type * as React from "react";
import { LogoMark } from "@/components/brand";
import type { GalleryPhoto } from "@/lib/types";
import { brandHost, cn, plural } from "@/lib/utils";
import { Canvas } from "./primitives";
import type { StoryData } from "./slides";

export type CollageVariant = "story" | "post";

export const COLLAGE_FORMATS = [
  { key: "collage-story", variant: "story", title: "Photo Collage · Story", ratio: "9:16", size: "1080 × 1920", w: 360, h: 640 },
  { key: "collage-post", variant: "post", title: "Photo Collage · Post", ratio: "1:1", size: "1080 × 1080", w: 360, h: 360 },
] as const;

export const COLLAGE_STYLES = [
  { key: "mosaic", label: "Mosaic", emoji: "🧩", cap: { story: 12, post: 9 } },
  { key: "polaroid", label: "Polaroid wall", emoji: "📸", cap: { story: 9, post: 6 } },
  { key: "film", label: "Film strip", emoji: "🎞️", cap: { story: 12, post: 9 } },
  { key: "photobooth", label: "Photo booth", emoji: "🎭", cap: { story: 12, post: 9 } },
  { key: "scrapbook", label: "Scrapbook", emoji: "✂️", cap: { story: 8, post: 6 } },
  { key: "stamps", label: "Postage stamps", emoji: "💌", cap: { story: 9, post: 6 } },
  { key: "pop", label: "Pop art", emoji: "💥", cap: { story: 7, post: 5 } },
  { key: "magazine", label: "Magazine cover", emoji: "📰", cap: { story: 4, post: 3 } },
  { key: "stickers", label: "Sticker pack", emoji: "🦋", cap: { story: 8, post: 5 } },
  { key: "y2k", label: "Y2K chrome", emoji: "💿", cap: { story: 7, post: 5 } },
  { key: "receipt", label: "Trip receipt", emoji: "🧾", cap: { story: 6, post: 4 } },
  { key: "notes", label: "Notes app dump", emoji: "📝", cap: { story: 6, post: 3 } },
  { key: "desktop", label: "Retro desktop", emoji: "🖥️", cap: { story: 6, post: 4 } },
  { key: "dualcam", label: "Dual cam", emoji: "🤳", cap: { story: 4, post: 2 } },
] as const;

export type CollageStyle = (typeof COLLAGE_STYLES)[number]["key"];

export function collageCap(style: CollageStyle, variant: CollageVariant): number {
  return (COLLAGE_STYLES.find((c) => c.key === style) ?? COLLAGE_STYLES[0]).cap[variant];
}

/**
 * Mosaic templates on a 6-column grid: [colSpan, rowSpan] per tile, placed with `grid-auto-flow: dense`.
 * Each template fills its rows exactly, so there are never holes.
 */
const TEMPLATES: Record<number, { rows: number; tiles: [number, number][] }> = {
  1: { rows: 1, tiles: [[6, 1]] },
  2: { rows: 2, tiles: [[6, 1], [6, 1]] },
  3: { rows: 2, tiles: [[6, 1], [3, 1], [3, 1]] },
  4: { rows: 2, tiles: [[3, 1], [3, 1], [3, 1], [3, 1]] },
  5: { rows: 3, tiles: [[6, 1], [3, 1], [3, 1], [3, 1], [3, 1]] },
  6: { rows: 3, tiles: [[4, 2], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1]] },
  7: { rows: 4, tiles: [[4, 2], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [6, 1]] },
  8: { rows: 4, tiles: [[3, 2], [3, 1], [3, 1], [2, 1], [2, 1], [2, 1], [3, 1], [3, 1]] },
  9: { rows: 4, tiles: [[4, 2], ...Array.from({ length: 8 }, () => [2, 1] as [number, number])] },
  10: { rows: 5, tiles: [[4, 2], [2, 1], [2, 1], ...Array.from({ length: 6 }, () => [2, 1] as [number, number]), [6, 1]] },
  11: { rows: 5, tiles: [[4, 2], [2, 1], [2, 1], ...Array.from({ length: 6 }, () => [2, 1] as [number, number]), [3, 1], [3, 1]] },
  12: { rows: 5, tiles: [[4, 2], ...Array.from({ length: 11 }, () => [2, 1] as [number, number])] },
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks up to `cap` photos, round-robin across trips so every trip is represented.
 * seed 0 = chronological; any other seed shuffles the selection and arrangement.
 */
export function pickCollagePhotos(gallery: GalleryPhoto[], cap: number, seed = 0): GalleryPhoto[] {
  const rand = mulberry32(seed || 1);
  const byTrip = new Map<string, GalleryPhoto[]>();
  for (const p of gallery) byTrip.set(p.tripId, [...(byTrip.get(p.tripId) ?? []), p]);
  const groups = Array.from(byTrip.values()).map((g) => (seed ? shuffle(g, rand) : g));
  const out: GalleryPhoto[] = [];
  for (let round = 0; out.length < cap; round++) {
    let added = false;
    for (const g of seed ? shuffle(groups, rand) : groups) {
      if (g[round] && out.length < cap) {
        out.push(g[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  return seed ? shuffle(out, rand) : out.sort((a, b) => a.date.localeCompare(b.date));
}

export function galleryOf(s: StoryData): GalleryPhoto[] {
  return ("gallery" in s && Array.isArray(s.gallery) ? s.gallery : []) as GalleryPhoto[];
}

/* ───────────────────────── shared bits ───────────────────────── */

const INK = "#1a1530";

function Photo({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" crossOrigin="anonymous" className={cn("absolute inset-0 size-full object-cover", className)} style={style} />;
}

type Cell = { x: number; y: number; rot: number; cw: number; ch: number };

/** Lays `n` items on a loose grid inside W×H (last row centred), with seeded jitter + rotation. */
function scatter(n: number, W: number, H: number, cols: number, rand: () => number, rot: number, jitter: number): Cell[] {
  const rows = Math.ceil(n / cols);
  const cw = W / cols;
  const ch = H / rows;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const c = i % cols;
    return {
      x: ((cols - inRow) * cw) / 2 + c * cw + cw / 2 + (rand() - 0.5) * 2 * jitter,
      y: r * ch + ch / 2 + (rand() - 0.5) * 2 * jitter,
      rot: (rand() - 0.5) * 2 * rot,
      cw,
      ch,
    };
  });
}

const colsFor = (n: number, variant: CollageVariant) =>
  variant === "story" ? (n <= 2 ? 1 : n <= 6 ? 2 : 3) : n <= 1 ? 1 : n <= 4 ? 2 : 3;

function placed(c: Cell, w: number, h: number, extra?: React.CSSProperties): React.CSSProperties {
  return { position: "absolute", left: c.x - w / 2, top: c.y - h / 2, width: w, height: h, transform: `rotate(${c.rot}deg)`, ...extra };
}

function shortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`;
}

type StyleProps = { s: StoryData; photos: GalleryPhoto[]; variant: CollageVariant; rand: () => number; places: number };

function Footer({ s, photos, places, className, sub }: Omit<StyleProps, "variant" | "rand"> & { className?: string; sub?: string }) {
  return (
    <div className={cn("absolute inset-x-6 bottom-5 z-20 flex items-end justify-between", className)}>
      <div>
        <p className="font-display text-lg font-extrabold leading-none">{s.ownerName}</p>
        <p className={cn("mt-1 text-[10px] font-semibold opacity-70", sub)}>
          {plural(photos.length, "memory", "memories")} · {plural(places || s.cities.length, "place")} · {plural(s.totalTrips, "trip")}
        </p>
      </div>
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-50">{brandHost()}</p>
    </div>
  );
}

/* ───────────────────────── 1. Mosaic (classic) ───────────────────────── */

function Mosaic({ photos, gap, radius, captions }: { photos: GalleryPhoto[]; gap: number; radius: number; captions: boolean }) {
  const t = TEMPLATES[photos.length];
  return (
    <div
      className="grid h-full w-full"
      style={{ gridTemplateColumns: "repeat(6, 1fr)", gridTemplateRows: `repeat(${t.rows}, 1fr)`, gridAutoFlow: "row dense", gap }}
    >
      {photos.map((p, i) => {
        const [c, r] = t.tiles[i];
        return (
          <div key={p.url + i} className="relative min-h-0 overflow-hidden bg-navy-800" style={{ gridColumn: `span ${c}`, gridRow: `span ${r}`, borderRadius: radius }}>
            <Photo src={p.url} />
            {captions && (
              <span className="absolute bottom-1.5 left-1.5 max-w-[90%] truncate rounded-full bg-navy-950/70 px-2 py-0.5 text-[9px] font-bold text-cream-50">
                {p.city}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MosaicCollage({ s, photos, variant, places }: StyleProps) {
  if (variant === "post")
    return (
      <Canvas w={360} h={360} className="bg-cream-100 text-ink">
        <div className="flex h-full flex-col p-3">
          <div className="flex items-end justify-between px-1 pb-2">
            <div>
              <p className="font-display text-[22px] font-extrabold leading-none">
                {s.year} <span className="font-serif font-normal italic text-sunset-600">in pictures</span>
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted">
                {s.ownerName} · {plural(places || s.cities.length, "place")}
              </p>
            </div>
            <LogoMark className="size-6" />
          </div>
          <div className="min-h-0 flex-1">
            <Mosaic photos={photos} gap={3} radius={8} captions={false} />
          </div>
        </div>
      </Canvas>
    );

  return (
    <Canvas className="grain bg-navy-950 text-cream-100">
      <div className="absolute -left-20 -top-20 size-72 rounded-full bg-electric-500/40 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 size-72 rounded-full bg-sunset-500/35 blur-3xl" />
      <div className="relative z-10 flex h-full flex-col px-4 pb-5 pt-8">
        <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cream-100/70">
          <span>Travel Wrapped</span>
          <span>{s.year}</span>
        </div>
        <div className="mt-4 px-2">
          <p className="font-display text-[40px] font-extrabold leading-[0.9]">My {s.year}</p>
          <p className="font-serif text-[30px] italic leading-tight text-sunset-300">in pictures</p>
        </div>
        <div className="mt-4 min-h-0 flex-1">
          <Mosaic photos={photos} gap={4} radius={12} captions={photos.length <= 8} />
        </div>
        <div className="mt-3 flex items-end justify-between px-2">
          <div>
            <p className="font-display text-lg font-extrabold leading-none">{s.ownerName}</p>
            <p className="mt-1 text-[10px] font-semibold text-cream-200/70">
              {plural(photos.length, "memory", "memories")} · {plural(places || s.cities.length, "place")} · {plural(s.totalTrips, "trip")}
            </p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-cream-200/50">{brandHost()}</p>
        </div>
      </div>
    </Canvas>
  );
}

/* ───────────────────────── 2. Polaroid wall ───────────────────────── */

const CORK: React.CSSProperties = {
  backgroundColor: "#b98b5c",
  backgroundImage:
    "radial-gradient(rgba(70,40,15,.25) 1px, transparent 1.6px), radial-gradient(rgba(255,235,200,.18) 1px, transparent 1.6px)",
  backgroundSize: "7px 7px, 11px 11px",
  backgroundPosition: "0 0, 3px 5px",
};

const PIN_COLORS = ["#ff6a3d", "#7b4dff", "#17b890", "#ffc93c", "#e9502a"];

function PolaroidCollage({ s, photos, variant, rand, places }: StyleProps) {
  const story = variant === "story";
  const area = story ? { top: 132, w: 344, h: 452 } : { top: 56, w: 344, h: 296 };
  const cells = scatter(photos.length, area.w, area.h, colsFor(photos.length, variant), rand, 9, story ? 8 : 5);
  return (
    <Canvas w={360} h={story ? 640 : 360} className="text-cream-50" style={CORK}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(40,20,5,.45))]" />
      <div className={cn("relative z-10", story ? "px-6 pt-9" : "flex items-baseline justify-between px-4 pt-3")}>
        <p className={cn("font-display font-extrabold leading-[0.9] [text-shadow:0_2px_0_rgba(0,0,0,.25)]", story ? "text-[44px]" : "text-[26px]")}>
          {s.year} <span className="font-serif font-normal italic text-sun-400">on the wall</span>
        </p>
        {story ? (
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">pinned memories · {s.ownerName}</p>
        ) : (
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-80">{s.ownerName}</p>
        )}
      </div>
      <div className="absolute left-2" style={{ top: area.top, width: area.w, height: area.h }}>
        {photos.map((p, i) => {
          const c = cells[i];
          const w = Math.min(c.cw * 1.04, c.ch * 1.06 - 20, 215);
          return (
            <div key={p.url + i} style={placed(c, w, w + 18)} className="bg-[#fdfbf6] p-[6px] pb-[24px] shadow-[0_8px_18px_rgba(30,15,0,.45)]">
              <div className="relative size-full overflow-hidden bg-navy-800">
                <Photo src={p.url} style={{ filter: "saturate(1.1) contrast(1.05)" }} />
              </div>
              <p className="absolute inset-x-1 bottom-[4px] truncate text-center font-serif text-[13px] italic leading-none text-ink">{p.city}</p>
              <span
                className="absolute left-1/2 top-[-6px] size-3.5 -translate-x-1/2 rounded-full shadow-[0_2px_2px_rgba(0,0,0,.4)]"
                style={{ background: `radial-gradient(circle at 35% 35%, #fff8, ${PIN_COLORS[i % PIN_COLORS.length]} 45%)` }}
              />
            </div>
          );
        })}
      </div>
      {story && <Footer s={s} photos={photos} places={places} />}
    </Canvas>
  );
}

/* ───────────────────────── 3. Film strip ───────────────────────── */

const FILM = "#1a120b";
const LIGHTBOX = "#f6f2ea";

function Strip({ photos, dir, fw, fh, start, rot }: { photos: GalleryPhoto[]; dir: "v" | "h"; fw: number; fh: number; start: number; rot: number }) {
  const v = dir === "v";
  const holes = (pos: React.CSSProperties) => (
    <div
      className="absolute"
      style={{
        ...pos,
        backgroundImage: `repeating-linear-gradient(${v ? "to bottom" : "to right"}, transparent 0 4px, ${LIGHTBOX} 4px 10px, transparent 10px 14px)`,
        borderRadius: 1,
      }}
    />
  );
  return (
    <div
      className={cn("relative flex shadow-[0_10px_24px_rgba(0,0,0,.35)]", v ? "flex-col gap-2 px-[18px] py-3" : "flex-row gap-2 px-3 py-[18px]")}
      style={{ background: FILM, transform: `rotate(${rot}deg)` }}
    >
      {v ? (
        <>
          {holes({ left: 5, top: 0, bottom: 0, width: 7 })}
          {holes({ right: 5, top: 0, bottom: 0, width: 7 })}
        </>
      ) : (
        <>
          {holes({ top: 5, left: 0, right: 0, height: 7 })}
          {holes({ bottom: 5, left: 0, right: 0, height: 7 })}
        </>
      )}
      {photos.map((p, i) => (
        <div key={p.url + i} className="relative overflow-hidden rounded-[2px] bg-black" style={{ width: fw, height: fh }}>
          <Photo src={p.url} style={{ filter: "sepia(.18) saturate(1.15) contrast(1.08)" }} />
          <span className="absolute bottom-0.5 right-1 font-mono text-[7px] font-bold text-[#ffb13b]">▸{start + i}A</span>
        </div>
      ))}
    </div>
  );
}

function FilmCollage({ s, photos, variant, places }: StyleProps) {
  const story = variant === "story";
  const n = photos.length;
  let strips: React.ReactNode;
  if (story) {
    const k = n <= 3 ? 1 : 2;
    const per = Math.ceil(n / k);
    const fw = k === 1 ? 200 : 128;
    const fh = Math.min((444 - 24 - 8 * (per - 1)) / per, fw * 1.3);
    strips = (
      <div className="flex h-full items-center justify-center gap-5">
        {Array.from({ length: k }, (_, j) => (
          <Strip key={j} dir="v" photos={photos.slice(j * per, (j + 1) * per)} fw={fw} fh={fh} start={j * per + 1} rot={j % 2 ? 2.5 : -2.5} />
        ))}
      </div>
    );
  } else {
    const k = n <= 3 ? 1 : n <= 6 ? 2 : 3;
    const per = Math.ceil(n / k);
    const fw = Math.min((330 - 24 - 8 * (per - 1)) / per, 150);
    const fh = Math.min((280 - 10 * (k - 1)) / k - 36, fw * 0.75);
    strips = (
      <div className="flex h-full flex-col items-center justify-center gap-2.5">
        {Array.from({ length: k }, (_, j) => (
          <Strip key={j} dir="h" photos={photos.slice(j * per, (j + 1) * per)} fw={fw} fh={fh} start={j * per + 1} rot={j % 2 ? 1.2 : -1.2} />
        ))}
      </div>
    );
  }
  return (
    <Canvas w={360} h={story ? 640 : 360} className="text-ink" style={{ background: `radial-gradient(ellipse at 50% 45%, #ffffff, ${LIGHTBOX} 55%, #e4dccd)` }}>
      <div className={cn("relative z-10", story ? "px-6 pt-9" : "flex items-baseline justify-between px-4 pt-3")}>
        <p className={cn("font-display font-extrabold uppercase leading-[0.9] tracking-tight", story ? "text-[42px]" : "text-[24px]")}>
          Roll <span className="text-sunset-600">{s.year}</span>
        </p>
        <p className={cn("font-mono font-bold uppercase tracking-[0.2em] text-muted", story ? "mt-2 text-[10px]" : "text-[8px]")}>
          ISO 400 · {plural(n, "exposure")}
        </p>
      </div>
      <div className="absolute inset-x-0" style={story ? { top: 120, height: 456 } : { top: 46, height: 300 }}>
        {strips}
      </div>
      {story && <Footer s={s} photos={photos} places={places} />}
    </Canvas>
  );
}

/* ───────────────────────── 4. Photo booth ───────────────────────── */

const CURTAIN: React.CSSProperties = {
  backgroundColor: "#9b1128",
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 5px, rgba(255,255,255,.06) 5px 16px, rgba(0,0,0,.14) 16px 22px), linear-gradient(to bottom, rgba(0,0,0,.35), transparent 30%, transparent 70%, rgba(0,0,0,.45))",
};

function BoothCollage({ s, photos, variant, places }: StyleProps) {
  const story = variant === "story";
  const per = story ? 4 : 3;
  const k = Math.ceil(photos.length / per);
  const sw = story ? (k === 1 ? 140 : k === 2 ? 122 : 104) : k === 1 ? 110 : k === 2 ? 98 : 90;
  const pw = sw - 12;
  const ph = Math.round(pw * (story ? 0.82 : 0.66));
  const rots = [-4, 3, -2];
  return (
    <Canvas w={360} h={story ? 640 : 360} className="text-cream-50" style={CURTAIN}>
      <div className={cn("relative z-10 flex justify-center", story ? "pt-8" : "pt-3")}>
        <div
          className={cn("rounded-xl border-[3px] border-sun-400 bg-[#1a1530] text-center", story ? "px-5 py-2.5" : "px-3 py-1")}
          style={{ boxShadow: "0 0 0 3px #1a1530, 0 0 18px rgba(255,201,60,.55)" }}
        >
          <p className={cn("font-display font-extrabold uppercase leading-none tracking-[0.12em] text-sun-400", story ? "text-[28px]" : "text-[16px]")}>
            ★ Photo Booth ★
          </p>
          <p className={cn("font-mono font-bold uppercase tracking-[0.3em] text-cream-100/80", story ? "mt-1 text-[9px]" : "text-[7px]")}>
            {s.year} · {per} poses · no retakes
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 flex items-start justify-center gap-3" style={story ? { top: 140 } : { top: 66 }}>
        {Array.from({ length: k }, (_, j) => {
          const group = photos.slice(j * per, (j + 1) * per);
          return (
            <div
              key={j}
              className="flex flex-col gap-[5px] bg-[#fbfaf6] p-[6px] pb-0 shadow-[0_12px_24px_rgba(0,0,0,.5)]"
              style={{ width: sw, transform: `rotate(${rots[j % 3]}deg) translateY(${j === 1 ? (story ? 22 : 8) : 0}px)` }}
            >
              {group.map((p, i) => (
                <div key={p.url + i} className="relative overflow-hidden bg-neutral-800" style={{ height: ph }}>
                  <Photo src={p.url} style={{ filter: "grayscale(1) contrast(1.2) brightness(1.05)" }} />
                </div>
              ))}
              <p className="truncate py-1.5 text-center font-mono text-[7px] font-bold uppercase tracking-wider text-ink/70">
                {group[0]?.city} · {shortDate(group[0]?.date ?? "")}
              </p>
            </div>
          );
        })}
      </div>
      {story && <Footer s={s} photos={photos} places={places} />}
    </Canvas>
  );
}

/* ───────────────────────── 5. Scrapbook ───────────────────────── */

const TAPE = ["#ffc93c", "#b9a3ff", "#7ee0c1", "#ffb38a", "#ff8a5b"];
const DOODLES = ["✈️", "🌴", "📍", "⭐", "🗺️", "🌊", "☀️", "🍜", "🏔️"];
const RANSOM_BG = ["#fffbf4", INK, "#ffc93c", "#ff6a3d", "#7b4dff", "#17b890"];

function Ransom({ text, size, rand }: { text: string; size: number; rand: () => number }) {
  return (
    <span className="inline-flex flex-wrap gap-[3px]">
      {Array.from(text).map((ch, i) => {
        const bg = RANSOM_BG[Math.floor(rand() * RANSOM_BG.length)];
        const dark = bg === INK || bg === "#7b4dff";
        return (
          <span
            key={i}
            className={cn("inline-block px-[5px] leading-[1.05] shadow-[1px_2px_0_rgba(0,0,0,.25)]", i % 2 ? "font-serif italic" : "font-display font-extrabold")}
            style={{ background: bg, color: dark ? "#fffbf4" : INK, fontSize: size * (0.85 + rand() * 0.3), transform: `rotate(${(rand() - 0.5) * 12}deg)` }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

function ScrapbookCollage({ s, photos, variant, rand, places }: StyleProps) {
  const story = variant === "story";
  const area = story ? { top: 150, w: 344, h: 430 } : { top: 60, w: 344, h: 292 };
  const cells = scatter(photos.length, area.w, area.h, colsFor(photos.length, variant), rand, 8, story ? 10 : 6);
  return (
    <Canvas
      w={360}
      h={story ? 640 : 360}
      className="grain text-ink"
      style={{
        backgroundColor: "#e8d5b0",
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 23px, rgba(90,60,20,.12) 23px 24px)",
      }}
    >
      <div className={cn("relative z-10", story ? "px-6 pt-9" : "flex items-center justify-between px-4 pt-3")}>
        <Ransom text={String(s.year)} size={story ? 40 : 22} rand={rand} />
        <p className={cn("font-serif italic", story ? "mt-3 text-[24px] leading-tight" : "text-[16px]")}>
          {story ? <>dear diary, <span className="text-sunset-600">what a year</span> ✿</> : "dear diary ✿"}
        </p>
      </div>
      <div className="absolute left-2" style={{ top: area.top, width: area.w, height: area.h }}>
        {photos.map((p, i) => {
          const c = cells[i];
          const landscape = rand() > 0.5;
          const base = Math.min(c.cw * 1.02, c.ch * 1.02, 220);
          const w = landscape ? base : base * 0.82;
          const h = landscape ? base * 0.8 : base;
          const tapeRot = (rand() - 0.5) * 40;
          return (
            <div key={p.url + i} style={placed(c, w, h)} className="bg-white p-[4px] shadow-[2px_6px_12px_rgba(60,35,5,.35)]">
              <div className="relative size-full overflow-hidden">
                <Photo src={p.url} />
              </div>
              <span
                className="absolute left-1/2 top-[-9px] h-[16px] w-[54px] -translate-x-1/2 opacity-85"
                style={{
                  background: `repeating-linear-gradient(45deg, ${TAPE[i % TAPE.length]} 0 6px, rgba(255,255,255,.35) 6px 9px)`,
                  transform: `translateX(-50%) rotate(${tapeRot}deg)`,
                }}
              />
              {i % 2 === 0 && (
                <span
                  className="absolute bottom-[-8px] right-[-6px] max-w-[110%] truncate rounded-sm bg-[#fffbf4] px-1.5 py-0.5 font-serif text-[11px] italic leading-none shadow-sm"
                  style={{ transform: `rotate(${-c.rot - 4}deg)` }}
                >
                  {p.city}
                </span>
              )}
              {i % 3 === 1 && (
                <span className="absolute left-[-12px] top-[-12px] text-[22px] [filter:drop-shadow(0_2px_1px_rgba(0,0,0,.25))]">
                  {DOODLES[(i + Math.floor(rand() * 9)) % DOODLES.length]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {story && <Footer s={s} photos={photos} places={places} />}
    </Canvas>
  );
}

/* ───────────────────────── 6. Postage stamps ───────────────────────── */

const PAPER = "#f3ead8";

function Perforation({ side }: { side: "top" | "bottom" | "left" | "right" }) {
  const horiz = side === "top" || side === "bottom";
  return (
    <span
      className="absolute"
      style={{
        [side]: -3,
        ...(horiz ? { left: 0, right: 0, height: 6 } : { top: 0, bottom: 0, width: 6 }),
        backgroundImage: `radial-gradient(circle, ${PAPER} 2.4px, transparent 2.9px)`,
        backgroundSize: horiz ? "8px 6px" : "6px 8px",
        backgroundPosition: "center",
      }}
    />
  );
}

function Postmark({ city, year, size }: { city: string; year: number; size: number }) {
  return (
    <svg width={size * 1.9} height={size} viewBox="0 0 190 100" className="pointer-events-none absolute opacity-70" style={{ color: "#1d2a6b" }}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="50" y="47" textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor" fontFamily="ui-sans-serif, system-ui">
        {city.slice(0, 10).toUpperCase()}
      </text>
      <text x="50" y="64" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" fontFamily="ui-monospace, monospace">
        {year}
      </text>
      {[30, 44, 58, 72].map((y) => (
        <path key={y} d={`M100 ${y} q10 -7 20 0 t20 0 t20 0 t20 0`} fill="none" stroke="currentColor" strokeWidth="3" />
      ))}
    </svg>
  );
}

function StampsCollage({ s, photos, variant, rand, places }: StyleProps) {
  const story = variant === "story";
  const area = story ? { top: 150, w: 316, h: 410 } : { top: 66, w: 316, h: 262 };
  const cells = scatter(photos.length, area.w, area.h, colsFor(photos.length, variant), rand, 6, story ? 6 : 4);
  const values = ["5¢", "10¢", "25¢", "50¢", "1$", "2$"];
  return (
    <Canvas
      w={360}
      h={story ? 640 : 360}
      className="text-ink"
      style={{ background: "repeating-linear-gradient(135deg, #d6263a 0 14px, #fffbf4 14px 22px, #1f4fbf 22px 36px, #fffbf4 36px 44px)" }}
    >
      <div className="absolute inset-[10px] overflow-hidden" style={{ background: PAPER }}>
        <div className={cn("relative z-10 text-center", story ? "pt-7" : "flex items-baseline justify-center gap-2 pt-2")}>
          <p className={cn("font-serif italic text-[#1f4fbf]", story ? "text-[22px]" : "text-[16px]")}>Greetings from</p>
          <p className={cn("font-display font-extrabold uppercase leading-[0.85] tracking-tight text-[#d6263a]", story ? "text-[64px]" : "text-[30px]")}>
            {s.year}
          </p>
          {story && <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-ink/60">par avion · airmail</p>}
        </div>
        <div className="absolute left-[12px]" style={{ top: area.top - 10, width: area.w, height: area.h }}>
          {photos.map((p, i) => {
            const c = cells[i];
            const w = Math.min(c.cw * 0.9, (c.ch * 0.92) / 1.22, 190);
            const h = w * 1.22;
            return (
              <div key={p.url + i} style={placed(c, w, h)} className="bg-white p-[6px] shadow-[0_3px_8px_rgba(0,0,0,.2)]">
                <Perforation side="top" />
                <Perforation side="bottom" />
                <Perforation side="left" />
                <Perforation side="right" />
                <div className="relative overflow-hidden" style={{ height: h - 12 - 15 }}>
                  <Photo src={p.url} style={{ filter: "saturate(1.25)" }} />
                  <span className="absolute right-1 top-1 rounded-sm bg-white/85 px-1 font-display text-[9px] font-extrabold leading-tight text-[#d6263a]">
                    {values[i % values.length]}
                  </span>
                </div>
                <p className="mt-[3px] truncate text-center text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#1f4fbf]">{p.city}</p>
              </div>
            );
          })}
          {photos.slice(0, Math.min(2, photos.length)).map((p, i) => {
            const c = cells[i * 2 < photos.length ? i * 2 : i];
            const size = story ? 62 : 46;
            return (
              <div key={"pm" + i} className="absolute" style={{ left: c.x - size * 0.2, top: c.y + size * 0.1, transform: `rotate(${-12 + i * 20}deg)` }}>
                <Postmark city={p.city} year={s.year} size={size} />
              </div>
            );
          })}
        </div>
        {story && <Footer s={s} photos={photos} places={places} className="bottom-3" />}
      </div>
    </Canvas>
  );
}

/* ───────────────────────── 7. Pop art ───────────────────────── */

type Shape = { clipPath?: string; borderRadius?: string };
const SHAPES: Shape[] = [
  { borderRadius: "50%" },
  { clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" },
  { borderRadius: "62% 38% 46% 54% / 55% 44% 56% 45%" },
  { borderRadius: "999px 999px 14px 14px" },
  {
    clipPath:
      "polygon(50% 0%, 59% 13%, 75% 7%, 77% 24%, 93% 25%, 87% 41%, 100% 50%, 87% 59%, 93% 75%, 77% 76%, 75% 93%, 59% 87%, 50% 100%, 41% 87%, 25% 93%, 23% 76%, 7% 75%, 13% 59%, 0% 50%, 13% 41%, 7% 25%, 23% 24%, 25% 7%, 41% 13%)",
  },
  { borderRadius: "28%" },
];
const STICKERS = ["OMG!", "10/10", "core memory", "main character", "no notes", "IYKYK", "WOW", "BEST. YEAR."];
const STICKER_BG = [
  { bg: "#7b4dff", fg: "#fffbf4" },
  { bg: "#ff6a3d", fg: "#fffbf4" },
  { bg: "#3fcc9f", fg: INK },
  { bg: "#fffbf4", fg: INK },
];

function PopCollage({ s, photos, variant, rand, places }: StyleProps) {
  const story = variant === "story";
  const area = story ? { top: 170, w: 344, h: 400 } : { top: 62, w: 344, h: 290 };
  const cells = scatter(photos.length, area.w, area.h, colsFor(photos.length, variant), rand, 12, story ? 10 : 6);
  const offset = Math.floor(rand() * SHAPES.length);
  const stickerOffset = Math.floor(rand() * STICKERS.length);
  return (
    <Canvas
      w={360}
      h={story ? 640 : 360}
      className="text-ink"
      style={{
        backgroundColor: "#ffc93c",
        backgroundImage: "radial-gradient(rgba(255,106,61,.45) 1.7px, transparent 2.2px)",
        backgroundSize: "10px 10px",
      }}
    >
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-[#ff6a3d]" />
      <div className="absolute -bottom-20 -left-14 size-60 rounded-full bg-[#7b4dff]" />
      <div className={cn("relative z-10", story ? "px-6 pt-8" : "flex items-center gap-3 px-4 pt-2")}>
        <p
          className={cn("font-display font-extrabold leading-[0.85] tracking-tighter text-white", story ? "text-[104px]" : "text-[44px]")}
          style={{ WebkitTextStroke: `${story ? 3 : 2}px ${INK}`, textShadow: `${story ? 6 : 3}px ${story ? 6 : 3}px 0 ${INK}` }}
        >
          {s.year}!
        </p>
        <span
          className={cn("inline-block -rotate-3 rounded-full border-[2.5px] border-ink bg-ink font-serif italic text-sun-400", story ? "mt-1 px-4 py-1 text-[22px]" : "px-2.5 py-0.5 text-[14px]")}
        >
          was a whole vibe ✦
        </span>
      </div>
      <div className="absolute left-2" style={{ top: area.top, width: area.w, height: area.h }}>
        {photos.map((p, i) => {
          const c = cells[i];
          const sz = Math.min(c.cw, c.ch, 230) * 0.98;
          const shape = SHAPES[(i + offset) % SHAPES.length];
          const ow = story ? 4 : 3;
          return (
            <div key={p.url + i} style={placed(c, sz, sz)}>
              <div className="absolute inset-0 bg-ink" style={{ ...shape, transform: `translate(${ow + 2}px, ${ow + 2}px)` }} />
              <div className="absolute inset-0 bg-ink" style={shape} />
              <div className="absolute overflow-hidden" style={{ ...shape, inset: ow }}>
                <Photo src={p.url} style={{ filter: "saturate(1.45) contrast(1.12)" }} />
              </div>
              {i % 2 === 0 && (
                <span
                  className="absolute whitespace-nowrap rounded-full border-[2.5px] border-ink px-2 py-0.5 font-display text-[11px] font-extrabold uppercase leading-none"
                  style={{
                    right: -10,
                    top: -6,
                    background: STICKER_BG[(i / 2) % STICKER_BG.length].bg,
                    color: STICKER_BG[(i / 2) % STICKER_BG.length].fg,
                    boxShadow: `2px 2px 0 ${INK}`,
                    transform: `rotate(${(rand() - 0.5) * 30}deg)`,
                  }}
                >
                  {STICKERS[(i / 2 + stickerOffset) % STICKERS.length]}
                </span>
              )}
              {i % 2 === 1 && <span className="absolute -bottom-2 -left-2 text-[22px] text-white [text-shadow:2px_2px_0_#1a1530]">✦</span>}
            </div>
          );
        })}
      </div>
      {story && <Footer s={s} photos={photos} places={places} className="text-ink" />}
    </Canvas>
  );
}

/* ───────────────────────── 8. Magazine cover ───────────────────────── */

function MagazineCollage({ s, photos, variant, places }: StyleProps) {
  const story = variant === "story";
  const [hero, ...insets] = photos;
  const topCity = s.mostExplored?.city ?? hero.city;
  return (
    <Canvas w={360} h={story ? 640 : 360} className="bg-navy-950 text-cream-50">
      <Photo src={hero.url} style={{ filter: "saturate(1.1) contrast(1.05)" }} />
      <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/65 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      <div className={cn("relative z-10", story ? "px-5 pt-6" : "px-4 pt-3")}>
        <div className="flex items-center justify-between font-bold uppercase tracking-[0.2em] text-cream-50/85" style={{ fontSize: story ? 9 : 7 }}>
          <span>The {s.year} issue</span>
          <span>Vol. {String(s.year).slice(2)} · No. {s.totalTrips}</span>
        </div>
        <p
          className={cn("font-display font-extrabold uppercase leading-[0.82] tracking-[-0.06em] text-sun-400", story ? "text-[100px]" : "text-[62px]")}
          style={{ textShadow: "0 3px 12px rgba(0,0,0,.35)" }}
        >
          Wander
        </p>
      </div>

      <div className={cn("absolute z-10 flex flex-col", story ? "left-5 top-[170px] w-[180px] gap-4" : "left-4 top-[92px] w-[150px] gap-2")}>
        <div>
          <p className={cn("font-display font-extrabold leading-none", story ? "text-[46px]" : "text-[30px]")}>{places || s.cities.length}</p>
          <p className={cn("font-serif italic leading-tight", story ? "text-[19px]" : "text-[13px]")}>places that changed everything</p>
        </div>
        <div className="h-[3px] w-10 bg-sunset-500" />
        <p className={cn("font-bold uppercase leading-snug tracking-wide", story ? "text-[12px]" : "text-[9px]")}>
          Exclusive: <span className="text-sun-400">{topCity}</span>, uncovered
        </p>
        {story && (
          <p className="text-[12px] font-bold uppercase leading-snug tracking-wide">
            {plural(s.totalDays, "day")} on the road — <span className="text-sunset-300">a diary</span>
          </p>
        )}
      </div>

      <div className={cn("absolute z-10", story ? "inset-x-5 bottom-6" : "inset-x-4 bottom-3")}>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("font-bold uppercase tracking-[0.2em] text-sunset-300", story ? "text-[10px]" : "text-[7px]")}>Cover story</p>
            <p className={cn("font-display font-extrabold leading-[0.95]", story ? "text-[30px]" : "text-[18px]")}>{s.ownerName}:</p>
            <p className={cn("font-serif italic leading-tight", story ? "text-[20px]" : "text-[13px]")}>“{s.personality.title}”</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {insets.map((p, i) => (
              <div key={p.url + i} className="relative">
                <div
                  className="relative overflow-hidden border-2 border-cream-50 shadow-lg"
                  style={{ width: story ? 64 : 44, height: story ? 80 : 54, transform: `rotate(${i % 2 ? 4 : -4}deg)` }}
                >
                  <Photo src={p.url} />
                </div>
                <p className="mt-1 text-center font-mono text-[7px] font-bold uppercase">p. {(i + 1) * 14}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div
            className="h-[22px] w-[74px] bg-white"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 3px, #000 3px 4px, transparent 4px 6px, #000 6px 9px, transparent 9px 10px)" }}
          />
          <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-cream-50/60">{brandHost()}</p>
        </div>
      </div>
    </Canvas>
  );
}

/* ───────────────────────── 9. Sticker pack ───────────────────────── */

const GENZ_LINES = [
  "touch grass ✓",
  "slay 💅",
  "it's giving wanderlust",
  "no thoughts just vibes",
  "out of office ☀️",
  "core memory",
  "understood the assignment",
  "rent free 🧠",
  "fr fr",
  "delulu but booked it",
];
const EMOJI_STICKERS = ["🍓", "🌈", "🦋", "⭐", "🍒", "💿", "🫧", "🌸", "🍉", "✌️"];
const PASTELS = ["#ff8ad0", "#ffe66d", "#7fd8ff", "#fffbf4", "#b69cff", "#9ff0c4"];
const WHITE_OUTLINE = "2px 0 #fff, -2px 0 #fff, 0 2px #fff, 0 -2px #fff, 1.5px 1.5px #fff, -1.5px -1.5px #fff, 1.5px -1.5px #fff, -1.5px 1.5px #fff";

function StickersCollage({ s, photos, variant, rand, places }: StyleProps) {
  const story = variant === "story";
  const area = story ? { top: 176, w: 344, h: 396 } : { top: 66, w: 344, h: 286 };
  const cells = scatter(photos.length, area.w, area.h, colsFor(photos.length, variant), rand, 14, story ? 10 : 6);
  const shapeOffset = Math.floor(rand() * SHAPES.length);
  const lineOffset = Math.floor(rand() * GENZ_LINES.length);
  const H = story ? 640 : 360;
  const loose = Array.from({ length: story ? 5 : 3 }, (_, i) => ({
    e: EMOJI_STICKERS[(i * 3 + lineOffset) % EMOJI_STICKERS.length],
    x: 10 + rand() * 320,
    y: (story ? 120 : 40) + rand() * (H - (story ? 180 : 60)),
    rot: (rand() - 0.5) * 50,
  }));
  return (
    <Canvas
      w={360}
      h={H}
      className="text-cream-50"
      style={{
        backgroundColor: "#2e8f6c",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)",
        backgroundSize: "60px 60px, 60px 60px, 12px 12px, 12px 12px",
      }}
    >
      {loose.map((l, i) => (
        <span key={i} className="absolute text-[26px] leading-none" style={{ left: l.x, top: l.y, transform: `rotate(${l.rot}deg)`, textShadow: WHITE_OUTLINE, filter: "drop-shadow(0 3px 2px rgba(0,0,0,.3))" }}>
          {l.e}
        </span>
      ))}
      <div className={cn("relative z-10", story ? "px-6 pt-9" : "flex items-center gap-3 px-4 pt-3")} style={{ filter: "drop-shadow(0 4px 3px rgba(0,0,0,.3))" }}>
        <span className={cn("inline-block -rotate-3 rounded-2xl border-[3px] border-white bg-ink font-display font-extrabold leading-none text-[#ffe66d]", story ? "px-4 py-2 text-[64px]" : "px-2.5 py-1 text-[30px]")}>
          {s.year}
        </span>
        <div className={story ? "mt-3 flex flex-wrap gap-2" : "flex flex-col items-start gap-1"}>
          <span className={cn("inline-block rotate-3 rounded-full border-[3px] border-white bg-[#ff8ad0] font-extrabold text-ink", story ? "px-3 py-1 text-[15px]" : "px-2 py-0.5 text-[10px]")}>
            sticker pack ✂︎
          </span>
          <span className={cn("inline-block -rotate-2 rounded-full border-[3px] border-white bg-[#7fd8ff] font-extrabold text-ink", story ? "px-3 py-1 text-[15px]" : "px-2 py-0.5 text-[10px]")}>
            peel &amp; post
          </span>
        </div>
      </div>
      <div className="absolute left-2" style={{ top: area.top, width: area.w, height: area.h }}>
        {photos.map((p, i) => {
          const c = cells[i];
          const sz = Math.min(c.cw, c.ch, 230) * 0.95;
          const shape = SHAPES[(i + shapeOffset) % SHAPES.length];
          const col = PASTELS[(i + lineOffset) % PASTELS.length];
          return (
            <div key={p.url + i} style={placed(c, sz, sz, { filter: "drop-shadow(0 5px 4px rgba(0,0,0,.35))", zIndex: i })}>
              <div className="absolute inset-0 bg-white" style={shape} />
              <div className="absolute overflow-hidden" style={{ ...shape, inset: 6 }}>
                <Photo src={p.url} style={{ filter: "saturate(1.2)" }} />
              </div>
              {i % 2 === 0 ? (
                <span
                  className="absolute bottom-[-8px] left-1/2 whitespace-nowrap rounded-full border-[2.5px] border-white px-2.5 py-1 text-[10px] font-extrabold lowercase leading-none text-ink"
                  style={{ background: col, transform: `translateX(-50%) rotate(${(rand() - 0.5) * 16}deg)` }}
                >
                  {GENZ_LINES[(i / 2 + lineOffset) % GENZ_LINES.length]}
                </span>
              ) : (
                <span className="absolute -right-2 -top-3 text-[28px] leading-none" style={{ textShadow: WHITE_OUTLINE }}>
                  {EMOJI_STICKERS[(i + lineOffset) % EMOJI_STICKERS.length]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {story && <Footer s={s} photos={photos} places={places} />}
    </Canvas>
  );
}

/* ───────────────────────── 10. Y2K chrome ───────────────────────── */

const CHROME_TEXT: React.CSSProperties = {
  backgroundImage: "linear-gradient(180deg, #ffffff 0%, #e3e9f7 28%, #8a94b0 47%, #2e3550 52%, #c7d0e6 72%, #ffffff 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter: "drop-shadow(0 3px 0 #ff4fa8) drop-shadow(0 0 10px rgba(255,255,255,.7))",
};
const Y2K_RADII = ["9999px", "36px", "9999px 9999px 24px 24px", "28px 9999px 28px 9999px"];
const SPARKLES = ["✦", "✧", "⋆", "♡", "✦"];

function Y2kCollage({ s, photos, variant, rand, places }: StyleProps) {
  const story = variant === "story";
  const H = story ? 640 : 360;
  const area = story ? { top: 204, w: 344, h: 376 } : { top: 72, w: 344, h: 280 };
  const cells = scatter(photos.length, area.w, area.h, colsFor(photos.length, variant), rand, 8, story ? 10 : 6);
  const sparkles = Array.from({ length: story ? 16 : 10 }, (_, i) => ({
    ch: SPARKLES[i % SPARKLES.length],
    x: rand() * 345,
    y: rand() * (H - 20),
    size: 10 + rand() * 18,
  }));
  return (
    <Canvas w={360} h={H} className="text-[#5b2a86]" style={{ background: "linear-gradient(160deg, #ffc6ec 0%, #d9c2ff 48%, #b8e6ff 100%)" }}>
      <div className="absolute -left-16 top-24 size-56 rounded-full bg-white/50 blur-3xl" />
      <div className="absolute -right-10 bottom-16 size-56 rounded-full bg-[#ff9ad5]/50 blur-3xl" />
      {sparkles.map((sp, i) => (
        <span key={i} className="absolute leading-none text-white" style={{ left: sp.x, top: sp.y, fontSize: sp.size, textShadow: "0 0 6px #ff7ac6" }}>
          {sp.ch}
        </span>
      ))}
      <div className={cn("relative z-10", story ? "px-6 pt-8" : "flex items-center gap-3 px-4 pt-2")}>
        {story && (
          <span className="inline-block rounded-full border-2 border-white bg-white/60 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#ff3fa4]">
            ✧ the {s.year} era ✧
          </span>
        )}
        <p className={cn("font-display font-extrabold leading-[0.85] tracking-tighter", story ? "mt-1 text-[112px]" : "text-[52px]")} style={CHROME_TEXT}>
          {s.year}
        </p>
        <p className={cn("font-serif italic leading-tight text-[#ff3fa4]", story ? "text-[26px]" : "text-[16px]")}>
          it&apos;s giving <br className={story ? "hidden" : ""} />main character ♡
        </p>
      </div>
      <div className="absolute left-2" style={{ top: area.top, width: area.w, height: area.h }}>
        {photos.map((p, i) => {
          const c = cells[i];
          const sz = Math.min(c.cw, c.ch, 220) * 0.96;
          const portrait = i % 3 === 1;
          const w = portrait ? sz * 0.76 : sz;
          const radius = Y2K_RADII[i % Y2K_RADII.length];
          return (
            <div
              key={p.url + i}
              style={placed(c, w, sz, {
                padding: 4,
                borderRadius: radius,
                background: "linear-gradient(135deg, #ff8ad0, #b69cff 50%, #8fe3ff)",
                boxShadow: "0 0 0 2px #fff, 0 10px 24px rgba(150,70,200,.35)",
              })}
            >
              <div className="relative size-full overflow-hidden border-2 border-white" style={{ borderRadius: radius }}>
                <Photo src={p.url} style={{ filter: "saturate(1.25) brightness(1.05)" }} />
                <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-transparent" />
              </div>
              {i % 2 === 0 && (
                <span className="absolute bottom-[-9px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-white bg-white/90 px-2 py-0.5 text-[9px] font-extrabold text-[#ff3fa4] shadow">
                  ★ {p.city}
                </span>
              )}
              {i % 3 === 2 && <span className="absolute -right-2 -top-3 text-[24px] leading-none">🦋</span>}
            </div>
          );
        })}
      </div>
      {story && <Footer s={s} photos={photos} places={places} />}
    </Canvas>
  );
}

/* ───────────────────────── 11. Trip receipt ───────────────────────── */

const RECEIPT = "#fdfcf8";

/** Torn-paper edge as a zig-zag polygon (pixel-exact so it exports cleanly). */
function TornEdge({ w, side }: { w: number; side: "top" | "bottom" }) {
  const step = 6;
  const n = Math.ceil(w / step);
  const pts: string[] = side === "bottom" ? ["0 0", `${w}px 0`] : ["0 100%", `${w}px 100%`];
  for (let k = n; k >= 0; k--) {
    const tip = k % 2 === 0;
    pts.push(`${Math.min(k * step, w)}px ${side === "bottom" ? (tip ? "100%" : "0") : tip ? "0" : "100%"}`);
  }
  return <div className="h-[7px]" style={{ width: w, background: RECEIPT, clipPath: `polygon(${pts.join(", ")})` }} />;
}

function ReceiptCollage({ s, photos, variant, places }: StyleProps) {
  const story = variant === "story";
  const W = story ? 264 : 190;
  const cols = story ? 3 : 2;
  const ps = (W - 28 - (cols - 1) * 4) / cols;
  const counts = new Map<string, number>();
  for (const p of photos) counts.set(p.city, (counts.get(p.city) ?? 0) + 1);
  const lines = Array.from(counts).slice(0, 5);
  const row = (l: React.ReactNode, r: React.ReactNode, cls?: string) => (
    <div className={cn("flex justify-between gap-2", cls)}>
      <span className="truncate">{l}</span>
      <span className="shrink-0">{r}</span>
    </div>
  );
  const rule = <div className="my-2 border-t border-dashed border-ink/40" />;
  return (
    <Canvas w={360} h={story ? 640 : 360} className="text-ink" style={{ background: "linear-gradient(160deg, #ffd6e8, #c9b8ff 60%, #a8d8ff)" }}>
      {!story && (
        <div className="absolute right-3 top-8 w-[140px] text-right">
          <p className="font-serif text-[22px] italic leading-none text-[#5b2a86]">the receipts</p>
          <p className="font-display text-[50px] font-extrabold leading-[0.9] tracking-tighter">{s.year}</p>
          <span className="mt-3 inline-block rotate-6 rounded-full border-2 border-ink bg-ink px-3 py-1 text-[11px] font-extrabold uppercase text-sun-400">paid in full ✓</span>
          <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.15em] text-ink/60">no refunds on memories</p>
          <p className="mt-10 text-[8px] font-bold uppercase tracking-[0.15em] text-ink/50">{brandHost()}</p>
        </div>
      )}
      <div
        className="absolute"
        style={{ left: story ? 48 : 16, top: story ? 30 : 14, width: W, transform: `rotate(${story ? -1.5 : -2}deg)`, filter: "drop-shadow(0 14px 18px rgba(60,30,90,.3))" }}
      >
        <TornEdge w={W} side="top" />
        <div className="px-[14px] py-2 font-mono uppercase leading-[1.45]" style={{ background: RECEIPT, fontSize: story ? 10 : 8 }}>
          <p className="text-center font-extrabold" style={{ fontSize: story ? 15 : 11 }}>✈ trip receipt ✈</p>
          <p className="text-center">order #{s.year}-{String(s.totalTrips).padStart(3, "0")}</p>
          {story && <p className="text-center">cashier: {s.ownerName}</p>}
          {rule}
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {photos.map((p, i) => (
              <div key={p.url + i} className="relative overflow-hidden" style={{ height: ps }}>
                <Photo src={p.url} style={{ filter: "grayscale(1) contrast(1.5) brightness(1.08)" }} />
              </div>
            ))}
          </div>
          {rule}
          {story && (
            <>
              {lines.map(([city, n]) => row(city, n > 1 ? `x${n} priceless` : "priceless", undefined))}
              {rule}
            </>
          )}
          {row("trips", s.totalTrips)}
          {row("days off", s.totalDays)}
          {row("places", places || s.cities.length)}
          {row("regrets", "0.00")}
          {rule}
          {row("total", "main character", cn("font-extrabold", story ? "text-[13px]" : "text-[10px]"))}
          {story && (
            <>
              {rule}
              <div
                className="mx-auto h-[34px] w-[86%]"
                style={{ backgroundImage: "repeating-linear-gradient(90deg, #1a1530 0 2px, transparent 2px 3px, #1a1530 3px 4px, transparent 4px 7px, #1a1530 7px 10px, transparent 10px 11px)" }}
              />
              <p className="mt-1.5 text-center font-extrabold">thank you, come again ✦</p>
              <p className="text-center text-ink/60">{brandHost()}</p>
            </>
          )}
        </div>
        <TornEdge w={W} side="bottom" />
      </div>
    </Canvas>
  );
}

/* ───────────────────────── 12. Notes app dump ───────────────────────── */

const NOTES_AMBER = "#e2a400";

function NotesCollage({ s, photos, variant, places }: StyleProps) {
  const story = variant === "story";
  const items = Array.from(new Set([...photos.map((p) => p.city), ...s.cities.map((c) => c.city)])).slice(0, story ? 5 : 4);
  const check = (city: string) => (
    <div key={city} className="flex items-center gap-2">
      <span className="grid shrink-0 place-items-center rounded-full text-white" style={{ background: NOTES_AMBER, width: story ? 16 : 12, height: story ? 16 : 12, fontSize: story ? 10 : 8 }}>
        ✓
      </span>
      <span className="truncate text-ink/55 line-through decoration-ink/40">{city}</span>
    </div>
  );
  const n = photos.length;
  return (
    <Canvas w={360} h={story ? 640 : 360} className="bg-[#fffef9] text-ink">
      <div className={cn("flex items-center justify-between font-semibold", story ? "px-4 pt-5 text-[14px]" : "px-3 pt-2.5 text-[11px]")} style={{ color: NOTES_AMBER }}>
        <span>‹ Notes</span>
        <span className="flex items-center gap-3">
          <span>⤴</span>
          <span>⋯</span>
          <span className="font-bold">Done</span>
        </span>
      </div>
      <p className={cn("text-center text-ink/40", story ? "mt-2 text-[10px]" : "mt-0.5 text-[8px]")}>December 31, {s.year} at 11:59 PM</p>

      {story ? (
        <div className="px-5 pt-2">
          <p className="text-[27px] font-extrabold leading-tight tracking-tight">{s.year} photo dump 🫶</p>
          <p className="mt-1 text-[13px] text-ink/70">places i romanticised this year:</p>
          <div className="mt-2 space-y-1.5 text-[14px]">{items.map(check)}</div>
          <div className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: n > 1 ? "1fr 1fr" : "1fr", height: 280 }}>
            {photos.map((p, i) => (
              <div key={p.url + i} className="relative min-h-0 overflow-hidden rounded-xl" style={n % 2 === 1 && i === 0 && n > 1 ? { gridColumn: "span 2" } : undefined}>
                <Photo src={p.url} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-ink/70">
            note to self: do it again in {s.year + 1} ✈️ <span className="text-ink/40">#nofilter</span>
          </p>
        </div>
      ) : (
        <div className="flex gap-3 px-4 pt-1.5">
          <div className="w-[146px] shrink-0">
            <p className="text-[19px] font-extrabold leading-tight tracking-tight">{s.year} photo dump 🫶</p>
            <p className="mt-1 text-[10px] text-ink/70">places i romanticised:</p>
            <div className="mt-1.5 space-y-1 text-[11px]">{items.map(check)}</div>
            <p className="mt-3 text-[10px] text-ink/60">note to self: again in {s.year + 1} ✈️</p>
            <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.15em] text-ink/40">
              {s.ownerName} · {brandHost()}
            </p>
          </div>
          <div className="grid min-w-0 flex-1 gap-1.5" style={{ height: 290, gridTemplateColumns: n > 1 ? "1fr 1fr" : "1fr", gridTemplateRows: n > 2 ? "1fr 1fr" : "1fr" }}>
            {photos.map((p, i) => (
              <div key={p.url + i} className="relative min-h-0 overflow-hidden rounded-xl" style={n === 3 && i === 0 ? { gridRow: "span 2" } : undefined}>
                <Photo src={p.url} />
              </div>
            ))}
          </div>
        </div>
      )}
      {story && <Footer s={s} photos={photos} places={places} className="text-ink" />}
    </Canvas>
  );
}

/* ───────────────────────── 13. Retro desktop ───────────────────────── */

const BEVEL: React.CSSProperties = { borderStyle: "solid", borderWidth: 2, borderColor: "#ffffff #404040 #404040 #ffffff" };
const SUNKEN: React.CSSProperties = { borderStyle: "solid", borderWidth: 2, borderColor: "#808080 #ffffff #ffffff #808080" };

function Win({ title, style, children }: { title: string; style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div className="flex flex-col bg-[#c0c0c0] p-[2px] shadow-[4px_4px_0_rgba(0,0,0,.35)]" style={{ ...BEVEL, ...style }}>
      <div className="flex h-[15px] shrink-0 items-center justify-between gap-1 px-1" style={{ background: "linear-gradient(90deg, #000080, #1084d0)" }}>
        <span className="truncate font-mono text-[8px] font-bold text-white">{title}</span>
        <span className="flex gap-[2px]">
          {["_", "□", "×"].map((c) => (
            <span key={c} className="grid h-[10px] w-[11px] place-items-center bg-[#c0c0c0] font-mono text-[7px] font-bold leading-none text-black" style={{ ...BEVEL, borderWidth: 1 }}>
              {c}
            </span>
          ))}
        </span>
      </div>
      {children}
    </div>
  );
}

function DesktopCollage({ s, photos, variant, rand }: StyleProps) {
  const story = variant === "story";
  const horizon = story ? 470 : 250;
  const area = story ? { top: 150, w: 344, h: 320 } : { top: 46, w: 344, h: 260 };
  const cells = scatter(photos.length, area.w, area.h, colsFor(photos.length, variant), rand, 0, story ? 16 : 10);
  const sun = story ? 190 : 120;
  const file = (city: string) => `${city.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.jpg`;
  return (
    <Canvas w={360} h={story ? 640 : 360} className="text-white" style={{ background: "linear-gradient(to bottom, #1a0b3d 0%, #5b2a86 45%, #ff6ec7 75%, #ffb38a 100%)" }}>
      {/* synthwave sun + grid floor */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{ top: horizon - sun * 0.62, width: sun, height: sun, background: "linear-gradient(to bottom, #ffe76a, #ff6ec7 75%)" }}
      >
        <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-full" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 9px, #8a3a9e 9px 12px)" }} />
      </div>
      <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: horizon }}>
        <div
          className="absolute -inset-x-1/2 top-0 h-[300%]"
          style={{
            backgroundColor: "#2a0f4f",
            backgroundImage: "linear-gradient(rgba(255,110,199,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,110,199,.9) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            transform: "perspective(160px) rotateX(58deg)",
            transformOrigin: "top",
          }}
        />
      </div>

      <div className={cn("relative z-10", story ? "pt-7 text-center" : "px-3 pt-2")}>
        <p
          className={cn("font-display font-extrabold leading-none tracking-tight", story ? "text-[50px]" : "text-[26px]")}
          style={{ textShadow: story ? "3px 3px 0 #ff6ec7, 6px 6px 0 #5ce1e6" : "2px 2px 0 #ff6ec7, 4px 4px 0 #5ce1e6" }}
        >
          {s.year}.exe
        </p>
        {story && <p className="mt-2 font-mono text-[10px] text-[#9ff3ff]">C:\MEMORIES\{s.ownerName.toUpperCase().replace(/\s+/g, "_")}</p>}
        {story && (
          <div className="mt-3 flex justify-center gap-6 font-mono text-[8px]" style={{ textShadow: "1px 1px 0 #000" }}>
            {[
              ["📁", `trips_${String(s.year).slice(2)}`],
              ["🗑️", "regrets (0)"],
              ["💾", "memories.zip"],
            ].map(([icon, label]) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-[22px] leading-none">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute left-2 z-10" style={{ top: area.top, width: area.w, height: area.h }}>
        {photos.map((p, i) => {
          const c = cells[i];
          const w = Math.min(c.cw * 1.22, story ? 224 : 178);
          const h = w * 0.82;
          return (
            <Win key={p.url + i} title={file(p.city)} style={{ position: "absolute", left: Math.max(-4, Math.min(c.x - w / 2, area.w - w + 4)), top: c.y - h / 2, width: w, height: h, zIndex: i }}>
              <div className="relative mt-[2px] min-h-0 flex-1 overflow-hidden" style={SUNKEN}>
                <Photo src={p.url} style={{ filter: "saturate(1.15) contrast(1.05)" }} />
              </div>
            </Win>
          );
        })}
      </div>

      {story && (
        <Win title="trip.exe" style={{ position: "absolute", left: 62, top: 498, width: 236, zIndex: 20 }}>
          <div className="flex items-center gap-2 px-2 pb-1 pt-2 font-mono text-[9px] leading-snug text-black">
            <span className="text-[20px] leading-none">⚠️</span>
            <span>Are you sure you want to go back to normal life?</span>
          </div>
          <div className="flex justify-center gap-2 pb-2">
            {["No", "Absolutely not"].map((b) => (
              <span key={b} className="bg-[#c0c0c0] px-2.5 py-0.5 font-mono text-[8px] font-bold text-black" style={BEVEL}>
                {b}
              </span>
            ))}
          </div>
        </Win>
      )}

      {/* taskbar */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-1.5 bg-[#c0c0c0] px-1 text-black" style={{ height: story ? 28 : 22, borderTop: "2px solid #fff" }}>
        <span className="bg-[#c0c0c0] px-1.5 font-mono text-[10px] font-extrabold" style={BEVEL}>
          ✈ Start
        </span>
        <span className="truncate px-1.5 font-mono text-[9px]" style={{ ...SUNKEN, maxWidth: 150 }}>
          {s.ownerName}&apos;s {s.year}
        </span>
        <span className="ml-auto px-1.5 font-mono text-[8px]" style={SUNKEN}>
          {brandHost()} · 23:59
        </span>
      </div>
    </Canvas>
  );
}

/* ───────────────────────── 14. Dual cam ───────────────────────── */

function DualCamPost({ s, main, inset, w, h, compact }: { s: StoryData; main: GalleryPhoto; inset?: GalleryPhoto; w: number; h: number; compact: boolean }) {
  const initial = (s.ownerName || "T").trim()[0]?.toUpperCase() ?? "T";
  return (
    <div style={{ width: w }}>
      <div className={cn("flex items-center gap-2", compact ? "mb-1.5" : "mb-2")}>
        <span
          className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sunset-400 to-electric-500 font-display font-bold text-white"
          style={{ width: compact ? 22 : 28, height: compact ? 22 : 28, fontSize: compact ? 10 : 12 }}
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className={cn("truncate font-bold leading-tight", compact ? "text-[10px]" : "text-[12px]")}>{s.ownerName}</p>
          <p className={cn("truncate leading-tight text-white/55", compact ? "text-[8px]" : "text-[9px]")}>
            📍 {main.city} · {shortDate(main.date)}
          </p>
        </div>
        <span className={cn("ml-auto shrink-0 text-white/45", compact ? "text-[8px]" : "text-[9px]")}>⏰ 2h late</span>
      </div>
      <div className="relative overflow-hidden rounded-[18px] bg-neutral-800" style={{ height: h }}>
        <Photo src={main.url} />
        {inset && (
          <div
            className="absolute left-2.5 top-2.5 overflow-hidden rounded-[12px] border-2 border-black shadow-lg"
            style={{ width: compact ? 66 : 84, height: (compact ? 66 : 84) * 1.3 }}
          >
            <Photo src={inset.url} />
          </div>
        )}
      </div>
      <div className={cn("flex items-center text-white/50", compact ? "mt-1 text-[8px]" : "mt-1.5 text-[10px]")}>
        <span>💬 add a comment…</span>
        <span className="ml-auto tracking-widest">😍🔥😭</span>
      </div>
    </div>
  );
}

function DualCamCollage({ s, photos, variant, places }: StyleProps) {
  const story = variant === "story";
  const pairs: { main: GalleryPhoto; inset?: GalleryPhoto }[] = [];
  for (let i = 0; i < photos.length; i += 2) pairs.push({ main: photos[i], inset: photos[i + 1] });
  const shown = pairs.slice(0, story ? 2 : 1);
  return (
    <Canvas w={360} h={story ? 640 : 360} className="bg-[#050505] text-white">
      <div className={cn("text-center", story ? "pt-6" : "pt-2")}>
        <p className={cn("font-display font-extrabold tracking-tight", story ? "text-[22px]" : "text-[15px]")}>Wrapped.</p>
        {story && (
          <span className="mt-1 inline-block rounded-full bg-white/10 px-3 py-1 text-[9px] font-bold">⚡ time to be real: your {s.year} recap ⚡</span>
        )}
      </div>
      <div className={cn("flex flex-col items-center", story ? "mt-4 gap-5" : "mt-1.5")}>
        {shown.map((pr, i) => (
          <DualCamPost
            key={pr.main.url + i}
            s={s}
            main={pr.main}
            inset={pr.inset}
            w={story ? 328 : 336}
            h={story ? (shown.length === 1 ? 380 : 180) : 262}
            compact={!story}
          />
        ))}
      </div>
      {story && <Footer s={s} photos={photos} places={places} className="bottom-4" />}
    </Canvas>
  );
}

/* ───────────────────────── entry ───────────────────────── */

function EmptyCollage({ variant }: { variant: CollageVariant }) {
  return (
    <Canvas w={360} h={variant === "story" ? 640 : 360} className="bg-cream-100 p-6 text-muted">
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy-900/15 text-center">
        <Camera className="size-8" />
        <p className="max-w-[200px] text-xs font-semibold">Add photos to your trips to build your collage</p>
      </div>
    </Canvas>
  );
}

const RENDERERS: Record<CollageStyle, (p: StyleProps) => React.ReactNode> = {
  mosaic: MosaicCollage,
  polaroid: PolaroidCollage,
  film: FilmCollage,
  photobooth: BoothCollage,
  scrapbook: ScrapbookCollage,
  stamps: StampsCollage,
  pop: PopCollage,
  magazine: MagazineCollage,
  stickers: StickersCollage,
  y2k: Y2kCollage,
  receipt: ReceiptCollage,
  notes: NotesCollage,
  desktop: DesktopCollage,
  dualcam: DualCamCollage,
};

export function PhotoCollage({
  s,
  variant = "story",
  seed = 0,
  style = "mosaic",
}: {
  s: StoryData;
  variant?: CollageVariant;
  seed?: number;
  style?: CollageStyle;
}) {
  const photos = pickCollagePhotos(galleryOf(s), collageCap(style, variant), seed);
  if (!photos.length) return <EmptyCollage variant={variant} />;
  const places = new Set(photos.map((p) => p.city)).size;
  const rand = mulberry32((seed || 7) * 31 + style.length * 977 + (variant === "post" ? 13 : 0));
  const Render = RENDERERS[style] ?? MosaicCollage;
  return <Render s={s} photos={photos} variant={variant} rand={rand} places={places} />;
}
