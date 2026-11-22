"use client";

import { isSupabaseConfigured } from "../config";
import { LocalStore } from "./local-store";
import { SupabaseStore } from "./supabase-store";
import type { Store } from "./types";

let store: Store | null = null;

export function getStore(): Store {
  if (!store) store = isSupabaseConfigured ? new SupabaseStore() : new LocalStore();
  return store;
}

export type { Store, InviteResult } from "./types";
