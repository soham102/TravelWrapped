"use client";

/**
 * Scenes for the "Photo memories" video: a year title card, one full-screen card per photo
 * (branded "Travel Wrapped · YEAR", with city, trip and month), and a closing card.
 * Drawn straight onto 1080×1920 canvases using the app's own fonts.
 */

import type { GalleryPhoto } from "@/lib/types";
import { brandHost, plural } from "@/lib/utils";
import { VIDEO_H as H, VIDEO_W as W } from "./encode";

export interface PhotoVideoInfo {
  year: number;
  ownerName: string;
  totalTrips: number;
  totalDays: number;
  places: number;
}

const CREAM = "#fff5e6";
const SUNSET = "#ff6a3d";
const SUN = "#ffc93c";
const NAVY = "#060a1c";

let fonts: { display: string; serif: string; sans: string } | null = null;
async function getFonts() {
  if (fonts) return fonts;
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => {
    const f = css.getPropertyValue(name).trim();
    return f ? `${f}, ${fallback}` : fallback;
  };
  fonts = {
    display: v("--font-bricolage", "system-ui, sans-serif"),
    serif: v("--font-instrument", "Georgia, serif"),
    sans: v("--font-dmsans", "system-ui, sans-serif"),
  };
  await Promise.all([
    document.fonts?.load(`800 100px ${fonts.display}`),
    document.fonts?.load(`italic 400 100px ${fonts.serif}`),
    document.fonts?.load(`700 40px ${fonts.sans}`),
  ]).catch(() => undefined);
  return fonts;
}

function canvas() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.textBaseline = "alphabetic";
  return { c, ctx };
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

/** object-fit: cover into (x, y, w, h), biased slightly above centre so faces stay in frame. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * 0.4, dw, dh);
  ctx.restore();
}

/** Sets the largest font (up to `size`) at which `text` fits in `maxW`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, style: (px: number) => string) {
  let px = size;
  ctx.font = style(px);
  while (px > 24 && ctx.measureText(text).width > maxW) {
    px -= 4;
    ctx.font = style(px);
  }
  return px;
}

/** Rounded label. `x` is the left edge, or the centre when `center` is set. */
function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, bg: string, fg: string, center = false) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = "left";
  const w = ctx.measureText(text).width + 56;
  const left = center ? x - w / 2 : x;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(left, y, w, 72, 36);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, left + 28, y + 49);
  ctx.restore();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function backdrop(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, 120, 260, 820, "rgba(123,77,255,0.55)");
  glow(ctx, 980, 1680, 900, "rgba(255,106,61,0.5)");
}

const month = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en", { month: "long", year: "numeric" }).toUpperCase();
};

/* ───────── scenes ───────── */

async function introScene(info: PhotoVideoInfo, imgs: HTMLImageElement[]) {
  const f = await getFonts();
  const { c, ctx } = canvas();
  backdrop(ctx);
  ctx.textAlign = "center";

  ctx.fillStyle = SUNSET;
  ctx.font = `700 40px ${f.sans}`;
  ctx.letterSpacing = "12px";
  ctx.fillText("TRAVEL WRAPPED", W / 2, 230);
  ctx.letterSpacing = "0px";

  const grad = ctx.createLinearGradient(140, 0, 940, 0);
  grad.addColorStop(0, SUN);
  grad.addColorStop(0.5, SUNSET);
  grad.addColorStop(1, "#b9a3ff");
  ctx.fillStyle = grad;
  ctx.font = `800 300px ${f.display}`;
  ctx.fillText(String(info.year), W / 2, 520);
  ctx.fillStyle = CREAM;
  ctx.font = `italic 400 120px ${f.serif}`;
  ctx.fillText("in memories", W / 2, 660);

  // Three tilted polaroids as a teaser.
  const picks = imgs.slice(0, 3);
  const spots = [
    { x: 300, y: 1060, r: -0.12 },
    { x: 780, y: 1040, r: 0.1 },
    { x: 540, y: 1120, r: -0.02 },
  ];
  picks.forEach((img, i) => {
    const s = spots[picks.length === 1 ? 2 : i];
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.r);
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#fdfbf6";
    ctx.fillRect(-190, -210, 380, 460);
    ctx.shadowColor = "transparent";
    drawCover(ctx, img, -170, -190, 340, 360);
    ctx.restore();
  });

  ctx.fillStyle = CREAM;
  ctx.font = `700 54px ${f.sans}`;
  ctx.fillText(`${plural(info.totalTrips, "trip")} · ${plural(info.places, "place")} · ${plural(info.totalDays, "day")}`, W / 2, 1510);
  ctx.fillStyle = "rgba(255,245,230,0.65)";
  ctx.font = `italic 400 64px ${f.serif}`;
  ctx.fillText(`${info.ownerName}'s year, one photo at a time`, W / 2, 1610);
  ctx.font = `700 30px ${f.sans}`;
  ctx.letterSpacing = "6px";
  ctx.fillStyle = "rgba(255,245,230,0.45)";
  ctx.fillText(brandHost().toUpperCase(), W / 2, 1820);
  ctx.letterSpacing = "0px";
  return c;
}

async function photoScene(img: HTMLImageElement, p: GalleryPhoto, i: number, n: number, info: PhotoVideoInfo) {
  const f = await getFonts();
  const { c, ctx } = canvas();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  drawCover(ctx, img, 0, 0, W, H);

  const top = ctx.createLinearGradient(0, 0, 0, 420);
  top.addColorStop(0, "rgba(0,0,0,0.6)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, 420);
  const bottom = ctx.createLinearGradient(0, H - 820, 0, H);
  bottom.addColorStop(0, "rgba(0,0,0,0)");
  bottom.addColorStop(1, "rgba(6,10,28,0.92)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, H - 820, W, 820);

  // Story-style progress segments.
  const gap = 10;
  const seg = (W - 120 - gap * (n - 1)) / n;
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = k <= i ? CREAM : "rgba(255,245,230,0.3)";
    ctx.beginPath();
    ctx.roundRect(60 + k * (seg + gap), 70, seg, 8, 4);
    ctx.fill();
  }

  // Year branding.
  ctx.textAlign = "left";
  pill(ctx, `✈  TRAVEL WRAPPED ${info.year}`, 60, 120, `800 34px ${f.sans}`, "rgba(6,10,28,0.55)", CREAM);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,245,230,0.85)";
  ctx.font = `700 38px ${f.sans}`;
  ctx.fillText(`${i + 1} / ${n}`, W - 60, 168);

  // Caption.
  ctx.textAlign = "left";
  ctx.fillStyle = SUN;
  ctx.font = `800 40px ${f.sans}`;
  ctx.letterSpacing = "8px";
  ctx.fillText(month(p.date), 70, H - 400);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = CREAM;
  fitFont(ctx, p.city, W - 140, 150, (px) => `800 ${px}px ${f.display}`);
  ctx.fillText(p.city, 66, H - 250);
  if (p.tripName && p.tripName !== p.city) {
    ctx.fillStyle = "rgba(255,245,230,0.85)";
    fitFont(ctx, p.tripName, W - 140, 60, (px) => `italic 400 ${px}px ${f.serif}`);
    ctx.fillText(p.tripName, 70, H - 165);
  }
  ctx.fillStyle = "rgba(255,245,230,0.5)";
  ctx.font = `700 28px ${f.sans}`;
  ctx.letterSpacing = "5px";
  ctx.fillText(brandHost().toUpperCase(), 70, H - 80);
  ctx.letterSpacing = "0px";
  return c;
}

async function outroScene(info: PhotoVideoInfo) {
  const f = await getFonts();
  const { c, ctx } = canvas();
  backdrop(ctx);
  ctx.textAlign = "center";
  ctx.fillStyle = CREAM;
  ctx.font = `italic 400 110px ${f.serif}`;
  ctx.fillText("That was", W / 2, 700);
  const grad = ctx.createLinearGradient(140, 0, 940, 0);
  grad.addColorStop(0, SUN);
  grad.addColorStop(0.5, SUNSET);
  grad.addColorStop(1, "#b9a3ff");
  ctx.fillStyle = grad;
  ctx.font = `800 280px ${f.display}`;
  ctx.fillText(String(info.year), W / 2, 960);
  ctx.fillStyle = CREAM;
  ctx.font = `800 64px ${f.display}`;
  ctx.fillText(`${plural(info.places, "place")}. ${plural(info.totalTrips, "trip")}.`, W / 2, 1140);
  ctx.fillStyle = "rgba(255,245,230,0.75)";
  ctx.font = `italic 400 66px ${f.serif}`;
  ctx.fillText("Countless memories. ✈️", W / 2, 1240);
  pill(ctx, "Make your Travel Wrapped", W / 2, 1560, `800 40px ${f.sans}`, SUNSET, "#fff", true);
  ctx.fillStyle = "rgba(255,245,230,0.5)";
  ctx.font = `700 32px ${f.sans}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(brandHost().toUpperCase(), W / 2, 1720);
  ctx.letterSpacing = "0px";
  return c;
}

/**
 * Builds every scene of the photo video. `collage` (a rendered collage card) is shown just before the
 * closing card when provided. Photos that fail to load are skipped.
 */
export async function buildPhotoScenes(opts: {
  info: PhotoVideoInfo;
  photos: GalleryPhoto[];
  collage: CanvasImageSource | null;
  onProgress?: (done: number, total: number) => void;
}): Promise<CanvasImageSource[]> {
  const { info } = opts;
  const loaded: { img: HTMLImageElement; p: GalleryPhoto }[] = [];
  for (let k = 0; k < opts.photos.length; k++) {
    opts.onProgress?.(k, opts.photos.length);
    const img = await loadImage(opts.photos[k].url);
    if (img) loaded.push({ img, p: opts.photos[k] });
  }
  if (!loaded.length) throw new Error("Couldn't load your photos. Check your connection and try again.");
  const scenes: CanvasImageSource[] = [await introScene(info, loaded.map((l) => l.img))];
  for (let k = 0; k < loaded.length; k++) scenes.push(await photoScene(loaded[k].img, loaded[k].p, k, loaded.length, info));
  if (opts.collage) scenes.push(opts.collage);
  scenes.push(await outroScene(info));
  return scenes;
}
