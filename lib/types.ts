export const TRIP_TYPES = ["Solo", "Friends", "Family", "Couple", "Work"] as const;
export const TRAVEL_CATEGORIES = [
  "Adventure",
  "Leisure",
  "Backpacking",
  "Spiritual",
  "Business",
  "Road Trip",
] as const;

export type TripType = (typeof TRIP_TYPES)[number];
export type TravelCategory = (typeof TRAVEL_CATEGORIES)[number];

/** Descriptive tags used by the personality engine. Only curated destinations carry them. */
export type DestinationTag =
  | "mountain"
  | "beach"
  | "heritage"
  | "spiritual"
  | "city"
  | "nature"
  | "desert"
  | "island"
  | "hill-station";

export interface Destination {
  id: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
}

export type DestinationInput = Omit<Destination, "id">;

export interface Photo {
  id: string;
  trip_id: string;
  path: string;
  /** Displayable URL: signed URL (Supabase) or data URL (local mode). */
  url: string;
  caption: string | null;
}

export interface Trip {
  id: string;
  trip_name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  trip_type: TripType;
  travel_category: TravelCategory;
  notes: string | null;
  memorable_experience: string | null;
  distance_km: number | null;
  destinations: Destination[];
  photos: Photo[];
  created_at: string;
}

export interface TripInput {
  trip_name: string;
  start_date: string;
  end_date: string;
  trip_type: TripType;
  travel_category: TravelCategory;
  notes: string | null;
  memorable_experience: string | null;
  distance_km: number | null;
  destinations: DestinationInput[];
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  home_city: string | null;
  referral_code: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface WrappedRecord {
  id: string;
  year: number;
  title: string | null;
  personality: string | null;
  stats: WrappedSnapshot;
  public_slug: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type InvitationStatus = "pending" | "sent" | "accepted" | "failed";

export interface Invitation {
  id: string;
  recipient_email: string;
  status: InvitationStatus;
  message: string | null;
  created_at: string;
}

/* ───────────── Wrapped stats ───────────── */

export interface CityStat {
  city: string;
  state: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  visits: number;
  days: number;
  tags: string[];
  /** index of first trip (chronological) that included this city — used for marker colours */
  tripIndex: number;
}

export interface TimelineItem {
  id: string;
  name: string;
  start: string;
  end: string;
  days: number;
  cities: string[];
  type: TripType;
  category: TravelCategory;
}

export interface Personality {
  key: string;
  title: string;
  tagline: string;
  reasons: string[];
}

export interface Achievement {
  key: string;
  title: string;
  detail: string;
  icon: string; // lucide icon name key, resolved in UI
}

export interface Highlight {
  tripName: string;
  city: string;
  date: string;
  text: string | null;
  photoUrl: string | null;
}

export interface GalleryPhoto {
  url: string;
  city: string;
  tripName: string;
  tripId: string;
  date: string;
}

/** Everything the story needs. `highlights` contains private content and is stripped before publishing. */
export interface WrappedStats {
  year: number;
  ownerName: string;
  totalTrips: number;
  totalDays: number;
  cities: CityStat[];
  states: string[];
  countries: string[];
  totalKm: number | null;
  kmTripsCount: number;
  mostExplored: CityStat | null;
  /** "visits" when a city was visited more than once, otherwise "days" (most time spent). */
  mostExploredBasis: "visits" | "days";
  longestTrip: TimelineItem | null;
  timeline: TimelineItem[];
  monthCounts: number[];
  soloTrips: number;
  weekendTrips: number;
  topCategory: TravelCategory | null;
  topType: TripType | null;
  personality: Personality;
  achievements: Achievement[];
  highlights: Highlight[];
  /** Every photo from the year's trips, chronological. Private — never published. */
  gallery: GalleryPhoto[];
}

export type WrappedSnapshot = Omit<WrappedStats, "highlights" | "gallery"> & { highlights: []; gallery?: [] };
