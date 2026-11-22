"use client";

import "leaflet/dist/leaflet.css";
import {
  divIcon,
  geoJSON,
  latLng,
  latLngBounds,
  type LatLngBoundsExpression,
  type LatLngExpression,
  marker as leafletMarker,
  type Marker,
  polyline,
} from "leaflet";
import * as React from "react";
import { TileLayer, useMap } from "react-leaflet";
import { StableMapContainer, TILE_ATTRIBUTION, TILE_URL } from "@/components/map/india-map-leaflet";
import type { Journey } from "@/lib/journey/build";
import { arcPoints, journeyBounds } from "@/lib/journey/build";
import { type JourneyClock, useClockState } from "@/lib/journey/clock";
import { easeInOut, type Schedule } from "@/lib/journey/schedule";
import { INDIA_GEO } from "@/lib/geo/india";

/** Screen space (px) covered by overlays — the camera keeps the action inside what's left. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const INDIA: [[number, number], [number, number]] = [[7.5, 68.5], [35.5, 97]];
const REVEAL_ZOOM = 6;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function AnimatedTravelMap({
  journey,
  schedule,
  clock,
  insets,
}: {
  journey: Journey;
  schedule: Schedule;
  clock: JourneyClock;
  insets: Insets;
}) {
  return (
    <StableMapContainer
      center={[22.8, 80.5]}
      zoom={4}
      zoomSnap={0.1}
      minZoom={2}
      maxZoom={9}
      zoomControl={false}
      worldCopyJump
      className="h-full w-full"
      attributionControl
    >
      {/* Capped zoom + no tile loading mid-flight keeps tile requests modest on mobile data. */}
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxNativeZoom={16} updateWhenZooming={false} updateWhenIdle keepBuffer={2} />
      <StatesLayer journey={journey} clock={clock} />
      <RouteLayer journey={journey} schedule={schedule} clock={clock} />
      <MarkerLayer journey={journey} clock={clock} />
      <Camera journey={journey} schedule={schedule} clock={clock} insets={insets} />
    </StableMapContainer>
  );
}

/* ───────────── visited states light up as the journey reaches them ───────────── */

function StatesLayer({ journey, clock }: { journey: Journey; clock: JourneyClock }) {
  const map = useMap();
  const { revealed } = useClockState(clock);
  const layer = React.useRef<ReturnType<typeof geoJSON> | null>(null);

  React.useEffect(() => {
    const l = geoJSON(INDIA_GEO, { interactive: false, style: { color: "#6e56a8", weight: 0.7, fillColor: "#2a1650", fillOpacity: 0.12 } }).addTo(map);
    layer.current = l;
    return () => {
      l.remove();
      layer.current = null;
    };
  }, [map]);

  React.useEffect(() => {
    const visited = new Set(journey.stops.slice(0, revealed).filter((s) => s.country === "India" && s.state).map((s) => s.state!));
    layer.current?.setStyle((f) => {
      const v = visited.has((f?.properties as { ST_NM?: string } | undefined)?.ST_NM ?? "");
      return v
        ? { color: "#ff9ab3", weight: 1.2, fillColor: "#ff3366", fillOpacity: 0.32 }
        : { color: "#6e56a8", weight: 0.7, fillColor: "#2a1650", fillOpacity: 0.12 };
    });
  }, [journey.stops, revealed]);

  return null;
}

/* ───────────── routes: drawn progressively, with a travelling indicator ───────────── */

const PLANE_SVG =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="#faf7f3" stroke="#1c0f38" stroke-width="1"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';

function RouteLayer({ journey, schedule, clock }: { journey: Journey; schedule: Schedule; clock: JourneyClock }) {
  const map = useMap();

  React.useEffect(() => {
    const stops = journey.stops;
    // legs[k] connects stop k → stop k+1 (null when both are the same spot).
    const legs = stops.slice(1).map((s, k) => (s.legKm != null && s.legKm < 1 ? null : arcPoints(stops[k], s)));
    const glow = legs.map(() => polyline([], { color: "#ff3366", weight: 8, opacity: 0.22, lineCap: "round", interactive: false }).addTo(map));
    const line = legs.map(() => polyline([], { color: "#ffcc00", weight: 2.6, opacity: 0.95, dashArray: "1 8", lineCap: "round", interactive: false }).addTo(map));
    const plane = leafletMarker([0, 0], {
      icon: divIcon({ className: "jr-icon", html: `<div class="jr-plane">${PLANE_SVG}</div>`, iconSize: [0, 0] }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 2000,
    });
    // How far each leg is currently drawn: -1 = empty, 2 = complete, (0..1) = in progress.
    const drawn = legs.map(() => -1);
    let planeOn = false;

    const off = clock.onTick((_t, f) => {
      let flying: { leg: number; p: number } | null = null;
      for (let k = 0; k < legs.length; k++) {
        const pts = legs[k];
        if (!pts) continue;
        const to = k + 1;
        let p: number;
        if (f.seg.kind === "travel" && f.seg.stop === to) p = easeInOut(f.p);
        else p = clock.time >= schedule.revealAt[to] ? 2 : -1;
        if (p === drawn[k] && (p === 2 || p === -1)) continue;
        drawn[k] = p;
        if (p === -1) {
          glow[k].setLatLngs([]);
          line[k].setLatLngs([]);
        } else if (p === 2) {
          glow[k].setLatLngs(pts);
          line[k].setLatLngs(pts);
        } else {
          const x = p * (pts.length - 1);
          const i = Math.floor(x);
          const a = pts[i];
          const b = pts[Math.min(pts.length - 1, i + 1)];
          const head: [number, number] = [a[0] + (b[0] - a[0]) * (x - i), a[1] + (b[1] - a[1]) * (x - i)];
          const partial = [...pts.slice(0, i + 1), head];
          glow[k].setLatLngs(partial);
          line[k].setLatLngs(partial);
          flying = { leg: k, p };
        }
      }

      if (flying) {
        const pts = legs[flying.leg]!;
        const x = flying.p * (pts.length - 1);
        const i = Math.min(pts.length - 2, Math.floor(x));
        const a = pts[i];
        const b = pts[i + 1];
        const pos = latLng(a[0] + (b[0] - a[0]) * (x - i), a[1] + (b[1] - a[1]) * (x - i));
        plane.setLatLng(pos);
        if (!planeOn) {
          plane.addTo(map);
          planeOn = true;
        }
        const pa = map.latLngToContainerPoint(a);
        const pb = map.latLngToContainerPoint(b);
        const deg = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI + 90;
        const el = plane.getElement()?.firstElementChild as HTMLElement | null;
        if (el) el.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
      } else if (planeOn) {
        plane.remove();
        planeOn = false;
      }
    });

    return () => {
      off();
      glow.forEach((l) => l.remove());
      line.forEach((l) => l.remove());
      plane.remove();
    };
  }, [map, journey, schedule, clock]);

  return null;
}

/* ───────────── destination markers (one per place; revisits show a count) ───────────── */

function MarkerLayer({ journey, clock }: { journey: Journey; clock: JourneyClock }) {
  const map = useMap();
  const st = useClockState(clock);
  const markers = React.useRef(new Map<string, { m: Marker; first: number }>());

  React.useEffect(() => {
    const all = markers.current;
    return () => {
      all.forEach(({ m }) => m.remove());
      all.clear();
    };
  }, [map]);

  React.useEffect(() => {
    const all = markers.current;
    const seg = clock.schedule.segments[st.segIndex];
    const shown = journey.stops.slice(0, st.revealed);
    const counts = new Map<string, number>();
    shown.forEach((s) => counts.set(s.placeKey, (counts.get(s.placeKey) ?? 0) + 1));
    const ending = seg.kind === "finale" || seg.kind === "outro";
    const activeKey = seg.kind === "reveal" ? journey.stops[st.stop]?.placeKey : null;
    // During travel, the stop we left stays softly highlighted.
    const leftKey = seg.kind === "travel" ? journey.stops[st.stop - 1]?.placeKey : null;
    const labelAll = ending && counts.size <= 14;

    for (const [key, { m }] of all) {
      if (!counts.has(key)) {
        m.remove();
        all.delete(key);
      }
    }
    shown.forEach((s, i) => {
      let entry = all.get(s.placeKey);
      if (!entry) {
        const m = leafletMarker([s.lat, s.lng], {
          icon: divIcon({
            className: "jr-icon",
            iconSize: [0, 0],
            html: `<div class="jr-marker jr-pop"><span class="jr-ring"></span><span class="jr-dot"></span><span class="jr-count"></span><span class="jr-label">${esc(s.city)}</span></div>`,
          }),
          keyboard: false,
          title: s.city,
          riseOnHover: true,
        });
        const first = i;
        m.on("click", () => clock.goToStop(first));
        m.addTo(map);
        entry = { m, first };
        all.set(s.placeKey, entry);
      }
    });
    for (const [key, { m }] of all) {
      const el = m.getElement()?.firstElementChild as HTMLElement | null;
      if (!el) continue;
      const active = key === activeKey;
      el.classList.toggle("is-active", active);
      el.classList.toggle("is-origin", key === leftKey);
      el.classList.toggle("is-visited", !active);
      el.classList.toggle("show-label", labelAll || key === leftKey);
      const n = counts.get(key) ?? 1;
      const badge = el.querySelector(".jr-count") as HTMLElement | null;
      if (badge) {
        badge.textContent = n > 1 ? `×${n}` : "";
        badge.style.display = n > 1 ? "" : "none";
      }
      m.setZIndexOffset(active ? 1000 : 0);
    }
  }, [map, journey, clock, st.segIndex, st.revealed, st.stop]);

  return null;
}

/* ───────────── camera ───────────── */

function boundsOf(points: { lat: number; lng: number }[]) {
  return latLngBounds(journeyBounds(points));
}

function Camera({ journey, schedule, clock, insets }: { journey: Journey; schedule: Schedule; clock: JourneyClock; insets: Insets }) {
  const map = useMap();
  const st = useClockState(clock);
  const insetsRef = React.useRef(insets);
  React.useEffect(() => {
    insetsRef.current = insets;
  }, [insets]);

  const overview = React.useMemo((): LatLngBoundsExpression => {
    if (!journey.stops.length) return INDIA;
    const b = boundsOf(journey.stops);
    const inIndia = journey.stops.every((s) => s.lat > 5 && s.lat < 38 && s.lng > 66 && s.lng < 99);
    return inIndia ? b.extend(INDIA[0]).extend(INDIA[1]) : b;
  }, [journey.stops]);

  const fly = React.useCallback(
    (target: { bounds: LatLngBoundsExpression; maxZoom?: number } | { point: LatLngExpression; zoom: number }, seconds: number, override?: Partial<Insets>) => {
      const i = { ...insetsRef.current, ...override };
      const instant = reducedMotion() || seconds <= 0.05;
      const opts = { duration: Math.max(0.25, seconds), easeLinearity: 0.2 };
      if ("bounds" in target) {
        const o = { paddingTopLeft: [i.left + 36, i.top + 36] as [number, number], paddingBottomRight: [i.right + 36, i.bottom + 36] as [number, number], maxZoom: target.maxZoom ?? REVEAL_ZOOM };
        if (instant) map.fitBounds(target.bounds, { ...o, animate: false });
        else map.flyToBounds(target.bounds, { ...o, ...opts });
        return;
      }
      // Put the point in the centre of the free area, not of the whole screen.
      const dx = (i.left - i.right) / 2;
      const dy = (i.top - i.bottom) / 2;
      const center = map.unproject(map.project(target.point, target.zoom).subtract([dx, dy]), target.zoom);
      if (instant) map.setView(center, target.zoom, { animate: false });
      else map.flyTo(center, target.zoom, opts);
    },
    [map],
  );

  // Initial framing: a little wider than the journey, ready for the intro's slow push-in.
  const framed = React.useRef(false);
  React.useEffect(() => {
    if (framed.current) return;
    framed.current = true;
    map.fitBounds(overview, { animate: false, padding: [20, 20] });
    map.setZoom(map.getZoom() - 0.8, { animate: false });
  }, [map, overview]);

  React.useEffect(() => {
    const seg = schedule.segments[st.segIndex];
    const speed = st.speed;
    const segSecs = (seg.end - seg.start) / speed;
    const stops = journey.stops;
    switch (seg.kind) {
      case "intro":
        fly({ bounds: overview, maxZoom: 5.5 }, segSecs * 0.9);
        break;
      case "travel": {
        const a = stops[seg.stop - 1];
        const b = stops[seg.stop];
        fly({ bounds: boundsOf([a, b]), maxZoom: REVEAL_ZOOM }, Math.min(1.4, segSecs * 0.5));
        break;
      }
      case "reveal": {
        const s = stops[seg.stop];
        fly({ point: [s.lat, s.lng], zoom: REVEAL_ZOOM }, Math.min(1.3, segSecs * 0.4));
        break;
      }
      case "finale":
      case "outro":
        // On phones the summary covers the lower part of the screen; frame the whole route above it.
        fly(
          { bounds: stops.length ? boundsOf(stops) : overview, maxZoom: 6 },
          Math.min(2, segSecs * 0.5),
          insetsRef.current.left === 0 ? { top: 64, bottom: Math.round(map.getSize().y * 0.66) } : undefined,
        );
        break;
    }
    // st.seekId/insets: re-frame after a jump or when the overlay layout changes (rotation, resize).
  }, [st.segIndex, st.seekId, st.speed, schedule, journey.stops, overview, fly, map, insets]);

  return null;
}

