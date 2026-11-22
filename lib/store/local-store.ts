"use client";

import { MAX_INVITES_PER_DAY } from "../config";
import type { AuthUser, Invitation, Photo, Profile, Trip, TripInput, WrappedRecord } from "../types";
import { isValidEmail, uid } from "../utils";
import { buildInviteMailto, referralLink } from "../invite";
import type { InviteResult, Store } from "./types";

/**
 * Local mode: a fully working, browser-only backend used when Supabase isn't configured.
 * Data lives in localStorage on this device only. Great for demos and local development.
 */

interface Account {
  id: string;
  email: string;
  pwHash: string;
  full_name: string;
}
interface LocalDb {
  profile: Profile;
  trips: Trip[];
  wrapped: WrappedRecord[];
  invitations: Invitation[];
}

const ACCOUNTS = "tw_local_accounts";
const SESSION = "tw_local_session";
const dbKey = (id: string) => `tw_local_db_${id}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("This browser's storage is full. Remove some photos, or connect Supabase for cloud storage.");
  }
}

async function hash(email: string, pw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tw:${email.toLowerCase()}:${pw}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class LocalStore implements Store {
  mode = "local" as const;
  private listeners = new Set<(u: AuthUser | null, e?: string) => void>();

  private emit(event: string) {
    void this.getUser().then((u) => this.listeners.forEach((l) => l(u, event)));
  }

  private session(): string | null {
    return read<string | null>(SESSION, null);
  }

  private db(): LocalDb {
    const id = this.session();
    if (!id) throw new Error("Please log in again");
    const db = read<LocalDb | null>(dbKey(id), null);
    if (!db) throw new Error("Local account data missing");
    return db;
  }
  private save(db: LocalDb) {
    write(dbKey(db.profile.id), db);
  }

  /* ───────── Auth ───────── */

  async getUser(): Promise<AuthUser | null> {
    const id = this.session();
    if (!id) return null;
    const db = read<LocalDb | null>(dbKey(id), null);
    return db ? { id, email: db.profile.email } : null;
  }

  onAuthChange(cb: (user: AuthUser | null, event?: string) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  async signUp(email: string, password: string, fullName: string) {
    const accounts = read<Record<string, Account>>(ACCOUNTS, {});
    const key = email.toLowerCase();
    if (accounts[key]) throw new Error("An account with this email already exists on this device. Try logging in.");
    const id = uid();
    accounts[key] = { id, email: key, pwHash: await hash(key, password), full_name: fullName };
    write(ACCOUNTS, accounts);
    const profile: Profile = {
      id,
      email: key,
      full_name: fullName,
      avatar_url: null,
      home_city: null,
      referral_code: id.replace(/-/g, "").slice(0, 8),
      created_at: new Date().toISOString(),
    };
    write(dbKey(id), { profile, trips: [], wrapped: [], invitations: [] } satisfies LocalDb);
    write(SESSION, id);
    this.emit("SIGNED_IN");
    return { needsConfirmation: false };
  }

  async signIn(email: string, password: string) {
    const accounts = read<Record<string, Account>>(ACCOUNTS, {});
    const acc = accounts[email.toLowerCase()];
    if (!acc || acc.pwHash !== (await hash(email, password))) throw new Error("Invalid email or password");
    write(SESSION, acc.id);
    this.emit("SIGNED_IN");
  }

  async signInWithGoogle() {
    throw new Error("Google sign-in needs Supabase to be configured. Use email & password in local mode.");
  }

  async sendPasswordReset() {
    throw new Error("Password reset emails need Supabase. In local mode, accounts live only in this browser.");
  }

  async updatePassword(password: string) {
    const db = this.db();
    const accounts = read<Record<string, Account>>(ACCOUNTS, {});
    const key = db.profile.email!;
    accounts[key].pwHash = await hash(key, password);
    write(ACCOUNTS, accounts);
  }

  async signOut() {
    window.localStorage.removeItem(SESSION);
    this.emit("SIGNED_OUT");
  }

  async getAccessToken() {
    return null;
  }

  /* ───────── Profile ───────── */

  async getProfile() {
    if (!this.session()) return null;
    return this.db().profile;
  }

  async updateProfile(patch: Partial<Pick<Profile, "full_name" | "home_city" | "avatar_url">>) {
    const db = this.db();
    db.profile = { ...db.profile, ...patch };
    this.save(db);
    return db.profile;
  }

  async claimReferral() {
    return false; // referrals are tracked server-side only
  }

  /* ───────── Trips ───────── */

  async listTrips() {
    return [...this.db().trips].sort((a, b) => b.start_date.localeCompare(a.start_date));
  }

  async getTrip(id: string) {
    return this.db().trips.find((t) => t.id === id) ?? null;
  }

  async saveTrip(input: TripInput, id?: string): Promise<Trip> {
    const db = this.db();
    const existing = id ? db.trips.find((t) => t.id === id) : undefined;
    const trip: Trip = {
      ...input,
      id: existing?.id ?? uid(),
      created_at: existing?.created_at ?? new Date().toISOString(),
      destinations: input.destinations.map((d) => ({ ...d, id: uid() })),
      photos: existing?.photos ?? [],
    };
    db.trips = existing ? db.trips.map((t) => (t.id === trip.id ? trip : t)) : [...db.trips, trip];
    this.save(db);
    return trip;
  }

  async deleteTrip(id: string) {
    const db = this.db();
    db.trips = db.trips.filter((t) => t.id !== id);
    this.save(db);
  }

  async uploadPhoto(tripId: string, file: Blob, caption: string | null = null): Promise<Photo> {
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Could not read image"));
      r.readAsDataURL(file);
    });
    const db = this.db();
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) throw new Error("Trip not found");
    const photo: Photo = { id: uid(), trip_id: tripId, path: `local/${tripId}`, url, caption };
    trip.photos = [...trip.photos, photo];
    this.save(db);
    return photo;
  }

  async deletePhoto(photo: Photo) {
    const db = this.db();
    const trip = db.trips.find((t) => t.id === photo.trip_id);
    if (trip) trip.photos = trip.photos.filter((p) => p.id !== photo.id);
    this.save(db);
  }

  /* ───────── Wrapped ───────── */

  async listWrapped() {
    if (!this.session()) return [];
    return [...this.db().wrapped].sort((a, b) => b.year - a.year);
  }

  async saveWrapped(year: number, snapshot: WrappedRecord["stats"]) {
    const db = this.db();
    const now = new Date().toISOString();
    const existing = db.wrapped.find((w) => w.year === year);
    const rec: WrappedRecord = {
      id: existing?.id ?? uid(),
      year,
      title: `${snapshot.ownerName}'s ${year} Travel Wrapped`,
      personality: snapshot.personality.title,
      stats: snapshot,
      public_slug: existing?.public_slug ?? null,
      is_public: existing?.is_public ?? false,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    db.wrapped = existing ? db.wrapped.map((w) => (w.id === rec.id ? rec : w)) : [...db.wrapped, rec];
    this.save(db);
    return rec;
  }

  async setWrappedPublic(id: string, isPublic: boolean) {
    const db = this.db();
    const rec = db.wrapped.find((w) => w.id === id);
    if (!rec) throw new Error("Wrapped not found");
    rec.is_public = isPublic;
    rec.public_slug = isPublic ? "local" : null;
    this.save(db);
    return rec;
  }

  /* ───────── Invitations ───────── */

  async listInvitations() {
    if (!this.session()) return [];
    return [...this.db().invitations].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async sendInvitations(emails: string[], message: string): Promise<InviteResult> {
    const db = this.db();
    const dayAgo = Date.now() - 86_400_000;
    const recent = db.invitations.filter((i) => new Date(i.created_at).getTime() > dayAgo).length;
    const skipped: InviteResult["skipped"] = [];
    const created: Invitation[] = [];
    for (const raw of emails) {
      const email = raw.trim().toLowerCase();
      if (!isValidEmail(email)) skipped.push({ email, reason: "invalid email" });
      else if (email === db.profile.email) skipped.push({ email, reason: "that's you" });
      else if (db.invitations.some((i) => i.recipient_email === email)) skipped.push({ email, reason: "already invited" });
      else if (recent + created.length >= MAX_INVITES_PER_DAY) skipped.push({ email, reason: "daily limit reached" });
      else
        created.push({ id: uid(), recipient_email: email, status: "pending", message, created_at: new Date().toISOString() });
    }
    db.invitations = [...created, ...db.invitations];
    this.save(db);
    const link = referralLink(db.profile.referral_code);
    return {
      delivery: "mailto",
      created,
      skipped,
      mailto: created.length ? buildInviteMailto(created.map((c) => c.recipient_email), message, link) : undefined,
      note: "Local mode: invitations open in your own email app. Configure Supabase + Resend for server-side delivery.",
    };
  }

  async deleteInvitation(id: string) {
    const db = this.db();
    db.invitations = db.invitations.filter((i) => i.id !== id);
    this.save(db);
  }
}
