import { curatedTagsFor, destinationKey } from "../destinations";
import { resolveState } from "../geo/india";
import type {
  Achievement,
  CityStat,
  Highlight,
  TimelineItem,
  TravelCategory,
  Trip,
  TripType,
  WrappedSnapshot,
  WrappedStats,
} from "../types";
import { firstName, fmtNumber, parseDate, plural, tripDays } from "../utils";
import { classifyPersonality } from "./personality";

export function tripYear(t: Pick<Trip, "start_date">): number {
  return Number(t.start_date.slice(0, 4));
}

export function availableYears(trips: Trip[]): number[] {
  return Array.from(new Set(trips.map(tripYear))).sort((a, b) => b - a);
}

/** A trip counts as a weekend trip if it lasts ≤3 days and includes a Saturday or Sunday. */
export function isWeekendTrip(t: Pick<Trip, "start_date" | "end_date">): boolean {
  const days = tripDays(t.start_date, t.end_date);
  if (days > 3) return false;
  const d = parseDate(t.start_date);
  for (let i = 0; i < days; i++) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i).getDay();
    if (day === 0 || day === 6) return true;
  }
  return false;
}

function mode<T extends string>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let n = 0;
  for (const [k, c] of counts) if (c > n) [best, n] = [k, c];
  return best;
}

export function computeWrapped(allTrips: Trip[], year: number, ownerName: string | null): WrappedStats {
  const trips = allTrips
    .filter((t) => tripYear(t) === year)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const cityMap = new Map<string, CityStat>();
  const states = new Set<string>();
  const countries = new Set<string>();

  trips.forEach((t, tripIndex) => {
    const days = tripDays(t.start_date, t.end_date);
    const seenInTrip = new Set<string>();
    for (const d of t.destinations) {
      const key = destinationKey(d);
      if (seenInTrip.has(key)) continue;
      seenInTrip.add(key);
      countries.add(d.country || "India");
      const st = resolveState(d);
      if (st) states.add(st);
      const existing = cityMap.get(key);
      const share = days / Math.max(1, t.destinations.length);
      if (existing) {
        existing.visits += 1;
        existing.days += share;
      } else {
        cityMap.set(key, {
          city: d.city,
          state: st ?? d.state,
          country: d.country || "India",
          lat: d.latitude,
          lng: d.longitude,
          visits: 1,
          days: share,
          tags: d.tags?.length ? d.tags : curatedTagsFor(d.city, d.state, d.country || "India"),
          tripIndex,
        });
      }
    }
  });

  const cities = Array.from(cityMap.values()).map((c) => ({ ...c, days: Math.round(c.days * 10) / 10 }));

  const timeline: TimelineItem[] = trips.map((t) => ({
    id: t.id,
    name: t.trip_name,
    start: t.start_date,
    end: t.end_date,
    days: tripDays(t.start_date, t.end_date),
    cities: t.destinations.map((d) => d.city),
    type: t.trip_type,
    category: t.travel_category,
  }));

  const kmTrips = trips.filter((t) => t.distance_km != null && t.distance_km > 0);
  const totalKm = kmTrips.length ? kmTrips.reduce((s, t) => s + (t.distance_km ?? 0), 0) : null;

  const byVisits = [...cities].sort((a, b) => b.visits - a.visits || b.days - a.days);
  const mostExplored = byVisits[0] ?? null;
  const mostExploredBasis = mostExplored && mostExplored.visits > 1 ? "visits" : "days";
  if (mostExploredBasis === "days") byVisits.sort((a, b) => b.days - a.days);

  const longestTrip = timeline.length ? [...timeline].sort((a, b) => b.days - a.days)[0] : null;

  const monthCounts = Array.from({ length: 12 }, () => 0);
  for (const t of trips) monthCounts[parseDate(t.start_date).getMonth()] += 1;

  const soloTrips = trips.filter((t) => t.trip_type === "Solo").length;
  const weekendTrips = trips.filter(isWeekendTrip).length;
  const totalDays = timeline.reduce((s, t) => s + t.days, 0);

  const personality = classifyPersonality({ trips: timeline, cities, weekendTrips, soloTrips });

  const highlights: Highlight[] = [];
  for (const t of [...trips].reverse()) {
    const photo = t.photos[0]?.url ?? null;
    if (!t.memorable_experience && !photo) continue;
    highlights.push({
      tripName: t.trip_name,
      city: t.destinations[0]?.city ?? t.trip_name,
      date: t.start_date,
      text: t.memorable_experience,
      photoUrl: photo,
    });
  }
  highlights.reverse();

  const gallery = trips.flatMap((t) =>
    t.photos
      .filter((ph) => ph.url)
      .map((ph) => ({ url: ph.url, city: t.destinations[0]?.city ?? t.trip_name, tripName: t.trip_name, tripId: t.id, date: t.start_date })),
  );

  const stats: WrappedStats = {
    year,
    ownerName: firstName(ownerName),
    totalTrips: trips.length,
    totalDays,
    cities: [...cities].sort((a, b) => a.tripIndex - b.tripIndex),
    states: Array.from(states).sort(),
    countries: Array.from(countries).sort(),
    totalKm,
    kmTripsCount: kmTrips.length,
    mostExplored: (mostExploredBasis === "days" ? byVisits[0] : mostExplored) ?? null,
    mostExploredBasis,
    longestTrip,
    timeline,
    monthCounts,
    soloTrips,
    weekendTrips,
    topCategory: mode(trips.map((t) => t.travel_category)) as TravelCategory | null,
    topType: mode(trips.map((t) => t.trip_type)) as TripType | null,
    personality,
    achievements: [],
    highlights: highlights.slice(0, 6),
    gallery,
  };
  stats.achievements = computeAchievements(stats);
  return stats;
}

export function computeAchievements(s: Omit<WrappedStats, "achievements" | "gallery">): Achievement[] {
  const a: Achievement[] = [];
  const india = s.cities.filter((c) => c.country === "India");
  const mountains = s.cities.filter((c) => c.tags.includes("mountain") || c.tags.includes("hill-station"));
  const beaches = s.cities.filter((c) => c.tags.includes("beach") || c.tags.includes("island"));
  const heritage = s.cities.filter((c) => c.tags.includes("heritage"));
  const monthsActive = s.monthCounts.filter((n) => n > 0).length;
  const maxStops = Math.max(0, ...s.timeline.map((t) => t.cities.length));
  const intl = s.countries.filter((c) => c !== "India");

  if (s.totalTrips >= 1) a.push({ key: "first", title: "Bags packed", detail: `Logged ${plural(s.totalTrips, "trip")} in ${s.year}`, icon: "luggage" });
  if (s.states.length >= 3) a.push({ key: "states", title: "State Hopper", detail: `Explored ${s.states.length} states & UTs in one year`, icon: "map" });
  if (s.cities.length >= 5) a.push({ key: "cities", title: "City Collector", detail: `Explored ${s.cities.length} different places`, icon: "building" });
  if (s.weekendTrips >= 2) a.push({ key: "weekend", title: "Weekend Warrior", detail: `Took ${s.weekendTrips} weekend trips`, icon: "calendar" });
  if (mountains.length >= 2) a.push({ key: "mountain", title: "Peak Season", detail: `Visited ${mountains.length} mountain & hill destinations`, icon: "mountain" });
  if (beaches.length >= 2) a.push({ key: "beach", title: "Shoreline Chaser", detail: `Visited ${beaches.length} coastal destinations`, icon: "waves" });
  if (heritage.length >= 2) a.push({ key: "heritage", title: "History Buff", detail: `Explored ${heritage.length} heritage destinations`, icon: "landmark" });
  if (s.soloTrips >= 1) a.push({ key: "solo", title: "Solo Mode", detail: `Went solo ${s.soloTrips === 1 ? "once" : s.soloTrips + " times"}`, icon: "user" });
  if (s.totalKm != null && s.totalKm >= 500) a.push({ key: "km", title: "Long Hauler", detail: `Logged ${fmtNumber(s.totalKm)} km of travel`, icon: "route" });
  if (s.longestTrip && s.longestTrip.days >= 7) a.push({ key: "long", title: "In No Hurry", detail: `Spent ${s.longestTrip.days} days on a single trip`, icon: "hourglass" });
  if (maxStops >= 3) a.push({ key: "multistop", title: "Multi-Stop Maestro", detail: `Covered ${maxStops} stops in a single trip`, icon: "route" });
  if (monthsActive >= 6) a.push({ key: "months", title: "Always Out There", detail: `Travelled in ${monthsActive} different months`, icon: "sun" });
  if (s.totalDays >= 30) a.push({ key: "days", title: "A Month on the Road", detail: `${s.totalDays} days spent travelling`, icon: "tent" });
  if (intl.length >= 1) a.push({ key: "intl", title: "Passport Stamped", detail: `Went international: ${intl.slice(0, 3).join(", ")}`, icon: "plane" });
  if (india.length > 0 && s.states.length >= 1 && s.cities.some((c) => c.visits >= 2))
    a.push({ key: "repeat", title: "Came Back For More", detail: `Returned to ${s.cities.filter((c) => c.visits >= 2)[0].city}`, icon: "heart" });
  return a;
}

/** Strip private content (photos, memorable notes) before publishing. */
export function toSnapshot(s: WrappedStats): WrappedSnapshot {
  const { gallery: _private, ...rest } = s;
  void _private;
  return { ...rest, highlights: [] };
}

export function shareLine(s: Pick<WrappedStats, "year" | "cities" | "states" | "totalTrips">): string {
  const parts: string[] = [];
  if (s.cities.length) parts.push(plural(s.cities.length, "city", "cities"));
  if (s.states.length) parts.push(plural(s.states.length, "state"));
  parts.push(plural(s.totalTrips, "adventure"));
  const list = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0];
  return `I didn't just travel in ${s.year}. I collected memories across ${list}.`;
}
