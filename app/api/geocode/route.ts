import { NextResponse, type NextRequest } from "next/server";
import { curatedTagsFor } from "@/lib/destinations";
import { normalizeState, stateForPoint } from "@/lib/geo/india";
import type { DestinationInput } from "@/lib/types";

/**
 * Destination geocoding proxy (Photon / OpenStreetMap — free, keyless).
 * Set GEOCODER=off to disable; the client then falls back to the curated dataset only.
 */

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; state?: string; country?: string; type?: string; osm_value?: string; city?: string };
}

const cache = new Map<string, { at: number; data: DestinationInput[] }>();
const TTL = 1000 * 60 * 60 * 12;
const ALLOWED_TYPES = new Set(["city", "locality", "district", "county", "other"]);

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 3) return NextResponse.json({ results: [] });
  if (process.env.GEOCODER === "off") return NextResponse.json({ results: [], disabled: true });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ results: hit.data });

  try {
    const url = new URL(process.env.GEOCODER_URL || "https://photon.komoot.io/api/");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "10");
    url.searchParams.set("lang", "en");
    url.searchParams.set("lat", "22.5");
    url.searchParams.set("lon", "79");
    const res = await fetch(url, {
      headers: { "User-Agent": "TravelWrapped/1.0 (destination search)" },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) throw new Error(`geocoder ${res.status}`);
    const json = (await res.json()) as { features?: PhotonFeature[] };

    const seen = new Set<string>();
    const results: DestinationInput[] = [];
    for (const f of json.features ?? []) {
      const p = f.properties;
      if (!p.name || !p.country) continue;
      if (p.type && !ALLOWED_TYPES.has(p.type)) continue;
      const [lng, lat] = f.geometry.coordinates;
      const isIndia = p.country === "India";
      const state = isIndia ? normalizeState(p.state) ?? stateForPoint(lat, lng) : p.state ?? null;
      const k = `${p.name}|${state}|${p.country}`.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      results.push({
        city: p.name,
        state,
        country: p.country,
        latitude: Math.round(lat * 1e4) / 1e4,
        longitude: Math.round(lng * 1e4) / 1e4,
        tags: curatedTagsFor(p.name, state, p.country),
      });
      if (results.length >= 8) break;
    }
    // India first — this is an India-first product
    results.sort((a, b) => Number(b.country === "India") - Number(a.country === "India"));
    results.splice(6);
    if (cache.size > 500) cache.clear();
    cache.set(key, { at: Date.now(), data: results });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "Geocoder unavailable" });
  }
}
