export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** When Supabase isn't configured the app runs fully in "local mode" (data stays in this browser). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);


export const DISCLAIMER = "Built by Soham for the goSTOPS Build Sprint. Not an official goSTOPS product.";

export const DEFAULT_INVITE_MESSAGE =
  "Hey! I just created my Travel Wrapped 2026. It shows all the places I've explored this year in a beautiful travel story. You should create yours too!";

export const PHOTO_BUCKET = "travel-photos";
export const MAX_PHOTOS_PER_TRIP = 6;
export const MAX_INVITES_PER_DAY = 25;
