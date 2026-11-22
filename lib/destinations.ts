import type { DestinationInput } from "./types";

/**
 * Curated destination dataset — the offline fallback for destination search and the
 * source of descriptive tags for the travel-personality engine.
 * State names match `lib/geo/india-states.json` (ST_NM) exactly.
 *
 * Tag codes: m=mountain b=beach h=heritage s=spiritual c=city n=nature d=desert i=island hs=hill-station
 */
type Row = [city: string, state: string, lat: number, lng: number, tags: string, aliases?: string];

const INDIA: Row[] = [
  // Andaman & Nicobar
  ["Port Blair", "Andaman & Nicobar", 11.62, 92.73, "b i"],
  ["Havelock Island", "Andaman & Nicobar", 11.97, 92.99, "b i", "swaraj dweep"],
  ["Neil Island", "Andaman & Nicobar", 11.83, 93.03, "b i", "shaheed dweep"],
  // Andhra Pradesh
  ["Visakhapatnam", "Andhra Pradesh", 17.69, 83.22, "c b", "vizag"],
  ["Vijayawada", "Andhra Pradesh", 16.51, 80.65, "c"],
  ["Tirupati", "Andhra Pradesh", 13.63, 79.42, "s", "tirumala"],
  ["Araku Valley", "Andhra Pradesh", 18.33, 82.87, "hs n"],
  ["Gandikota", "Andhra Pradesh", 14.81, 78.29, "h n"],
  // Arunachal Pradesh
  ["Tawang", "Arunachal Pradesh", 27.59, 91.86, "m s"],
  ["Ziro", "Arunachal Pradesh", 27.55, 93.83, "m n"],
  ["Dirang", "Arunachal Pradesh", 27.36, 92.24, "m"],
  ["Itanagar", "Arunachal Pradesh", 27.08, 93.61, "n"],
  // Assam
  ["Guwahati", "Assam", 26.14, 91.74, "c s"],
  ["Kaziranga", "Assam", 26.58, 93.17, "n"],
  ["Majuli", "Assam", 26.95, 94.17, "i n"],
  ["Jorhat", "Assam", 26.75, 94.2, "n"],
  // Bihar
  ["Patna", "Bihar", 25.59, 85.14, "c"],
  ["Bodh Gaya", "Bihar", 24.7, 84.99, "s h", "bodhgaya"],
  ["Nalanda", "Bihar", 25.14, 85.44, "h"],
  ["Rajgir", "Bihar", 25.03, 85.42, "h s"],
  // Chandigarh
  ["Chandigarh", "Chandigarh", 30.73, 76.78, "c"],
  // Chhattisgarh
  ["Raipur", "Chhattisgarh", 21.25, 81.63, "c"],
  ["Jagdalpur", "Chhattisgarh", 19.07, 82.03, "n", "chitrakote"],
  // Dadra and Nagar Haveli and Daman and Diu
  ["Daman", "Dadra and Nagar Haveli and Daman and Diu", 20.4, 72.83, "b"],
  ["Diu", "Dadra and Nagar Haveli and Daman and Diu", 20.71, 70.98, "b h"],
  ["Silvassa", "Dadra and Nagar Haveli and Daman and Diu", 20.27, 73.01, "n"],
  // Delhi
  ["Delhi", "Delhi", 28.61, 77.21, "c h", "new delhi"],
  // Goa
  ["Goa", "Goa", 15.4, 73.9, "b"],
  ["Panaji", "Goa", 15.49, 73.83, "c b", "panjim"],
  ["Calangute", "Goa", 15.54, 73.76, "b"],
  ["Anjuna", "Goa", 15.58, 73.74, "b"],
  ["Vagator", "Goa", 15.6, 73.74, "b"],
  ["Arambol", "Goa", 15.68, 73.7, "b"],
  ["Palolem", "Goa", 15.01, 74.02, "b"],
  ["Margao", "Goa", 15.28, 73.96, "c", "madgaon"],
  // Gujarat
  ["Ahmedabad", "Gujarat", 23.02, 72.57, "c h"],
  ["Surat", "Gujarat", 21.17, 72.83, "c"],
  ["Vadodara", "Gujarat", 22.31, 73.18, "c h", "baroda"],
  ["Rajkot", "Gujarat", 22.3, 70.8, "c"],
  ["Rann of Kutch", "Gujarat", 23.83, 69.67, "d n", "dhordo kutch"],
  ["Bhuj", "Gujarat", 23.24, 69.67, "h d"],
  ["Dwarka", "Gujarat", 22.24, 68.97, "s b"],
  ["Somnath", "Gujarat", 20.89, 70.4, "s b"],
  ["Gir National Park", "Gujarat", 21.17, 70.6, "n", "sasan gir"],
  ["Statue of Unity", "Gujarat", 21.84, 73.72, "h", "kevadia ekta nagar"],
  ["Saputara", "Gujarat", 20.58, 73.75, "hs"],
  // Haryana
  ["Gurugram", "Haryana", 28.46, 77.03, "c", "gurgaon"],
  ["Kurukshetra", "Haryana", 29.97, 76.88, "s h"],
  // Himachal Pradesh
  ["Manali", "Himachal Pradesh", 32.24, 77.19, "m"],
  ["Shimla", "Himachal Pradesh", 31.1, 77.17, "m hs"],
  ["Kasol", "Himachal Pradesh", 32.01, 77.31, "m n"],
  ["Kheerganga", "Himachal Pradesh", 31.99, 77.51, "m n"],
  ["Tosh", "Himachal Pradesh", 32.01, 77.45, "m"],
  ["Dharamshala", "Himachal Pradesh", 32.22, 76.32, "m s"],
  ["McLeod Ganj", "Himachal Pradesh", 32.24, 76.32, "m s", "mcleodganj"],
  ["Spiti Valley", "Himachal Pradesh", 32.23, 78.07, "m d", "kaza spiti"],
  ["Dalhousie", "Himachal Pradesh", 32.54, 75.97, "m hs"],
  ["Kasauli", "Himachal Pradesh", 30.9, 76.96, "hs"],
  ["Bir Billing", "Himachal Pradesh", 32.05, 76.72, "m", "bir"],
  ["Tirthan Valley", "Himachal Pradesh", 31.64, 77.36, "m n"],
  ["Jibhi", "Himachal Pradesh", 31.59, 77.37, "m n"],
  ["Kullu", "Himachal Pradesh", 31.96, 77.11, "m"],
  ["Chitkul", "Himachal Pradesh", 31.35, 78.44, "m"],
  // Jammu & Kashmir
  ["Srinagar", "Jammu & Kashmir", 34.08, 74.8, "m n"],
  ["Gulmarg", "Jammu & Kashmir", 34.05, 74.38, "m"],
  ["Pahalgam", "Jammu & Kashmir", 34.02, 75.32, "m n"],
  ["Sonamarg", "Jammu & Kashmir", 34.3, 75.29, "m"],
  ["Jammu", "Jammu & Kashmir", 32.73, 74.86, "c s"],
  ["Katra", "Jammu & Kashmir", 32.99, 74.93, "s m", "vaishno devi"],
  // Jharkhand
  ["Ranchi", "Jharkhand", 23.34, 85.31, "c n"],
  ["Deoghar", "Jharkhand", 24.48, 86.7, "s"],
  ["Netarhat", "Jharkhand", 23.48, 84.27, "hs"],
  // Karnataka
  ["Bengaluru", "Karnataka", 12.97, 77.59, "c", "bangalore"],
  ["Mysuru", "Karnataka", 12.3, 76.64, "h", "mysore"],
  ["Coorg", "Karnataka", 12.42, 75.74, "hs n", "madikeri kodagu"],
  ["Hampi", "Karnataka", 15.34, 76.46, "h"],
  ["Gokarna", "Karnataka", 14.55, 74.32, "b s"],
  ["Chikmagalur", "Karnataka", 13.32, 75.77, "hs n", "chikkamagaluru"],
  ["Udupi", "Karnataka", 13.34, 74.75, "s b"],
  ["Mangaluru", "Karnataka", 12.91, 74.86, "c b", "mangalore"],
  ["Badami", "Karnataka", 15.92, 75.68, "h"],
  ["Dandeli", "Karnataka", 15.25, 74.62, "n"],
  ["Murudeshwar", "Karnataka", 14.09, 74.48, "b s"],
  ["Sakleshpur", "Karnataka", 12.94, 75.79, "hs n"],
  // Kerala
  ["Kochi", "Kerala", 9.93, 76.27, "c h b", "cochin"],
  ["Munnar", "Kerala", 10.09, 77.06, "hs m"],
  ["Alappuzha", "Kerala", 9.5, 76.34, "n", "alleppey"],
  ["Varkala", "Kerala", 8.73, 76.72, "b"],
  ["Kovalam", "Kerala", 8.4, 76.98, "b"],
  ["Thiruvananthapuram", "Kerala", 8.52, 76.94, "c", "trivandrum"],
  ["Wayanad", "Kerala", 11.61, 76.08, "n hs"],
  ["Thekkady", "Kerala", 9.6, 77.16, "n"],
  ["Kumarakom", "Kerala", 9.62, 76.43, "n"],
  ["Kozhikode", "Kerala", 11.26, 75.78, "c b", "calicut"],
  ["Thrissur", "Kerala", 10.53, 76.21, "s"],
  // Ladakh
  ["Leh", "Ladakh", 34.15, 77.58, "m d"],
  ["Nubra Valley", "Ladakh", 34.55, 77.56, "m d"],
  ["Pangong Tso", "Ladakh", 33.92, 78.45, "m n", "pangong lake"],
  ["Tso Moriri", "Ladakh", 32.9, 78.31, "m n"],
  ["Kargil", "Ladakh", 34.56, 76.13, "m"],
  // Lakshadweep
  ["Agatti", "Lakshadweep", 10.86, 72.19, "b i"],
  ["Kavaratti", "Lakshadweep", 10.57, 72.64, "b i"],
  // Madhya Pradesh
  ["Bhopal", "Madhya Pradesh", 23.26, 77.41, "c"],
  ["Indore", "Madhya Pradesh", 22.72, 75.86, "c"],
  ["Ujjain", "Madhya Pradesh", 23.18, 75.78, "s"],
  ["Omkareshwar", "Madhya Pradesh", 22.24, 76.15, "s"],
  ["Khajuraho", "Madhya Pradesh", 24.85, 79.92, "h"],
  ["Gwalior", "Madhya Pradesh", 26.22, 78.18, "h"],
  ["Orchha", "Madhya Pradesh", 25.35, 78.64, "h"],
  ["Mandu", "Madhya Pradesh", 22.34, 75.4, "h"],
  ["Sanchi", "Madhya Pradesh", 23.48, 77.74, "h s"],
  ["Pachmarhi", "Madhya Pradesh", 22.47, 78.43, "hs n"],
  ["Bandhavgarh", "Madhya Pradesh", 23.7, 81.03, "n"],
  ["Kanha National Park", "Madhya Pradesh", 22.33, 80.61, "n", "kanha"],
  ["Jabalpur", "Madhya Pradesh", 23.18, 79.99, "c n", "bhedaghat"],
  // Maharashtra
  ["Mumbai", "Maharashtra", 19.08, 72.88, "c b", "bombay"],
  ["Pune", "Maharashtra", 18.52, 73.86, "c", "poona"],
  ["Lonavala", "Maharashtra", 18.75, 73.41, "hs", "khandala"],
  ["Mahabaleshwar", "Maharashtra", 17.92, 73.66, "hs"],
  ["Panchgani", "Maharashtra", 17.92, 73.8, "hs"],
  ["Matheran", "Maharashtra", 18.99, 73.27, "hs"],
  ["Igatpuri", "Maharashtra", 19.7, 73.56, "hs n"],
  ["Bhandardara", "Maharashtra", 19.54, 73.76, "n"],
  ["Nashik", "Maharashtra", 20.0, 73.79, "s"],
  ["Shirdi", "Maharashtra", 19.77, 74.48, "s"],
  ["Chhatrapati Sambhajinagar", "Maharashtra", 19.88, 75.34, "h", "aurangabad"],
  ["Ajanta Caves", "Maharashtra", 20.55, 75.7, "h", "ajanta"],
  ["Ellora Caves", "Maharashtra", 20.03, 75.18, "h", "ellora"],
  ["Alibaug", "Maharashtra", 18.64, 72.87, "b"],
  ["Tarkarli", "Maharashtra", 16.03, 73.47, "b", "malvan"],
  ["Kolhapur", "Maharashtra", 16.7, 74.24, "s"],
  ["Nagpur", "Maharashtra", 21.15, 79.09, "c"],
  // Manipur
  ["Imphal", "Manipur", 24.82, 93.94, "c"],
  ["Loktak Lake", "Manipur", 24.55, 93.8, "n"],
  // Meghalaya
  ["Shillong", "Meghalaya", 25.58, 91.89, "hs"],
  ["Cherrapunji", "Meghalaya", 25.27, 91.73, "n", "sohra"],
  ["Dawki", "Meghalaya", 25.18, 92.02, "n"],
  ["Mawlynnong", "Meghalaya", 25.2, 91.92, "n"],
  // Mizoram
  ["Aizawl", "Mizoram", 23.73, 92.72, "hs"],
  // Nagaland
  ["Kohima", "Nagaland", 25.67, 94.11, "hs"],
  ["Dzükou Valley", "Nagaland", 25.56, 94.07, "m n", "dzukou"],
  // Odisha
  ["Bhubaneswar", "Odisha", 20.3, 85.82, "c h"],
  ["Puri", "Odisha", 19.81, 85.83, "s b"],
  ["Konark", "Odisha", 19.89, 86.09, "h b"],
  ["Chilika Lake", "Odisha", 19.72, 85.32, "n"],
  // Puducherry
  ["Puducherry", "Puducherry", 11.94, 79.81, "b h", "pondicherry pondy"],
  // Punjab
  ["Amritsar", "Punjab", 31.63, 74.87, "s h"],
  ["Ludhiana", "Punjab", 30.9, 75.86, "c"],
  ["Anandpur Sahib", "Punjab", 31.24, 76.5, "s"],
  // Rajasthan
  ["Jaipur", "Rajasthan", 26.91, 75.79, "h c"],
  ["Udaipur", "Rajasthan", 24.59, 73.71, "h"],
  ["Jodhpur", "Rajasthan", 26.24, 73.02, "h d"],
  ["Jaisalmer", "Rajasthan", 26.92, 70.91, "d h"],
  ["Pushkar", "Rajasthan", 26.49, 74.55, "s d"],
  ["Ajmer", "Rajasthan", 26.45, 74.64, "s"],
  ["Mount Abu", "Rajasthan", 24.59, 72.71, "hs"],
  ["Bikaner", "Rajasthan", 28.02, 73.31, "d h"],
  ["Chittorgarh", "Rajasthan", 24.88, 74.62, "h"],
  ["Ranthambore", "Rajasthan", 26.02, 76.35, "n", "sawai madhopur"],
  ["Bundi", "Rajasthan", 25.44, 75.64, "h"],
  ["Kumbhalgarh", "Rajasthan", 25.15, 73.58, "h"],
  // Sikkim
  ["Gangtok", "Sikkim", 27.33, 88.61, "m"],
  ["Pelling", "Sikkim", 27.3, 88.24, "m"],
  ["Lachung", "Sikkim", 27.69, 88.74, "m"],
  ["Lachen", "Sikkim", 27.72, 88.56, "m"],
  ["Yuksom", "Sikkim", 27.37, 88.22, "m"],
  // Tamil Nadu
  ["Chennai", "Tamil Nadu", 13.08, 80.27, "c b", "madras"],
  ["Ooty", "Tamil Nadu", 11.41, 76.7, "hs", "udhagamandalam"],
  ["Coonoor", "Tamil Nadu", 11.35, 76.8, "hs"],
  ["Kodaikanal", "Tamil Nadu", 10.24, 77.49, "hs"],
  ["Yercaud", "Tamil Nadu", 11.78, 78.21, "hs"],
  ["Madurai", "Tamil Nadu", 9.93, 78.12, "s h"],
  ["Mahabalipuram", "Tamil Nadu", 12.62, 80.19, "h b", "mamallapuram"],
  ["Rameswaram", "Tamil Nadu", 9.29, 79.31, "s b"],
  ["Kanyakumari", "Tamil Nadu", 8.08, 77.54, "b s"],
  ["Thanjavur", "Tamil Nadu", 10.79, 79.14, "h s", "tanjore"],
  ["Tiruvannamalai", "Tamil Nadu", 12.23, 79.07, "s"],
  ["Coimbatore", "Tamil Nadu", 11.02, 76.96, "c"],
  // Telangana
  ["Hyderabad", "Telangana", 17.39, 78.49, "c h"],
  ["Warangal", "Telangana", 17.97, 79.59, "h"],
  // Tripura
  ["Agartala", "Tripura", 23.83, 91.29, "c"],
  // Uttar Pradesh
  ["Varanasi", "Uttar Pradesh", 25.32, 83.01, "s h", "banaras benares kashi"],
  ["Sarnath", "Uttar Pradesh", 25.38, 83.02, "s h"],
  ["Agra", "Uttar Pradesh", 27.18, 78.01, "h", "taj mahal"],
  ["Lucknow", "Uttar Pradesh", 26.85, 80.95, "c h"],
  ["Prayagraj", "Uttar Pradesh", 25.44, 81.85, "s", "allahabad"],
  ["Mathura", "Uttar Pradesh", 27.49, 77.67, "s"],
  ["Vrindavan", "Uttar Pradesh", 27.58, 77.7, "s"],
  ["Ayodhya", "Uttar Pradesh", 26.8, 82.2, "s"],
  ["Noida", "Uttar Pradesh", 28.54, 77.39, "c"],
  // Uttarakhand
  ["Rishikesh", "Uttarakhand", 30.09, 78.27, "s m"],
  ["Haridwar", "Uttarakhand", 29.95, 78.16, "s"],
  ["Mussoorie", "Uttarakhand", 30.46, 78.07, "hs m"],
  ["Nainital", "Uttarakhand", 29.38, 79.46, "hs m"],
  ["Dehradun", "Uttarakhand", 30.32, 78.03, "c"],
  ["Auli", "Uttarakhand", 30.53, 79.57, "m"],
  ["Chopta", "Uttarakhand", 30.35, 79.03, "m"],
  ["Kedarnath", "Uttarakhand", 30.73, 79.07, "s m"],
  ["Badrinath", "Uttarakhand", 30.74, 79.49, "s m"],
  ["Valley of Flowers", "Uttarakhand", 30.73, 79.61, "m n"],
  ["Jim Corbett", "Uttarakhand", 29.39, 79.13, "n", "corbett ramnagar"],
  ["Lansdowne", "Uttarakhand", 29.84, 78.68, "hs"],
  ["Almora", "Uttarakhand", 29.6, 79.66, "hs"],
  ["Mukteshwar", "Uttarakhand", 29.47, 79.65, "hs"],
  // West Bengal
  ["Kolkata", "West Bengal", 22.57, 88.36, "c h", "calcutta"],
  ["Darjeeling", "West Bengal", 27.04, 88.26, "hs m"],
  ["Kalimpong", "West Bengal", 27.06, 88.47, "hs"],
  ["Siliguri", "West Bengal", 26.73, 88.4, "c"],
  ["Sundarbans", "West Bengal", 22.17, 88.8, "n"],
  ["Digha", "West Bengal", 21.63, 87.51, "b"],
  ["Shantiniketan", "West Bengal", 23.68, 87.68, "h"],
];

const WORLD: [city: string, country: string, lat: number, lng: number, tags: string, aliases?: string][] = [
  ["Kathmandu", "Nepal", 27.72, 85.32, "m s h"],
  ["Pokhara", "Nepal", 28.21, 83.99, "m n"],
  ["Thimphu", "Bhutan", 27.47, 89.64, "m s"],
  ["Paro", "Bhutan", 27.43, 89.42, "m s"],
  ["Colombo", "Sri Lanka", 6.93, 79.86, "c b"],
  ["Ella", "Sri Lanka", 6.87, 81.05, "hs n"],
  ["Malé", "Maldives", 4.18, 73.51, "b i", "male maldives"],
  ["Dubai", "United Arab Emirates", 25.2, 55.27, "c d"],
  ["Abu Dhabi", "United Arab Emirates", 24.45, 54.38, "c d"],
  ["Bangkok", "Thailand", 13.76, 100.5, "c"],
  ["Phuket", "Thailand", 7.88, 98.39, "b i"],
  ["Krabi", "Thailand", 8.09, 98.91, "b"],
  ["Bali", "Indonesia", -8.41, 115.19, "b i s"],
  ["Singapore", "Singapore", 1.35, 103.82, "c"],
  ["Kuala Lumpur", "Malaysia", 3.14, 101.69, "c"],
  ["Hanoi", "Vietnam", 21.03, 105.85, "c h"],
  ["Ho Chi Minh City", "Vietnam", 10.82, 106.63, "c", "saigon"],
  ["Siem Reap", "Cambodia", 13.36, 103.86, "h"],
  ["Tokyo", "Japan", 35.68, 139.69, "c"],
  ["Istanbul", "Türkiye", 41.01, 28.98, "c h"],
  ["Baku", "Azerbaijan", 40.41, 49.87, "c"],
  ["Tbilisi", "Georgia", 41.72, 44.79, "c h"],
  ["Almaty", "Kazakhstan", 43.24, 76.89, "c m"],
  ["Paris", "France", 48.86, 2.35, "c h"],
  ["London", "United Kingdom", 51.51, -0.13, "c h"],
  ["New York", "United States", 40.71, -74.01, "c"],
];

const TAG_MAP: Record<string, string> = {
  m: "mountain",
  b: "beach",
  h: "heritage",
  s: "spiritual",
  c: "city",
  n: "nature",
  d: "desert",
  i: "island",
  hs: "hill-station",
};

export interface CuratedDestination extends DestinationInput {
  key: string;
  search: string;
}

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const CURATED: CuratedDestination[] = [
  ...INDIA.map(([city, state, lat, lng, tags, aliases]) => ({
    key: `${city}|${state}`,
    city,
    state,
    country: "India",
    latitude: lat,
    longitude: lng,
    tags: tags.split(" ").map((t) => TAG_MAP[t]).filter(Boolean),
    search: norm(`${city} ${aliases ?? ""}`),
  })),
  ...WORLD.map(([city, country, lat, lng, tags, aliases]) => ({
    key: `${city}|${country}`,
    city,
    state: null,
    country,
    latitude: lat,
    longitude: lng,
    tags: tags.split(" ").map((t) => TAG_MAP[t]).filter(Boolean),
    search: norm(`${city} ${country} ${aliases ?? ""}`),
  })),
];

export function searchCurated(query: string, limit = 8): CuratedDestination[] {
  const q = norm(query);
  if (!q) return [];
  const scored: { d: CuratedDestination; s: number }[] = [];
  for (const d of CURATED) {
    const city = norm(d.city);
    let s = -1;
    if (city === q) s = 100;
    else if (city.startsWith(q)) s = 80;
    else if (d.search.split(" ").some((w) => w.startsWith(q))) s = 60;
    else if (d.search.includes(q)) s = 40;
    else if (d.state && norm(d.state).startsWith(q)) s = 20;
    if (s >= 0) scored.push({ d, s: s + (d.country === "India" ? 1 : 0) });
  }
  return scored
    .sort((a, b) => b.s - a.s || a.d.city.localeCompare(b.d.city))
    .slice(0, limit)
    .map((x) => x.d);
}

/** Tags for a city name if it exists in the curated set (used to enrich geocoded results). */
export function curatedTagsFor(city: string, state: string | null, country = "India"): string[] {
  const c = norm(city);
  const pool = CURATED.filter((d) => norm(d.country) === norm(country));
  const hit =
    pool.find((d) => norm(d.city) === c && (!state || !d.state || norm(d.state) === norm(state))) ??
    pool.find((d) => d.search.split(" ").includes(c) && (!state || !d.state || norm(d.state) === norm(state)));
  return hit?.tags ?? [];
}

export const INDIAN_STATES = Array.from(new Set(INDIA.map((r) => r[1]))).sort();

export function destinationKey(d: { city: string; state: string | null; country: string }): string {
  return `${norm(d.city)}|${norm(d.state ?? "")}|${norm(d.country)}`;
}
