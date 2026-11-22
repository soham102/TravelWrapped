import { CURATED, destinationKey } from "../destinations";
import { resolveState } from "../geo/india";
import type { Trip, WrappedSnapshot } from "../types";
import { firstName, haversineKm, MONTH_NAMES } from "../utils";
import { computeWrapped, tripYear } from "../wrapped/compute";

/**
 * A travel journey: every located destination of a year, in the order the user visited them.
 * Built from real trips (private: may carry photos and captions) or from a public Wrapped snapshot
 * (public-safe: no photos, notes or captions).
 */

export interface JourneyStop {
  id: string;
  /** Same value for every visit to the same place — used to merge markers of revisits. */
  placeKey: string;
  city: string;
  state: string | null;
  country: string;
  lat: number;
  lng: number;
  /** Trip dates (YYYY-MM-DD). Destinations don't carry their own dates, so stops share their trip's. */
  date: string | null;
  endDate: string | null;
  tripId: string;
  tripName: string | null;
  stopInTrip: number;
  stopsInTrip: number;
  /** 1 for the first visit to this place this year, 2 for the second… */
  visit: number;
  photo: { url: string; caption: string | null } | null;
  /** The user's own words: the photo caption, else the trip's memorable moment (on the trip's last stop). */
  caption: string | null;
  /** Where the caption came from — a trip memory is labelled as such, not as being about this city. */
  captionSource: "photo" | "trip" | null;
  /** Straight-line distance from the previous stop, km (null for the first stop). */
  legKm: number | null;
}

export interface UnlocatedPlace {
  city: string;
  state: string | null;
  country: string;
  tripName: string | null;
}

export interface JourneyStats {
  /** Stops on the journey, revisits included. */
  stops: number;
  /** Distinct places (cities/towns). */
  places: number;
  states: number;
  countries: string[];
  trips: number;
  /** Only the km the user logged on their trips — never estimated. */
  km: number | null;
  kmTrips: number;
}

export interface Journey {
  year: number;
  ownerName: string;
  stops: JourneyStop[];
  unlocated: UnlocatedPlace[];
  stats: JourneyStats;
  /** Sample data (demo) — must be labelled as such in the UI. */
  sample: boolean;
  /** Private journeys can include photos/captions; public ones never do. */
  visibility: "private" | "public";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const validDate = (d: string | null | undefined): d is string => !!d && DATE_RE.test(d);

const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "January 2026" (or a clear label when the date is missing). */
export function monthYear(d: string | null): string {
  if (!validDate(d)) return "Date not recorded";
  const [y, m] = d.split("-").map(Number);
  return `${FULL_MONTHS[m - 1] ?? ""} ${y}`.trim();
}

/** "Jan" — for compact timeline ticks. */
export function shortMonth(d: string | null): string {
  if (!validDate(d)) return "—";
  return MONTH_NAMES[Number(d.slice(5, 7)) - 1] ?? "—";
}

function chronological(a: Trip, b: Trip): number {
  const ad = validDate(a.start_date) ? a.start_date : "9999";
  const bd = validDate(b.start_date) ? b.start_date : "9999";
  return ad.localeCompare(bd) || (a.end_date ?? "").localeCompare(b.end_date ?? "") || (a.created_at ?? "").localeCompare(b.created_at ?? "");
}

function statsFrom(s: Pick<WrappedSnapshot, "cities" | "states" | "countries" | "totalTrips" | "totalKm" | "kmTripsCount">, stops: number): JourneyStats {
  return {
    stops,
    places: s.cities.length,
    states: s.states.length,
    countries: s.countries,
    trips: s.totalTrips,
    km: s.totalKm,
    kmTrips: s.kmTripsCount,
  };
}

function finish(stops: Omit<JourneyStop, "visit" | "legKm">[]): JourneyStop[] {
  const visits = new Map<string, number>();
  return stops.map((s, i) => {
    const visit = (visits.get(s.placeKey) ?? 0) + 1;
    visits.set(s.placeKey, visit);
    const prev = stops[i - 1];
    return { ...s, visit, legKm: prev ? Math.round(haversineKm([prev.lat, prev.lng], [s.lat, s.lng])) : null };
  });
}

function captionFor(photoCaption: string | null | undefined, tripMemory: string | null | undefined): Pick<JourneyStop, "caption" | "captionSource"> {
  const p = photoCaption?.trim();
  if (p) return { caption: p, captionSource: "photo" };
  const m = tripMemory?.trim();
  if (m) return { caption: m, captionSource: "trip" };
  return { caption: null, captionSource: null };
}

/** The logged-in user's journey for one year, from their real trips. */
export function buildJourney(allTrips: Trip[], year: number, ownerName: string | null, opts: { sample?: boolean } = {}): Journey {
  const trips = allTrips.filter((t) => tripYear(t) === year).sort(chronological);
  const stops: Omit<JourneyStop, "visit" | "legKm">[] = [];
  const unlocated: UnlocatedPlace[] = [];

  for (const t of trips) {
    // Ordered stops of this trip; consecutive duplicates (same place twice in a row) collapse into one.
    const located = [];
    let lastKey = "";
    for (const d of t.destinations) {
      const key = destinationKey(d);
      if (key === lastKey) continue;
      lastKey = key;
      if (d.latitude == null || d.longitude == null || !Number.isFinite(d.latitude) || !Number.isFinite(d.longitude)) {
        unlocated.push({ city: d.city, state: d.state, country: d.country || "India", tripName: t.trip_name });
        continue;
      }
      located.push({ d, key });
    }
    const photos = t.photos.filter((p) => p.url);
    located.forEach(({ d, key }, i) => {
      // A trip's photos aren't tied to a destination, so they're spread over its stops in order
      // (the card says which trip they're from). Stops without one get a designed card instead.
      const photo = photos.length > i ? photos[i] : null;
      stops.push({
        id: `${t.id}:${d.id ?? i}:${i}`,
        placeKey: key,
        city: d.city,
        state: resolveState(d) ?? d.state,
        country: d.country || "India",
        lat: d.latitude!,
        lng: d.longitude!,
        date: validDate(t.start_date) ? t.start_date : null,
        endDate: validDate(t.end_date) ? t.end_date : null,
        tripId: t.id,
        tripName: t.trip_name,
        stopInTrip: i + 1,
        stopsInTrip: located.length,
        photo: photo ? { url: photo.url, caption: photo.caption } : null,
        ...captionFor(photo?.caption, i === located.length - 1 ? t.memorable_experience : null),
      });
    });
  }

  const stats = computeWrapped(allTrips, year, ownerName);
  const finished = finish(stops);
  return {
    year,
    ownerName: firstName(ownerName),
    stops: finished,
    unlocated,
    stats: statsFrom(stats, finished.length),
    sample: !!opts.sample,
    visibility: "private",
  };
}

/**
 * A public journey rebuilt from a published Wrapped snapshot. The snapshot already excludes photos,
 * notes and memorable moments, so the journey can't leak them.
 */
export function journeyFromSnapshot(s: WrappedSnapshot, opts: { sample?: boolean } = {}): Journey {
  const stops: Omit<JourneyStop, "visit" | "legKm">[] = [];
  const unlocated: UnlocatedPlace[] = [];
  const timeline = [...s.timeline].sort((a, b) => a.start.localeCompare(b.start));
  for (const t of timeline) {
    const located = [];
    let last = "";
    for (const name of t.cities) {
      if (name === last) continue;
      last = name;
      const c = s.cities.find((x) => x.city === name);
      if (!c) continue;
      if (c.lat == null || c.lng == null) {
        if (!unlocated.some((u) => u.city === c.city && u.country === c.country)) unlocated.push({ city: c.city, state: c.state, country: c.country, tripName: null });
        continue;
      }
      located.push(c);
    }
    located.forEach((c, i) =>
      stops.push({
        id: `${t.id}:${i}`,
        placeKey: destinationKey(c),
        city: c.city,
        state: c.state,
        country: c.country,
        lat: c.lat!,
        lng: c.lng!,
        date: validDate(t.start) ? t.start : null,
        endDate: validDate(t.end) ? t.end : null,
        tripId: t.id,
        tripName: t.name,
        stopInTrip: i + 1,
        stopsInTrip: located.length,
        photo: null,
        caption: null,
        captionSource: null,
      }),
    );
  }
  const finished = finish(stops);
  return {
    year: s.year,
    ownerName: s.ownerName,
    stops: finished,
    unlocated,
    stats: statsFrom(s, finished.length),
    sample: !!opts.sample,
    visibility: "public",
  };
}

/* ───────────── Coordinates for destinations that were saved without them ───────────── */

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

function curatedMatch(city: string, state: string | null, country: string) {
  return CURATED.find(
    (c) => norm(c.city) === norm(city) && norm(c.country) === norm(country || "India") && (!state || !c.state || norm(c.state) === norm(state)),
  );
}

/**
 * Fills in missing coordinates (in memory only) from the curated dataset, then the app's own
 * geocoder. A result is only accepted if its name and country match exactly — no guessing.
 * Anything still unresolved is reported by the journey as "couldn't be placed on the map".
 */
export async function locateMissing(trips: Trip[], signal?: AbortSignal): Promise<Trip[]> {
  const cache = new Map<string, { lat: number; lng: number } | null>();
  const lookup = async (city: string, state: string | null, country: string) => {
    const k = `${norm(city)}|${norm(state)}|${norm(country)}`;
    if (cache.has(k)) return cache.get(k)!;
    let hit: { lat: number; lng: number } | null = null;
    const cur = curatedMatch(city, state, country);
    if (cur?.latitude != null && cur.longitude != null) hit = { lat: cur.latitude, lng: cur.longitude };
    else {
      try {
        const q = [city, state, country].filter(Boolean).join(", ");
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.slice(0, 80))}`, { signal });
        const json = (await res.json()) as { results?: { city: string; state: string | null; country: string; latitude: number | null; longitude: number | null }[] };
        const r = json.results?.find(
          (x) => norm(x.city) === norm(city) && norm(x.country) === norm(country || "India") && (!state || !x.state || norm(x.state) === norm(state)) && x.latitude != null && x.longitude != null,
        );
        if (r) hit = { lat: r.latitude!, lng: r.longitude! };
      } catch {
        /* offline / geocoder disabled — leave unlocated */
      }
    }
    cache.set(k, hit);
    return hit;
  };

  if (!trips.some((t) => t.destinations.some((d) => d.latitude == null || d.longitude == null))) return trips;
  const out: Trip[] = [];
  for (const t of trips) {
    const destinations = [];
    for (const d of t.destinations) {
      if (d.latitude != null && d.longitude != null) {
        destinations.push(d);
        continue;
      }
      const hit = await lookup(d.city, d.state, d.country || "India");
      destinations.push(hit ? { ...d, latitude: hit.lat, longitude: hit.lng } : d);
    }
    out.push({ ...t, destinations });
  }
  return out;
}

/** Bounding box of the journey ([[south, west], [north, east]]). */
export function journeyBounds(stops: Pick<JourneyStop, "lat" | "lng">[]): [[number, number], [number, number]] {
  if (!stops.length) return [[6.5, 68], [35.5, 97.5]]; // India
  let s = 90, w = 180, n = -90, e = -180;
  for (const p of stops) {
    s = Math.min(s, p.lat);
    n = Math.max(n, p.lat);
    w = Math.min(w, p.lng);
    e = Math.max(e, p.lng);
  }
  return [[s, w], [n, e]];
}

/** Curved route between two stops as [lat, lng] points (a gentle arc, like a flight path). */
export function arcPoints(a: { lat: number; lng: number }, b: { lat: number; lng: number }, n = 64): [number, number][] {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const bend = 0.22;
  const cx = (a.lng + b.lng) / 2 - dy * bend;
  const cy = (a.lat + b.lat) / 2 + dx * bend;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([u * u * a.lat + 2 * u * t * cy + t * t * b.lat, u * u * a.lng + 2 * u * t * cx + t * t * b.lng]);
  }
  return pts;
}
