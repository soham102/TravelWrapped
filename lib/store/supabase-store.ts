"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "../config";
import { getSupabase } from "../supabase/client";
import type { AuthUser, Destination, Invitation, Photo, Profile, Trip, TripInput, WrappedRecord } from "../types";
import { haversineKm, uid } from "../utils";
import type { InviteResult, Store } from "./types";

interface TripRow {
  id: string;
  trip_name: string;
  start_date: string;
  end_date: string;
  trip_type: Trip["trip_type"];
  travel_category: Trip["travel_category"];
  notes: string | null;
  memorable_experience: string | null;
  distance_km: number | string | null;
  created_at: string;
  destinations: (Destination & { position: number })[] | null;
  travel_photos: { id: string; trip_id: string; storage_path: string; caption: string | null }[] | null;
}

const TRIP_SELECT =
  "id, trip_name, start_date, end_date, trip_type, travel_category, notes, memorable_experience, distance_km, created_at, destinations(id, city, state, country, latitude, longitude, tags, position), travel_photos(id, trip_id, storage_path, caption)";

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export class SupabaseStore implements Store {
  mode = "supabase" as const;
  private get sb(): SupabaseClient {
    return getSupabase();
  }

  /* ───────── Auth ───────── */

  async getUser(): Promise<AuthUser | null> {
    const { data } = await this.sb.auth.getSession();
    const u = data.session?.user;
    return u ? { id: u.id, email: u.email ?? null } : null;
  }

  onAuthChange(cb: (user: AuthUser | null, event?: string) => void) {
    const { data } = this.sb.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      cb(u ? { id: u.id, email: u.email ?? null } : null, event);
    });
    return () => data.subscription.unsubscribe();
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    fail(error);
    return { needsConfirmation: !data.session };
  }

  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    fail(error);
  }

  async signInWithGoogle(next = "/dashboard") {
    const { error } = await this.sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    fail(error);
  }

  async authCallbackError() {
    // initialize() is cached: it returns the result of the one-time URL detection (code exchange or error params).
    const { error } = await this.sb.auth.initialize();
    return error ? error.message : null;
  }

  async sendPasswordReset(email: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    fail(error);
  }

  async updatePassword(password: string) {
    const { error } = await this.sb.auth.updateUser({ password });
    fail(error);
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async getAccessToken() {
    const { data } = await this.sb.auth.getSession();
    return data.session?.access_token ?? null;
  }

  private async requireUser(): Promise<AuthUser> {
    const u = await this.getUser();
    if (!u) throw new Error("Please log in again");
    return u;
  }

  /* ───────── Profile ───────── */

  async getProfile(): Promise<Profile | null> {
    const u = await this.getUser();
    if (!u) return null;
    const { data, error } = await this.sb
      .from("profiles")
      .select("id, full_name, email, avatar_url, home_city, referral_code, created_at")
      .eq("id", u.id)
      .maybeSingle();
    fail(error);
    return data as Profile | null;
  }

  async updateProfile(patch: Partial<Pick<Profile, "full_name" | "home_city" | "avatar_url">>) {
    const u = await this.requireUser();
    const { data, error } = await this.sb
      .from("profiles")
      .update(patch)
      .eq("id", u.id)
      .select("id, full_name, email, avatar_url, home_city, referral_code, created_at")
      .single();
    fail(error);
    return data as Profile;
  }

  async claimReferral(code: string) {
    const { data, error } = await this.sb.rpc("claim_referral", { code });
    if (error) return false;
    return Boolean(data);
  }

  /* ───────── Trips ───────── */

  private async hydrate(rows: TripRow[]): Promise<Trip[]> {
    const paths = rows.flatMap((r) => (r.travel_photos ?? []).map((p) => p.storage_path));
    const urls = new Map<string, string>();
    if (paths.length) {
      const { data } = await this.sb.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
      for (const s of data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
    }
    return rows.map((r) => ({
      id: r.id,
      trip_name: r.trip_name,
      start_date: r.start_date,
      end_date: r.end_date,
      trip_type: r.trip_type,
      travel_category: r.travel_category,
      notes: r.notes,
      memorable_experience: r.memorable_experience,
      distance_km: r.distance_km == null ? null : Number(r.distance_km),
      created_at: r.created_at,
      destinations: [...(r.destinations ?? [])]
        .sort((a, b) => a.position - b.position)
        .map(({ id, city, state, country, latitude, longitude, tags }) => ({
          id,
          city,
          state,
          country,
          latitude,
          longitude,
          tags: tags ?? [],
        })),
      photos: (r.travel_photos ?? [])
        .map((p) => ({ id: p.id, trip_id: p.trip_id, path: p.storage_path, url: urls.get(p.storage_path) ?? "", caption: p.caption }))
        .filter((p) => p.url),
    }));
  }

  async listTrips(): Promise<Trip[]> {
    const { data, error } = await this.sb.from("trips").select(TRIP_SELECT).order("start_date", { ascending: false });
    fail(error);
    return this.hydrate((data ?? []) as unknown as TripRow[]);
  }

  async getTrip(id: string): Promise<Trip | null> {
    const { data, error } = await this.sb.from("trips").select(TRIP_SELECT).eq("id", id).maybeSingle();
    fail(error);
    if (!data) return null;
    return (await this.hydrate([data as unknown as TripRow]))[0];
  }

  async saveTrip(input: TripInput, id?: string): Promise<Trip> {
    const u = await this.requireUser();
    const { destinations, ...fields } = input;
    let tripId = id;
    if (tripId) {
      const { error } = await this.sb.from("trips").update(fields).eq("id", tripId);
      fail(error);
      const { error: delErr } = await this.sb.from("destinations").delete().eq("trip_id", tripId);
      fail(delErr);
    } else {
      const { data, error } = await this.sb.from("trips").insert({ ...fields, user_id: u.id }).select("id").single();
      fail(error);
      tripId = (data as { id: string }).id;
    }
    if (destinations.length) {
      const rows = destinations.map((d, i) => {
        const prev = destinations[i - 1];
        const dist =
          prev && prev.latitude != null && prev.longitude != null && d.latitude != null && d.longitude != null
            ? Math.round(haversineKm([prev.latitude, prev.longitude], [d.latitude, d.longitude]) * 10) / 10
            : null;
        return { ...d, trip_id: tripId, user_id: u.id, position: i, distance_from_previous: dist };
      });
      const { error } = await this.sb.from("destinations").insert(rows);
      fail(error);
    }
    const trip = await this.getTrip(tripId!);
    if (!trip) throw new Error("Trip could not be loaded after saving");
    return trip;
  }

  async deleteTrip(id: string) {
    const { data: photos } = await this.sb.from("travel_photos").select("storage_path").eq("trip_id", id);
    const paths = (photos ?? []).map((p: { storage_path: string }) => p.storage_path);
    if (paths.length) await this.sb.storage.from(PHOTO_BUCKET).remove(paths);
    const { error } = await this.sb.from("trips").delete().eq("id", id);
    fail(error);
  }

  async uploadPhoto(tripId: string, file: Blob, caption: string | null = null): Promise<Photo> {
    const u = await this.requireUser();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${u.id}/${tripId}/${uid()}.${ext}`;
    const { error: upErr } = await this.sb.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    fail(upErr);
    const { data, error } = await this.sb
      .from("travel_photos")
      .insert({ trip_id: tripId, user_id: u.id, storage_path: path, caption })
      .select("id, trip_id, storage_path, caption")
      .single();
    if (error) {
      await this.sb.storage.from(PHOTO_BUCKET).remove([path]);
      fail(error);
    }
    const { data: signed } = await this.sb.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60 * 6);
    const row = data as { id: string; trip_id: string; storage_path: string; caption: string | null };
    return { id: row.id, trip_id: row.trip_id, path, url: signed?.signedUrl ?? "", caption: row.caption };
  }

  async deletePhoto(photo: Photo) {
    await this.sb.storage.from(PHOTO_BUCKET).remove([photo.path]);
    const { error } = await this.sb.from("travel_photos").delete().eq("id", photo.id);
    fail(error);
  }

  /* ───────── Wrapped ───────── */

  async listWrapped(): Promise<WrappedRecord[]> {
    const u = await this.getUser();
    if (!u) return [];
    const { data, error } = await this.sb
      .from("travel_wrapped")
      .select("*")
      .eq("user_id", u.id)
      .order("year", { ascending: false });
    fail(error);
    return (data ?? []) as WrappedRecord[];
  }

  async saveWrapped(year: number, snapshot: WrappedRecord["stats"]): Promise<WrappedRecord> {
    const u = await this.requireUser();
    const { data, error } = await this.sb
      .from("travel_wrapped")
      .upsert(
        {
          user_id: u.id,
          year,
          title: `${snapshot.ownerName}'s ${year} Travel Wrapped`,
          personality: snapshot.personality.title,
          stats: snapshot,
        },
        { onConflict: "user_id,year" },
      )
      .select("*")
      .single();
    fail(error);
    return data as WrappedRecord;
  }

  async setWrappedPublic(id: string, isPublic: boolean): Promise<WrappedRecord> {
    const { data, error } = await this.sb
      .from("travel_wrapped")
      .update({ is_public: isPublic })
      .eq("id", id)
      .select("*")
      .single();
    fail(error);
    return data as WrappedRecord;
  }

  /* ───────── Invitations ───────── */

  async listInvitations(): Promise<Invitation[]> {
    const { data, error } = await this.sb
      .from("invitations")
      .select("id, recipient_email, status, message, created_at")
      .order("created_at", { ascending: false });
    fail(error);
    return (data ?? []) as Invitation[];
  }

  async sendInvitations(emails: string[], message: string): Promise<InviteResult> {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Please log in again");
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ emails, message }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not send invitations");
    return json as InviteResult;
  }

  async deleteInvitation(id: string) {
    const { error } = await this.sb.from("invitations").delete().eq("id", id);
    fail(error);
  }
}
