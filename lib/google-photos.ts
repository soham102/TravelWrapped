"use client";

/**
 * Google Photos import via the Google Photos Picker API.
 *
 * Flow: OAuth token (Google Identity Services popup) → create a picker session → the user picks
 * photos in Google's own picker window → poll the session → list the picked items → download each
 * one through /api/google-photos/media (Google's media URLs need the bearer token and aren't CORS-friendly).
 *
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID (a Web OAuth client with this site in "Authorized JavaScript origins")
 * and the "Google Photos Picker API" enabled in the same Google Cloud project.
 */

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const isGooglePhotosConfigured = Boolean(GOOGLE_CLIENT_ID);

const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const API = "https://photospicker.googleapis.com/v1";
const GIS_SRC = "https://accounts.google.com/gsi/client";
/** Size of the rendition we download; the form resizes to ≤1600px anyway. */
const RENDITION = "=w1600-h1600";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}
interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}
interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (r: TokenResponse) => void;
    error_callback?: (e: { type: string; message?: string }) => void;
  }): TokenClient;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
  }
}

interface PickerSession {
  id: string;
  pickerUri: string;
  mediaItemsSet?: boolean;
  pollingConfig?: { pollInterval?: string; timeoutIn?: string };
}
interface PickedMediaItem {
  id: string;
  createTime?: string;
  type?: "PHOTO" | "VIDEO" | "TYPE_UNSPECIFIED";
  mediaFile?: { baseUrl: string; mimeType?: string; filename?: string };
}

export class GooglePhotosCancelled extends Error {
  constructor() {
    super("Google Photos import cancelled");
  }
}

let gisPromise: Promise<GoogleOAuth2> | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

/** Load Google Identity Services. Call early (e.g. on mount) so the sign-in popup opens straight from the click. */
export function loadGoogleIdentity(): Promise<GoogleOAuth2> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  gisPromise ??= new Promise<GoogleOAuth2>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google.accounts.oauth2) : reject(new Error("Google sign-in failed to load")));
    s.onerror = () => {
      gisPromise = null;
      reject(new Error("Couldn't reach Google. Check your connection and try again."));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

export function hasValidGoogleToken() {
  return !!cachedToken && cachedToken.expiresAt - 60_000 > Date.now();
}

/** Ask the user (popup) for read access to the photos they pick. Reuses a still-valid token. */
export async function getGooglePhotosToken(): Promise<string> {
  if (cachedToken && hasValidGoogleToken()) return cachedToken.value;
  const oauth2 = await loadGoogleIdentity();
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) {
          reject(r.error === "access_denied" ? new GooglePhotosCancelled() : new Error(r.error_description || "Google didn't grant access"));
          return;
        }
        cachedToken = { value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 };
        resolve(r.access_token);
      },
      error_callback: (e) =>
        reject(e.type === "popup_closed" ? new GooglePhotosCancelled() : new Error(e.type === "popup_failed_to_open" ? "Allow pop-ups to connect Google Photos" : e.message || "Google sign-in failed")),
    });
    client.requestAccessToken();
  });
}

async function api<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 401) cachedToken = null;
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `Google Photos request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** "5s" / "1800.5s" → ms */
function durationMs(d: string | undefined, fallback: number) {
  const n = d ? parseFloat(d) : NaN;
  return Number.isFinite(n) ? n * 1000 : fallback;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new GooglePhotosCancelled());
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), reject(new GooglePhotosCancelled())), { once: true });
  });
}

export interface PickOptions {
  token: string;
  /** Max photos to import (extra picks are ignored). */
  max: number;
  signal: AbortSignal;
  /** Called with the picker URL once the session exists; the UI opens it (or offers a button if pop-ups are blocked). */
  onPickerReady: (pickerUri: string) => void;
  onDownloading?: (count: number) => void;
}

/** Run one picker session and return the picked photos as Files (JPEG/PNG/WebP renditions). */
export async function pickFromGooglePhotos({
  token,
  max,
  signal,
  onPickerReady,
  onDownloading,
}: PickOptions): Promise<{ files: File[]; failed: number }> {
  const session = await api<PickerSession>(token, "/sessions", {
    method: "POST",
    body: JSON.stringify({ pickingConfig: { maxItemCount: String(Math.max(1, max)) } }),
  });
  const cleanup = () => void api(token, `/sessions/${session.id}`, { method: "DELETE" }).catch(() => {});

  try {
    // "/autoclose" makes Google close its window once the user taps Done.
    onPickerReady(`${session.pickerUri.replace(/\/$/, "")}/autoclose`);

    const interval = Math.max(1000, durationMs(session.pollingConfig?.pollInterval, 3000));
    const deadline = Date.now() + durationMs(session.pollingConfig?.timeoutIn, 30 * 60 * 1000);
    let current = session;
    while (!current.mediaItemsSet) {
      if (Date.now() > deadline) throw new Error("Google Photos picker timed out — please try again");
      await wait(interval, signal);
      current = await api<PickerSession>(token, `/sessions/${session.id}`);
    }

    const items: PickedMediaItem[] = [];
    let pageToken: string | undefined;
    do {
      const q = new URLSearchParams({ sessionId: session.id, pageSize: "100" });
      if (pageToken) q.set("pageToken", pageToken);
      const page = await api<{ mediaItems?: PickedMediaItem[]; nextPageToken?: string }>(token, `/mediaItems?${q}`);
      items.push(...(page.mediaItems ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken && items.length < max);

    const photos = items.filter((i) => i.type !== "VIDEO" && i.mediaFile?.baseUrl).slice(0, max);
    onDownloading?.(photos.length);

    const files = await Promise.all(
      photos.map(async (item) => {
        if (signal.aborted) throw new GooglePhotosCancelled();
        const res = await fetch("/api/google-photos/media", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: item.mediaFile!.baseUrl + RENDITION }),
          signal,
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        const type = blob.type || "image/jpeg";
        const base = (item.mediaFile!.filename || `google-photo-${item.id}`).replace(/\.[^.]+$/, "");
        const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
        return new File([blob], `${base}.${ext}`, {
          type,
          lastModified: item.createTime ? Date.parse(item.createTime) || Date.now() : Date.now(),
        });
      }),
    );
    const ok = files.filter((f): f is File => f !== null);
    return { files: ok, failed: photos.length - ok.length };
  } finally {
    cleanup();
  }
}
