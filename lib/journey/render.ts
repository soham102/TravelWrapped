"use client";

/**
 * Draws any moment of a journey onto a portrait (9:16) canvas — deterministically, from the same
 * schedule the live player uses. Used to export MP4/WebM video and GIF frame by frame, so exports
 * are smooth regardless of device speed (no screen recording, no map tiles, no CORS-tainted canvas).
 *
 * The map is vector: India's state boundaries (the app's own GeoJSON) plus a faint graticule.
 */

import { geoGraticule10, geoMercator, geoPath } from "d3-geo";
import { INDIA_GEO } from "@/lib/geo/india";
import { brandHost, fmtNumber } from "@/lib/utils";
import { arcPoints, type Journey, monthYear } from "./build";
import { easeInOut, easeOut, frameAt, type Schedule } from "./schedule";

const NAVY = "#0b0514";
const NAVY2 = "#1c0f38";
const CREAM = "#faf7f3";
const SUNSET = "#ff3366";
const SUN = "#ffcc00";
const ELECTRIC = "#9557ff";

export interface Fonts {
  display: string;
  serif: string;
  sans: string;
}

type Pt = [number, number];
interface Cam {
  cx: number;
  cy: number;
  k: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createJourneyRenderer(opts: {
  journey: Journey;
  schedule: Schedule;
  width: number;
  height: number;
  fonts: Fonts;
  photos: Map<string, HTMLImageElement>;
}) {
  const { journey, schedule, width: W, height: H, fonts, photos } = opts;
  const u = W / 1080; // design unit: everything is laid out for 1080 wide
  const stops = journey.stops;

  // Base projection in arbitrary units; the camera maps it to the screen.
  const proj = geoMercator().fitExtent([[0, 0], [1000, 1000]], INDIA_GEO);
  const P = (lat: number, lng: number): Pt => (proj([lng, lat]) ?? [0, 0]) as Pt;
  const gen = geoPath(proj);
  const states = INDIA_GEO.features.map((f) => ({ name: f.properties.ST_NM, path: new Path2D(gen(f) ?? "") }));
  const graticule = new Path2D(gen(geoGraticule10()) ?? "");

  const stopPts = stops.map((s) => P(s.lat, s.lng));
  const legs = stops.slice(1).map((s, k) => (s.legKm != null && s.legKm < 1 ? null : arcPoints(stops[k], s, 48).map(([la, ln]) => P(la, ln))));

  // Screen regions (portrait).
  const mapArea = { x: 40 * u, y: 170 * u, w: W - 80 * u, h: H * 0.58 - 170 * u };
  const fullArea = { x: 40 * u, y: 170 * u, w: W - 80 * u, h: H * 0.62 };

  const box = (pts: Pt[], minSpan: number) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return { cx, cy, w: Math.max(minSpan, x1 - x0), h: Math.max(minSpan, y1 - y0) };
  };
  const camFor = (b: { cx: number; cy: number; w: number; h: number }, area: typeof mapArea, pad = 1.25): Cam => ({
    cx: b.cx,
    cy: b.cy,
    k: Math.min(area.w / (b.w * pad), area.h / (b.h * pad)),
  });
  const indiaBox = { cx: 500, cy: 500, w: 1000, h: 1000 };
  const overviewBox = stops.length
    ? (() => {
        const b = box(stopPts, 120);
        const inIndia = stops.every((s) => s.lat > 5 && s.lat < 38 && s.lng > 66 && s.lng < 99);
        return inIndia ? indiaBox : b;
      })()
    : indiaBox;

  // Camera target for each segment (where the camera wants to be by the end of its move).
  const targets: Cam[] = schedule.segments.map((seg) => {
    switch (seg.kind) {
      case "intro":
        return camFor(overviewBox, fullArea, 1.05);
      case "travel":
        return camFor(box([stopPts[seg.stop - 1], stopPts[seg.stop]], 90), mapArea, 1.5);
      case "reveal":
        return camFor(box([stopPts[seg.stop]], 110), mapArea, 1.4);
      default:
        return camFor(stops.length ? box(stopPts, 120) : indiaBox, fullArea, 1.35);
    }
  });
  const introStart: Cam = { ...targets[0], k: targets[0].k * 0.82 };
  const areaCenter = (i: number) => {
    const seg = schedule.segments[i];
    const a = seg.kind === "travel" || seg.kind === "reveal" ? mapArea : fullArea;
    return [a.x + a.w / 2, a.y + a.h / 2] as Pt;
  };

  function camera(t: number, segIndex: number) {
    const seg = schedule.segments[segIndex];
    const from = segIndex === 0 ? introStart : targets[segIndex - 1];
    const to = targets[segIndex];
    const dur = seg.end - seg.start;
    const move = seg.kind === "intro" ? dur : Math.min(1.4, dur * 0.6);
    const e = easeInOut(clamp01((t - seg.start) / move));
    const [fx, fy] = areaCenter(Math.max(0, segIndex - 1));
    const [tx, ty] = areaCenter(segIndex);
    return {
      cx: lerp(from.cx, to.cx, e),
      cy: lerp(from.cy, to.cy, e),
      k: Math.exp(lerp(Math.log(from.k), Math.log(to.k), e)),
      sx: lerp(fx, tx, e),
      sy: lerp(fy, ty, e),
    };
  }

  /* ───────── text helpers ───────── */
  const font = (weight: string, px: number, family: string) => `${weight} ${Math.round(px)}px ${family}`;
  function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, px: number, f: (px: number) => string) {
    let size = px;
    ctx.font = f(size);
    while (size > 12 && ctx.measureText(text).width > maxW) {
      size -= 2;
      ctx.font = f(size);
    }
    return size;
  }
  function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width > maxW && line) {
        lines.push(line);
        line = w;
        if (lines.length === maxLines) break;
      } else line = next;
    }
    if (lines.length < maxLines && line) lines.push(line);
    else if (lines.length === maxLines && line) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last.replace(/[\s,.;:]+$/, "") + "…";
    }
    return lines;
  }
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
  function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, bg: string, fg: string, align: "left" | "center" = "left") {
    ctx.font = font("700", px, fonts.sans);
    const w = ctx.measureText(text).width + px * 1.4;
    const h = px * 2;
    const left = align === "center" ? x - w / 2 : x;
    ctx.fillStyle = bg;
    roundRect(ctx, left, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, left + px * 0.7, y + h / 2 + 1);
    ctx.textBaseline = "alphabetic";
    return w;
  }
  function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.55 * alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = r * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ───────── frame ───────── */
  return function draw(ctx: CanvasRenderingContext2D, t: number) {
    const f = frameAt(schedule, t);
    const seg = f.seg;
    const segLocal = t - seg.start;
    const segDur = seg.end - seg.start;
    const cam = camera(t, f.segIndex);
    const S = (p: Pt): Pt => [(p[0] - cam.cx) * cam.k + cam.sx, (p[1] - cam.cy) * cam.k + cam.sy];

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // Backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, NAVY2);
    bg.addColorStop(1, NAVY);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const blob = (x: number, y: number, r: number, c: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    blob(W * 0.05, H * 0.2, 520 * u, "rgba(124,58,237,0.20)");
    blob(W * 0.95, H * 0.75, 560 * u, "rgba(255,51,102,0.16)");

    // Map (vector, base units → screen via the camera)
    ctx.save();
    ctx.setTransform(cam.k, 0, 0, cam.k, cam.sx - cam.cx * cam.k, cam.sy - cam.cy * cam.k);
    ctx.strokeStyle = "rgba(250,247,243,0.05)";
    ctx.lineWidth = 1 / cam.k;
    ctx.stroke(graticule);
    const visited = new Set(stops.slice(0, f.revealed).filter((s) => s.country === "India" && s.state).map((s) => s.state!));
    for (const s of states) {
      const v = visited.has(s.name);
      ctx.fillStyle = v ? "rgba(255,51,102,0.38)" : "#2a1650";
      ctx.fill(s.path);
      ctx.strokeStyle = v ? "#ff9ab3" : "#4b2d85";
      ctx.lineWidth = (v ? 1.6 : 1) * u / cam.k;
      ctx.stroke(s.path);
    }
    ctx.restore();

    // Routes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    let head: { p: Pt; angle: number } | null = null;
    legs.forEach((pts, k) => {
      if (!pts) return;
      const to = k + 1;
      let p: number;
      if (seg.kind === "travel" && seg.stop === to) p = easeInOut(f.p);
      else if (t >= schedule.revealAt[to]) p = 1;
      else return;
      const x = p * (pts.length - 1);
      const i = Math.floor(x);
      const sp = pts.slice(0, i + 1).map(S);
      if (p < 1) {
        const a = pts[i];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const hp = S([a[0] + (b[0] - a[0]) * (x - i), a[1] + (b[1] - a[1]) * (x - i)]);
        sp.push(hp);
        const sa = S(a), sb = S(b);
        head = { p: hp, angle: Math.atan2(sb[1] - sa[1], sb[0] - sa[0]) };
      }
      const path = () => {
        ctx.beginPath();
        sp.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      };
      path();
      ctx.strokeStyle = "rgba(255,51,102,0.25)";
      ctx.lineWidth = 14 * u;
      ctx.stroke();
      path();
      ctx.setLineDash([2 * u, 14 * u]);
      ctx.strokeStyle = SUN;
      ctx.lineWidth = 5 * u;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Markers (one per place)
    const seen = new Map<string, number>();
    const activeIdx = seg.kind === "reveal" ? seg.stop : -1;
    stops.slice(0, f.revealed).forEach((s, i) => seen.set(s.placeKey, i));
    const ending = seg.kind === "finale" || seg.kind === "outro";
    for (const [key, i] of seen) {
      const [x, y] = S(stopPts[i]);
      const isActive = activeIdx >= 0 && stops[activeIdx].placeKey === key;
      const age = t - schedule.revealAt[i];
      const pop = easeOut(clamp01(age / 0.5));
      if (isActive) {
        const ring = ((t - seg.start) % 1.6) / 1.6;
        ctx.strokeStyle = `rgba(255,92,133,${0.9 * (1 - ring)})`;
        ctx.lineWidth = 4 * u;
        ctx.beginPath();
        ctx.arc(x, y, (16 + 46 * ring) * u, 0, Math.PI * 2);
        ctx.stroke();
        glowDot(ctx, x, y, 17 * u * (0.6 + 0.4 * pop), SUNSET, pop);
      } else glowDot(ctx, x, y, 11 * u, SUN, ending ? 1 : 0.9);
      if ((ending && seen.size <= 12) || isActive) {
        ctx.font = font("700", 30 * u, fonts.sans);
        const label = stops[i].city;
        const tw = ctx.measureText(label).width;
        const lx = Math.min(W - tw - 60 * u, x + 26 * u);
        pill(ctx, label, lx, y - 24 * u, (isActive ? 30 : 24) * u, "rgba(28,15,56,0.88)", CREAM);
      }
    }

    // Travelling indicator
    if (head) {
      const { p, angle } = head as { p: Pt; angle: number };
      ctx.save();
      ctx.translate(p[0], p[1]);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 40 * u);
      g.addColorStop(0, "rgba(255,204,0,0.7)");
      g.addColorStop(1, "rgba(255,204,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 40 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(angle);
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.moveTo(20 * u, 0);
      ctx.lineTo(-14 * u, -12 * u);
      ctx.lineTo(-7 * u, 0);
      ctx.lineTo(-14 * u, 12 * u);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Header
    ctx.textAlign = "left";
    ctx.fillStyle = SUNSET;
    ctx.font = font("800", 30 * u, fonts.sans);
    ctx.fillText(`TRAVEL WRAPPED · ${journey.year}`, 60 * u, 96 * u);
    ctx.fillStyle = "rgba(250,247,243,0.7)";
    ctx.font = font("600", 30 * u, fonts.sans);
    ctx.fillText(`${journey.ownerName}'s travel journey`, 60 * u, 138 * u);
    if (journey.sample) pill(ctx, "SAMPLE DATA", W - 60 * u - 230 * u, 70 * u, 26 * u, SUN, NAVY);

    // Progress bar
    const prog = clamp01(t / schedule.duration);
    ctx.fillStyle = "rgba(250,247,243,0.12)";
    roundRect(ctx, 60 * u, H - 70 * u, W - 120 * u, 8 * u, 4 * u);
    ctx.fill();
    const pg = ctx.createLinearGradient(60 * u, 0, W - 60 * u, 0);
    pg.addColorStop(0, SUNSET);
    pg.addColorStop(1, ELECTRIC);
    ctx.fillStyle = pg;
    roundRect(ctx, 60 * u, H - 70 * u, Math.max(8 * u, (W - 120 * u) * prog), 8 * u, 4 * u);
    ctx.fill();

    const fadeIO = (inDur: number, outDur: number) => Math.min(clamp01(segLocal / inDur), clamp01((segDur - segLocal) / outDur));

    // Intro
    if (seg.kind === "intro") {
      const a = fadeIO(0.6, 0.5);
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.fillStyle = CREAM;
      const y = H * 0.74 + (1 - easeOut(clamp01(segLocal / 0.8))) * 30 * u;
      const line1 = `Your ${journey.year} journey`;
      fit(ctx, line1, W - 140 * u, 110 * u, (px) => font("italic 400", px, fonts.serif));
      ctx.fillText(line1, W / 2, y);
      ctx.fillStyle = SUN;
      ctx.font = font("italic 400", 110 * u, fonts.serif);
      ctx.fillText("begins…", W / 2, y + 120 * u);
      ctx.fillStyle = "rgba(250,247,243,0.65)";
      ctx.font = font("600", 32 * u, fonts.sans);
      ctx.fillText(`${stops.length} stops · ${journey.stats.trips} trips`, W / 2, y + 200 * u);
      ctx.globalAlpha = 1;
    }

    // En route chip
    if (seg.kind === "travel") {
      const a = fadeIO(0.3, 0.25);
      const from = stops[seg.stop - 1];
      const to = stops[seg.stop];
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(250,247,243,0.6)";
      ctx.font = font("700", 28 * u, fonts.sans);
      ctx.fillText("NEXT STOP", W / 2, H * 0.68);
      ctx.fillStyle = CREAM;
      const txt = `${from.city}  →  ${to.city}`;
      fit(ctx, txt, W - 140 * u, 72 * u, (px) => font("800", px, fonts.display));
      ctx.fillText(txt, W / 2, H * 0.68 + 90 * u);
      if (to.legKm && to.legKm >= 15) {
        ctx.fillStyle = SUN;
        ctx.font = font("600", 30 * u, fonts.sans);
        ctx.fillText(`≈ ${fmtNumber(to.legKm)} km as the crow flies`, W / 2, H * 0.68 + 150 * u);
      }
      ctx.globalAlpha = 1;
    }

    // Destination card
    if (seg.kind === "reveal") {
      const s = stops[seg.stop];
      const a = fadeIO(0.45, 0.3);
      const rise = (1 - easeOut(clamp01(segLocal / 0.6))) * 60 * u;
      const cx = 50 * u, cw = W - 100 * u;
      const ch = photos.has(s.id) ? H * 0.33 : s.caption ? H * 0.3 : H * 0.25;
      const cy = H * 0.6 + rise;
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(42,22,80,0.92)";
      roundRect(ctx, cx, cy, cw, ch, 44 * u);
      ctx.fill();
      ctx.strokeStyle = "rgba(250,247,243,0.12)";
      ctx.lineWidth = 2 * u;
      ctx.stroke();

      const img = photos.get(s.id);
      let tx = cx + 50 * u;
      let tw = cw - 100 * u;
      if (img) {
        const pw = cw * 0.4, ph = ch - 80 * u;
        ctx.save();
        roundRect(ctx, cx + 40 * u, cy + 40 * u, pw, ph, 28 * u);
        ctx.clip();
        const sc = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * (1.04 + 0.04 * clamp01(segLocal / segDur));
        const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
        ctx.drawImage(img, cx + 40 * u + (pw - dw) / 2, cy + 40 * u + (ph - dh) * 0.4, dw, dh);
        ctx.restore();
        tx = cx + 80 * u + pw;
        tw = cw - pw - 120 * u;
      }
      ctx.textAlign = "left";
      ctx.fillStyle = SUNSET;
      ctx.font = font("800", 26 * u, fonts.sans);
      const eyebrow = `STOP ${seg.stop + 1} OF ${stops.length}${s.visit > 1 ? ` · VISIT #${s.visit}` : ""}`;
      ctx.fillText(eyebrow, tx, cy + 92 * u);
      ctx.fillStyle = CREAM;
      const city = s.city.toUpperCase();
      const size = fit(ctx, city, tw, img ? 92 * u : 120 * u, (px) => font("800", px, fonts.display));
      ctx.fillText(city, tx, cy + 92 * u + size * 1.02);
      let y = cy + 92 * u + size * 1.02 + 56 * u;
      ctx.fillStyle = "rgba(250,247,243,0.7)";
      ctx.font = font("600", 32 * u, fonts.sans);
      const where = [s.state, s.country !== "India" || !s.state ? s.country : null].filter(Boolean).join(", ");
      if (where) {
        ctx.fillText(wrap(ctx, where, tw, 1)[0], tx, y);
        y += 54 * u;
      }
      ctx.fillStyle = SUN;
      ctx.font = font("italic 400", 54 * u, fonts.serif);
      ctx.fillText(monthYear(s.date), tx, y);
      y += 58 * u;
      const caption = s.caption;
      if (caption) {
        ctx.fillStyle = "rgba(250,247,243,0.85)";
        ctx.font = font("italic 400", 38 * u, fonts.serif);
        for (const line of wrap(ctx, `“${caption}”`, tw, img ? 3 : 2)) {
          if (y > cy + ch - 40 * u) break;
          ctx.fillText(line, tx, y);
          y += 44 * u;
        }
      } else if (s.tripName && y < cy + ch - 50 * u) {
        ctx.fillStyle = "rgba(250,247,243,0.55)";
        ctx.font = font("600", 28 * u, fonts.sans);
        ctx.fillText(wrap(ctx, `${s.tripName}${s.stopsInTrip > 1 ? ` · stop ${s.stopInTrip} of ${s.stopsInTrip}` : ""}`, tw, 1)[0], tx, y);
      }
      ctx.globalAlpha = 1;
    }

    // Finale: the year in numbers
    if (seg.kind === "finale" || seg.kind === "outro") {
      const fin = schedule.segments.find((x) => x.kind === "finale")!;
      const fl = t - fin.start;
      // Stats fade in during the finale and make way for the closing words in the outro.
      const a = seg.kind === "finale" ? clamp01(fl / 0.6) : 1 - clamp01((t - seg.start) / 0.5);
      if (a > 0) {
        ctx.globalAlpha = a;
        ctx.textAlign = "center";
        ctx.fillStyle = CREAM;
        const title = `AND THAT WAS YOUR ${journey.year}!`;
        fit(ctx, title, W - 120 * u, 84 * u, (px) => font("800", px, fonts.display));
        ctx.fillText(title, W / 2, H * 0.66);
        const st = journey.stats;
        const items: [string, string][] = [
          [String(st.stops), st.stops === 1 ? "stop" : "stops"],
          [String(st.places), st.places === 1 ? "place" : "places"],
          [String(st.states), st.states === 1 ? "state" : "states"],
          [String(st.trips), st.trips === 1 ? "trip" : "trips"],
        ];
        if (st.countries.length > 1) items.push([String(st.countries.length), "countries"]);
        if (st.km != null) items.push([fmtNumber(st.km), "km logged"]);
        const cols = items.length > 4 ? 3 : 4;
        const cellW = (W - 120 * u) / cols;
        items.forEach(([v, l], i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = 60 * u + cellW * col + cellW / 2;
          const y = H * 0.66 + 150 * u + row * 190 * u;
          const appear = easeOut(clamp01((fl - 0.3 - i * 0.15) / 0.5));
          ctx.globalAlpha = a * appear;
          ctx.fillStyle = [SUNSET, SUN, "#a3e4e1", ELECTRIC, CREAM, SUNSET][i % 6];
          ctx.font = font("800", 96 * u, fonts.display);
          const num = /^\d+$/.test(v) ? String(Math.round(Number(v) * appear)) : v;
          ctx.fillText(num, x, y + (1 - appear) * 30 * u);
          ctx.fillStyle = "rgba(250,247,243,0.7)";
          ctx.font = font("700", 26 * u, fonts.sans);
          ctx.fillText(l.toUpperCase(), x, y + 46 * u);
        });
        ctx.globalAlpha = 1;
      }
    }

    // Outro: closing words
    if (seg.kind === "outro") {
      const a = easeOut(clamp01((t - seg.start - 0.3) / 0.8));
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(11,5,20,0.55)";
      ctx.fillRect(0, H * 0.58, W, H * 0.42);
      ctx.textAlign = "center";
      ctx.fillStyle = CREAM;
      ctx.font = font("italic 400", 76 * u, fonts.serif);
      ctx.fillText("Every destination", W / 2, H * 0.69);
      ctx.fillText("became a memory.", W / 2, H * 0.69 + 86 * u);
      ctx.fillStyle = SUN;
      ctx.fillText("Every journey", W / 2, H * 0.69 + 200 * u);
      ctx.fillText("became a story.", W / 2, H * 0.69 + 286 * u);
      ctx.fillStyle = "rgba(250,247,243,0.55)";
      ctx.font = font("700", 28 * u, fonts.sans);
      ctx.fillText(brandHost(), W / 2, H - 110 * u);
      ctx.globalAlpha = 1;
    }

    // Fade in from / out to black
    const edge = Math.max(0, 1 - t / 0.4, 1 - (schedule.duration - t) / 0.6);
    if (edge > 0) {
      ctx.fillStyle = `rgba(11,5,20,${Math.min(1, edge)})`;
      ctx.fillRect(0, 0, W, H);
    }
  };
}
