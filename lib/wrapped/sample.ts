import { CURATED } from "../destinations";
import type { DestinationInput, Trip, TripInput } from "../types";

function dest(city: string): DestinationInput {
  const d = CURATED.find((c) => c.city === city);
  if (!d) throw new Error(`Sample destination missing: ${city}`);
  const { city: c, state, country, latitude, longitude, tags } = d;
  return { city: c, state, country, latitude, longitude, tags };
}

/** Clearly-labelled sample trips used by the demo and the "try with sample data" button. */
export function sampleTripInputs(year = 2026): TripInput[] {
  const y = String(year);
  return [
    {
      trip_name: "Goa with the gang",
      start_date: `${y}-01-23`,
      end_date: `${y}-01-26`,
      trip_type: "Friends",
      travel_category: "Leisure",
      notes: "Sample trip",
      memorable_experience: "Sunset at Chapora Fort with the whole gang singing off-key.",
      distance_km: null,
      destinations: [dest("Goa"), dest("Anjuna")],
    },
    {
      trip_name: "Pune weekend",
      start_date: `${y}-02-14`,
      end_date: `${y}-02-15`,
      trip_type: "Solo",
      travel_category: "Leisure",
      notes: "Sample trip",
      memorable_experience: null,
      distance_km: 300,
      destinations: [dest("Pune")],
    },
    {
      trip_name: "Royal Rajasthan loop",
      start_date: `${y}-03-20`,
      end_date: `${y}-03-27`,
      trip_type: "Friends",
      travel_category: "Road Trip",
      notes: "Sample trip",
      memorable_experience: "Watching Udaipur light up from a rooftop café over Lake Pichola.",
      distance_km: 1150,
      destinations: [dest("Jaipur"), dest("Udaipur")],
    },
    {
      trip_name: "Mountains, finally",
      start_date: `${y}-05-10`,
      end_date: `${y}-05-18`,
      trip_type: "Solo",
      travel_category: "Backpacking",
      notes: "Sample trip",
      memorable_experience: "Waking up to snow peaks in Kasol after an overnight bus from Delhi.",
      distance_km: 1100,
      destinations: [dest("Delhi"), dest("Manali"), dest("Kasol")],
    },
    {
      trip_name: "Bengaluru offsite",
      start_date: `${y}-07-07`,
      end_date: `${y}-07-10`,
      trip_type: "Work",
      travel_category: "Business",
      notes: "Sample trip",
      memorable_experience: null,
      distance_km: null,
      destinations: [dest("Bengaluru")],
    },
    {
      trip_name: "Monsoon Mumbai",
      start_date: `${y}-08-01`,
      end_date: `${y}-08-02`,
      trip_type: "Solo",
      travel_category: "Leisure",
      notes: "Sample trip",
      memorable_experience: "Cutting chai on Marine Drive while the waves crashed over the wall.",
      distance_km: null,
      destinations: [dest("Mumbai")],
    },
    {
      trip_name: "Goa, round two",
      start_date: `${y}-10-17`,
      end_date: `${y}-10-19`,
      trip_type: "Couple",
      travel_category: "Leisure",
      notes: "Sample trip",
      memorable_experience: null,
      distance_km: null,
      destinations: [dest("Goa"), dest("Palolem")],
    },
    {
      trip_name: "Rishikesh reset",
      start_date: `${y}-11-06`,
      end_date: `${y}-11-09`,
      trip_type: "Solo",
      travel_category: "Spiritual",
      notes: "Sample trip",
      memorable_experience: "Ganga aarti at Triveni Ghat — goosebumps.",
      distance_km: null,
      destinations: [dest("Rishikesh")],
    },
  ];
}

export function sampleTrips(year = 2026): Trip[] {
  return sampleTripInputs(year).map((t, i) => ({
    ...t,
    id: `sample-${i}`,
    created_at: `${year}-01-01T00:00:00Z`,
    destinations: t.destinations.map((d, j) => ({ ...d, id: `sample-${i}-${j}` })),
    photos: [],
  }));
}
