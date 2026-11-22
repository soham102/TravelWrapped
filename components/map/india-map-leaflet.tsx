"use client";

import "leaflet/dist/leaflet.css";
import { createLeafletContext, LeafletContext, type LeafletContextInterface } from "@react-leaflet/core";
import { type LatLngExpression, Map as LeafletMap, type MapOptions, type PathOptions } from "leaflet";
import * as React from "react";
import { CircleMarker, GeoJSON, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";
import { INDIA_GEO } from "@/lib/geo/india";
import type { Trip } from "@/lib/types";
import { fmtRange } from "@/lib/utils";

import { TRIP_COLORS } from "@/lib/colors";

/**
 * Drop-in replacement for react-leaflet's <MapContainer>.
 *
 * MapContainer calls `map.remove()` whenever its effect is cleaned up but keeps handing the destroyed
 * map to its children. React 19 dev StrictMode and Next's <Activity>-preserved routes clean up and
 * re-run effects without unmounting, so layers then try to attach to a dead map
 * ("Cannot read properties of undefined (reading 'appendChild')").
 *
 * Here removal is deferred a tick and cancelled if the effect re-runs immediately (StrictMode).
 * If it really is torn down (unmount or hidden route), the context is cleared so children unmount
 * first and a fresh map is created when the component comes back.
 */
function StableMapContainer({
  center,
  zoom,
  className,
  children,
  ...options
}: MapOptions & { center: LatLngExpression; zoom: number; className?: string; children: React.ReactNode }) {
  const divRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const removeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const initial = React.useRef({ center, zoom, options });
  const [context, setContext] = React.useState<LeafletContextInterface | null>(null);

  React.useEffect(() => {
    if (removeTimer.current) {
      clearTimeout(removeTimer.current);
      removeTimer.current = null;
    }
    if (!mapRef.current && divRef.current) {
      const { center, zoom, options } = initial.current;
      const map = new LeafletMap(divRef.current, options);
      map.setView(center, zoom);
      mapRef.current = map;
      setContext(createLeafletContext(map));
    }
    return () => {
      removeTimer.current = setTimeout(() => {
        removeTimer.current = null;
        mapRef.current?.remove();
        mapRef.current = null;
        setContext(null);
      }, 0);
    };
  }, []);

  return (
    <div ref={divRef} className={className}>
      {context && <LeafletContext value={context}>{children}</LeafletContext>}
    </div>
  );
}

export default function IndiaLeafletMap({ trips, visitedStates }: { trips: Trip[]; visitedStates: string[] }) {
  const visited = React.useMemo(() => new Set(visitedStates), [visitedStates]);
  const geoKey = visitedStates.join("|"); // remount GeoJSON when highlight set changes

  const style = (feature?: { properties?: { ST_NM?: string } }): PathOptions => {
    const v = visited.has(feature?.properties?.ST_NM ?? "");
    return {
      color: v ? "#ffb38a" : "#4a5590",
      weight: v ? 1.4 : 0.7,
      fillColor: v ? "#ff6a3d" : "#1b2350",
      fillOpacity: v ? 0.45 : 0.15,
    };
  };

  return (
    <StableMapContainer
      center={[22.8, 80.5]}
      zoom={4.6}
      zoomSnap={0.2}
      minZoom={3}
      maxZoom={12}
      maxBounds={[[-15, 40], [50, 120]]}
      scrollWheelZoom
      className="h-full w-full"
      attributionControl
    >
      {/* Keyless Esri dark-gray basemap by default; override with NEXT_PUBLIC_MAP_TILES_URL (+ _ATTRIBUTION). */}
      <TileLayer
        attribution={process.env.NEXT_PUBLIC_MAP_TILES_ATTRIBUTION || "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"}
        url={process.env.NEXT_PUBLIC_MAP_TILES_URL || "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"}
        maxNativeZoom={16}
      />
      <GeoJSON
        key={geoKey}
        data={INDIA_GEO}
        style={style}
        onEachFeature={(f, layer) => {
          const name = (f.properties as { ST_NM: string }).ST_NM;
          layer.bindTooltip(`${name}${visited.has(name) ? " · visited ✓" : ""}`, { sticky: true, className: "tw-tooltip" });
        }}
      />
      {trips.map((t, ti) => {
        const color = TRIP_COLORS[ti % TRIP_COLORS.length];
        const coords = t.destinations.filter((d) => d.latitude != null && d.longitude != null);
        return (
          <React.Fragment key={t.id}>
            {coords.length > 1 && (
              <Polyline positions={coords.map((d) => [d.latitude!, d.longitude!])} pathOptions={{ color, weight: 2, dashArray: "4 6", opacity: 0.8 }} />
            )}
            {coords.map((d, i) => (
              <CircleMarker
                key={d.id}
                center={[d.latitude!, d.longitude!]}
                radius={8}
                pathOptions={{ color: "#0b1026", weight: 2.5, fillColor: color, fillOpacity: 1 }}
              >
                <Tooltip direction="top" offset={[0, -8]} className="tw-tooltip">
                  {d.city}
                </Tooltip>
                <Popup>
                  <div style={{ fontFamily: "var(--font-sans)" }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{d.city}</p>
                    <p style={{ margin: "2px 0 0", color: "#6b6580" }}>{[d.state, d.country].filter(Boolean).join(", ")}</p>
                    <p style={{ margin: "6px 0 0", fontWeight: 600 }}>
                      {t.trip_name} · stop {i + 1}/{coords.length}
                    </p>
                    <p style={{ margin: 0, color: "#6b6580" }}>{fmtRange(t.start_date, t.end_date)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </React.Fragment>
        );
      })}
    </StableMapContainer>
  );
}
