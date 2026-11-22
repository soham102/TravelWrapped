"use client";

import { geoMercator, geoPath } from "d3-geo";
import { motion } from "framer-motion";
import * as React from "react";
import { INDIA_GEO } from "@/lib/geo/india";
import { cn } from "@/lib/utils";

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  /** Group index (e.g. trip number) — decides marker colour */
  group?: number;
  sub?: string;
}

export interface MapTheme {
  land: string;
  stroke: string;
  visited: string;
  visitedStroke: string;
  marker: string[];
  label: string;
  labelHalo: string;
  route: string;
}

export const MAP_THEMES = {
  night: {
    land: "#1b2350",
    stroke: "#2f3a78",
    visited: "#ff6a3d",
    visitedStroke: "#ffb38a",
    marker: ["#ffc93c", "#7ee0c1", "#b9a3ff", "#fff5e6", "#ff8a5b"],
    label: "#fff5e6",
    labelHalo: "#0b1026",
    route: "rgba(255,245,230,0.55)",
  },
  cream: {
    land: "#f6e7cf",
    stroke: "#e2cba6",
    visited: "#7b4dff",
    visitedStroke: "#b9a3ff",
    marker: ["#ff6a3d", "#17b890", "#0b1026", "#e9502a", "#6232f0"],
    label: "#1a1530",
    labelHalo: "#fff5e6",
    route: "rgba(11,16,38,0.45)",
  },
  sunset: {
    land: "rgba(255,255,255,0.18)",
    stroke: "rgba(255,255,255,0.35)",
    visited: "#0b1026",
    visitedStroke: "#fff5e6",
    marker: ["#ffc93c", "#fff5e6", "#7ee0c1", "#b9a3ff"],
    label: "#fff5e6",
    labelHalo: "#e9502a",
    route: "rgba(255,245,230,0.7)",
  },
  electric: {
    land: "rgba(255,255,255,0.12)",
    stroke: "rgba(255,255,255,0.28)",
    visited: "#ffc93c",
    visitedStroke: "#fff5e6",
    marker: ["#ff6a3d", "#fff5e6", "#7ee0c1"],
    label: "#fff5e6",
    labelHalo: "#4a2bc4",
    route: "rgba(255,245,230,0.6)",
  },
} satisfies Record<string, MapTheme>;

export type MapThemeName = keyof typeof MAP_THEMES;

const INDIA_BOUNDS = { minLat: 5.5, maxLat: 37.5, minLng: 67.5, maxLng: 98 };
export const inIndiaBounds = (p: { lat: number; lng: number }) =>
  p.lat >= INDIA_BOUNDS.minLat && p.lat <= INDIA_BOUNDS.maxLat && p.lng >= INDIA_BOUNDS.minLng && p.lng <= INDIA_BOUNDS.maxLng;

export function IndiaMapSvg({
  width = 400,
  height = 460,
  visitedStates = [],
  points = [],
  theme = "night",
  interactive = false,
  animate = false,
  labels = 0,
  routes = false,
  markerSize = 1,
  className,
  padding = 8,
}: {
  width?: number;
  height?: number;
  visitedStates?: string[];
  points?: MapPoint[];
  theme?: MapThemeName | MapTheme;
  interactive?: boolean;
  animate?: boolean;
  /** Number of point labels to render permanently (first N). */
  labels?: number;
  /** Draw connecting arcs between consecutive points of the same group. */
  routes?: boolean;
  markerSize?: number;
  className?: string;
  padding?: number;
}) {
  const t: MapTheme = typeof theme === "string" ? MAP_THEMES[theme] : theme;
  const [hover, setHover] = React.useState<{ x: number; y: number; title: string; sub?: string } | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const { paths, project } = React.useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [padding, padding],
        [width - padding, height - padding],
      ],
      INDIA_GEO,
    );
    const gen = geoPath(projection);
    return {
      paths: INDIA_GEO.features.map((f) => ({ name: f.properties.ST_NM, d: gen(f) ?? "" })),
      // Rounded so server (Node) and browser Math produce identical attributes — avoids hydration mismatches.
      project: (lng: number, lat: number): [number, number] => {
        const [x, y] = projection([lng, lat]) ?? [0, 0];
        return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
      },
    };
  }, [width, height, padding]);

  const visited = React.useMemo(() => new Set(visitedStates), [visitedStates]);
  const pts = React.useMemo(
    () =>
      points.filter(inIndiaBounds).map((p) => {
        const [x, y] = project(p.lng, p.lat);
        return { ...p, x, y };
      }),
    [points, project],
  );

  const arcs = React.useMemo(() => {
    if (!routes) return [];
    const out: string[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (a.group !== b.group) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const bend = 0.25;
      out.push(`M${a.x},${a.y} Q${mx - dy * bend},${my + dx * bend} ${b.x},${b.y}`);
    }
    return out;
  }, [pts, routes]);

  const r = Math.max(2.5, Math.min(width, height) / 90) * markerSize;
  const fontSize = Math.max(9, width / 34);

  // Greedy collision avoidance: skip a label if it would sit on top of one already placed.
  const labelPts = React.useMemo(() => {
    const placed: { x: number; y: number }[] = [];
    const out: typeof pts = [];
    for (const p of pts) {
      if (out.length >= labels) break;
      if (placed.some((q) => Math.abs(q.y - p.y) < fontSize * 1.1 && Math.abs(q.x - p.x) < fontSize * 4)) continue;
      placed.push(p);
      out.push(p);
    }
    return out;
  }, [pts, labels, fontSize]);

  const showTip = (e: React.MouseEvent, title: string, sub?: string) => {
    if (!interactive || !wrapRef.current) return;
    const box = wrapRef.current.getBoundingClientRect();
    setHover({ x: e.clientX - box.left, y: e.clientY - box.top, title, sub });
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={`Map of India with ${visited.size} states and ${pts.length} destinations highlighted`}
        onMouseLeave={() => setHover(null)}
      >
        <g>
          {paths.map((p, i) => {
            const isVisited = visited.has(p.name);
            const common = {
              d: p.d,
              fill: isVisited ? t.visited : t.land,
              stroke: isVisited ? t.visitedStroke : t.stroke,
              strokeWidth: isVisited ? 0.9 : 0.6,
              strokeLinejoin: "round" as const,
              onMouseMove: (e: React.MouseEvent) =>
                showTip(e, p.name, isVisited ? "Visited ✓" : "Not yet explored"),
              style: interactive ? { cursor: "pointer" } : undefined,
            };
            return animate ? (
              <motion.path
                key={p.name}
                {...common}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: isVisited ? 0.4 + i * 0.015 : i * 0.008, duration: 0.5 }}
              />
            ) : (
              <path key={p.name} {...common} />
            );
          })}
        </g>

        {arcs.map((d, i) =>
          animate ? (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke={t.route}
              strokeWidth={1.4}
              strokeDasharray="3 3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.9 + i * 0.15, duration: 0.8 }}
            />
          ) : (
            <path key={i} d={d} fill="none" stroke={t.route} strokeWidth={1.4} strokeDasharray="3 3" />
          ),
        )}

        {pts.map((p, i) => {
          const color = t.marker[(p.group ?? i) % t.marker.length];
          const marker = (
            <g
              onMouseMove={(e) => showTip(e, p.label, p.sub)}
              style={interactive ? { cursor: "pointer" } : undefined}
            >
              <circle cx={p.x} cy={p.y} r={r * 2.2} fill={color} opacity={0.22} />
              <circle cx={p.x} cy={p.y} r={r} fill={color} stroke={t.labelHalo} strokeWidth={r * 0.45} />
            </g>
          );
          return animate ? (
            <motion.g
              key={`${p.label}-${i}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.08, type: "spring", stiffness: 260, damping: 14 }}
            >
              {marker}
            </motion.g>
          ) : (
            <g key={`${p.label}-${i}`}>{marker}</g>
          );
        })}

        {labelPts.map((p, i) => {
          const left = p.x > width * 0.62;
          return (
            <text
              key={`l-${p.label}-${i}`}
              x={p.x + (left ? -r * 1.8 : r * 1.8)}
              y={p.y + r * 0.9}
              textAnchor={left ? "end" : "start"}
              fontSize={fontSize}
              fontWeight={700}
              fill={t.label}
              stroke={t.labelHalo}
              strokeWidth={3}
              paintOrder="stroke"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {p.label}
            </text>
          );
        })}
      </svg>

      {interactive && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[120%] whitespace-nowrap rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-cream-100 shadow-xl"
          style={{ left: hover.x, top: hover.y }}
        >
          {hover.title}
          {hover.sub && <span className="ml-1.5 font-normal text-cream-200/70">{hover.sub}</span>}
        </div>
      )}
    </div>
  );
}
