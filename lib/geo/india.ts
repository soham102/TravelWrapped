import { geoContains } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import raw from "./india-states.json";

/**
 * India state & UT boundaries (36 features, property ST_NM), derived from the
 * Survey-of-India-aligned DataMeet boundaries and simplified with mapshaper.
 */
export type StateFeature = Feature<Geometry, { ST_NM: string }>;
export const INDIA_GEO = raw as unknown as FeatureCollection<Geometry, { ST_NM: string }>;

export const STATE_NAMES: string[] = INDIA_GEO.features.map((f) => f.properties.ST_NM).sort();

const ALIASES: Record<string, string> = {
  "jammu and kashmir": "Jammu & Kashmir",
  "andaman and nicobar islands": "Andaman & Nicobar",
  "andaman and nicobar": "Andaman & Nicobar",
  "national capital territory of delhi": "Delhi",
  "nct of delhi": "Delhi",
  "new delhi": "Delhi",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  uttaranchal: "Uttarakhand",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
};

/** Map any reasonable spelling of a state/UT to the canonical GeoJSON name (or null). */
export function normalizeState(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = name.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
  if (ALIASES[n]) return ALIASES[n];
  const hit = STATE_NAMES.find((s) => s.toLowerCase().replace(/&/g, "and") === n);
  return hit ?? null;
}

/** Point-in-polygon lookup: which Indian state/UT contains this coordinate? */
export function stateForPoint(lat: number, lng: number): string | null {
  for (const f of INDIA_GEO.features) {
    if (geoContains(f, [lng, lat])) return f.properties.ST_NM;
  }
  return null;
}

/**
 * Best-effort canonical state for a destination. A recognised state name wins
 * (coastal/island points can fall just outside simplified polygons); otherwise
 * fall back to point-in-polygon on the coordinates.
 */
export function resolveState(d: {
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
}): string | null {
  if (d.country && d.country.toLowerCase() !== "india") return null;
  const named = normalizeState(d.state);
  if (named) return named;
  if (d.latitude != null && d.longitude != null) return stateForPoint(d.latitude, d.longitude);
  return null;
}
