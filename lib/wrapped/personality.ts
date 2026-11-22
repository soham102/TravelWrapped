import type { CityStat, Personality, TimelineItem } from "../types";
import { plural } from "../utils";

export interface PersonalityInput {
  trips: TimelineItem[];
  cities: CityStat[];
  weekendTrips: number;
  soloTrips: number;
}

interface Rule {
  key: string;
  title: string;
  tagline: string;
  /** Returns a 0..1+ score when the rule qualifies, otherwise null. */
  evaluate: (i: PersonalityInput) => { score: number; reasons: string[] } | null;
}

const has = (c: CityStat, ...tags: string[]) => tags.some((t) => c.tags.includes(t));
const names = (cs: CityStat[], n = 3) => cs.slice(0, n).map((c) => c.city).join(", ");

export const PERSONALITY_RULES: Rule[] = [
  {
    key: "solo",
    title: "The Solo Explorer",
    tagline: "You don't wait for plans. You make them.",
    evaluate: ({ trips, soloTrips }) => {
      const share = soloTrips / trips.length;
      if (soloTrips < 2 || share < 0.5) return null;
      return {
        score: share + soloTrips / 100,
        reasons: [`${soloTrips} of your ${plural(trips.length, "trip")} were solo`, "You travel on your own terms"],
      };
    },
  },
  {
    key: "mountain",
    title: "The Mountain Soul",
    tagline: "Thin air, big views, happy you.",
    evaluate: ({ cities }) => {
      const m = cities.filter((c) => has(c, "mountain", "hill-station"));
      const share = m.length / Math.max(1, cities.length);
      if (m.length < 2 || share < 0.4) return null;
      return {
        score: share + m.length / 100,
        reasons: [
          `${m.length} of your ${plural(cities.length, "destination")} were in the mountains or hills`,
          `Including ${names(m)}`,
        ],
      };
    },
  },
  {
    key: "beach",
    title: "The Beach Hopper",
    tagline: "Salt in your hair, sand in your bag.",
    evaluate: ({ cities }) => {
      const b = cities.filter((c) => has(c, "beach", "island"));
      const share = b.length / Math.max(1, cities.length);
      if (b.length < 2 || share < 0.4) return null;
      return {
        score: share + b.length / 100,
        reasons: [`${b.length} of your ${plural(cities.length, "destination")} were by the sea`, `Including ${names(b)}`],
      };
    },
  },
  {
    key: "weekend",
    title: "The Weekend Wanderer",
    tagline: "Two days off? That's a trip.",
    evaluate: ({ trips, weekendTrips }) => {
      const share = weekendTrips / trips.length;
      if (weekendTrips < 2 || share < 0.5) return null;
      return {
        score: share + weekendTrips / 100,
        reasons: [`${weekendTrips} of your ${plural(trips.length, "trip")} were short weekend getaways (3 days or less)`],
      };
    },
  },
  {
    key: "roadtrip",
    title: "The Road Trip Addict",
    tagline: "Windows down, playlist on.",
    evaluate: ({ trips }) => {
      const r = trips.filter((t) => t.category === "Road Trip").length;
      const share = r / trips.length;
      if (r < 2 || share < 0.4) return null;
      return { score: share + r / 100, reasons: [`${r} of your ${plural(trips.length, "trip")} were road trips`] };
    },
  },
  {
    key: "spiritual",
    title: "The Spiritual Seeker",
    tagline: "Temples, ghats and quiet sunrises.",
    evaluate: ({ trips, cities }) => {
      const st = trips.filter((t) => t.category === "Spiritual").length;
      const sc = cities.filter((c) => has(c, "spiritual"));
      const share = Math.max(st / trips.length, sc.length / Math.max(1, cities.length));
      if (Math.max(st, sc.length) < 2 || share < 0.4) return null;
      const reasons = [];
      if (st) reasons.push(`${plural(st, "trip")} tagged Spiritual`);
      if (sc.length) reasons.push(`${plural(sc.length, "sacred destination")} like ${names(sc)}`);
      return { score: share + 0.01, reasons };
    },
  },
  {
    key: "cultural",
    title: "The Cultural Explorer",
    tagline: "Forts, palaces and a thousand stories.",
    evaluate: ({ cities }) => {
      const h = cities.filter((c) => has(c, "heritage"));
      const share = h.length / Math.max(1, cities.length);
      if (h.length < 2 || share < 0.4) return null;
      return {
        score: share + h.length / 100,
        reasons: [`${h.length} of your ${plural(cities.length, "destination")} are heritage hotspots`, `Including ${names(h)}`],
      };
    },
  },
  {
    key: "adventure",
    title: "The Thrill Seeker",
    tagline: "If it's steep, you're in.",
    evaluate: ({ trips }) => {
      const a = trips.filter((t) => t.category === "Adventure" || t.category === "Backpacking").length;
      const share = a / trips.length;
      if (a < 2 || share < 0.5) return null;
      return { score: share + a / 100, reasons: [`${a} of your ${plural(trips.length, "trip")} were adventure or backpacking trips`] };
    },
  },
  {
    key: "city",
    title: "The City Collector",
    tagline: "New city, new chapter.",
    evaluate: ({ cities }) => {
      const urban = cities.filter((c) => has(c, "city"));
      if (cities.length >= 6) {
        return {
          // Deliberately modest: breadth wins only when no stronger pattern exists.
          score: 0.3 + Math.min(cities.length / 60, 0.2),
          reasons: [`You explored ${cities.length} different places this year`, `From ${cities[0].city} to ${cities[cities.length - 1].city}`],
        };
      }
      const share = urban.length / Math.max(1, cities.length);
      if (urban.length < 3 || share < 0.5) return null;
      return { score: share, reasons: [`${urban.length} big-city stops, including ${names(urban)}`] };
    },
  },
];

export function classifyPersonality(input: PersonalityInput): Personality {
  const { trips } = input;
  if (trips.length === 0) {
    return { key: "dreamer", title: "The Dreamer", tagline: "Your first trip is waiting.", reasons: ["No trips logged for this year yet"] };
  }
  let best: { rule: Rule; score: number; reasons: string[] } | null = null;
  for (const rule of PERSONALITY_RULES) {
    const r = rule.evaluate(input);
    if (r && (!best || r.score > best.score)) best = { rule, ...r };
  }
  if (best) return { key: best.rule.key, title: best.rule.title, tagline: best.rule.tagline, reasons: best.reasons };
  return {
    key: "curious",
    title: "The Curious Explorer",
    tagline: "Every trip, a different kind of story.",
    reasons:
      trips.length === 1
        ? ["One trip logged so far — the start of something big"]
        : [`${plural(trips.length, "trip")} with no single pattern`, "You like to keep every journey different"],
  };
}

/** Public catalogue for the landing page. */
export const PERSONALITY_CATALOGUE = [
  ...PERSONALITY_RULES.map((r) => ({ key: r.key, title: r.title, tagline: r.tagline })),
  { key: "curious", title: "The Curious Explorer", tagline: "Every trip, a different kind of story." },
];
