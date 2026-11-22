"use client";

import { isSupabaseConfigured } from "./config";
import { getSupabase } from "./supabase/client";
import { uid } from "./utils";

export type EventName =
  | "landing_view"
  | "signup"
  | "login"
  | "trip_created"
  | "wrapped_generated"
  | "story_download"
  | "share_click"
  | "public_view"
  | "invite_sent"
  | "referral_signup"
  | "demo_view";

export interface LocalEvent {
  name: EventName;
  user_id: string | null;
  anon_id: string;
  props: Record<string, unknown>;
  created_at: string;
}

const ANON = "tw_anon_id";
const LOCAL_EVENTS = "tw_local_events";

function anonId(): string {
  try {
    let id = localStorage.getItem(ANON);
    if (!id) {
      id = uid();
      localStorage.setItem(ANON, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/** Fire-and-forget product analytics. Never throws, never blocks the UI. */
export function track(name: EventName, props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      const anon_id = anonId();
      const path = window.location.pathname;
      if (isSupabaseConfigured) {
        const sb = getSupabase();
        const { data } = await sb.auth.getSession();
        await sb.from("events").insert({ name, props, path, anon_id, user_id: data.session?.user.id ?? null });
      } else {
        const sessionUser = localStorage.getItem("tw_local_session");
        const events = readLocalEvents();
        events.push({
          name,
          props,
          anon_id,
          user_id: sessionUser ? JSON.parse(sessionUser) : null,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem(LOCAL_EVENTS, JSON.stringify(events.slice(-2000)));
      }
    } catch {
      /* analytics must never break the product */
    }
  })();
}

/** Track at most once per browser session (e.g. landing page views). */
export function trackOnce(name: EventName, key: string, props: Record<string, unknown> = {}) {
  try {
    const k = `tw_once_${name}_${key}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    /* ignore */
  }
  track(name, props);
}

export function readLocalEvents(): LocalEvent[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_EVENTS) || "[]");
  } catch {
    return [];
  }
}
