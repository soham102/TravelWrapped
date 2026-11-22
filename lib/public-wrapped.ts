import "server-only";
import { anonClient } from "./supabase/server";
import type { WrappedSnapshot } from "./types";

export interface PublicWrappedRow {
  year: number;
  title: string | null;
  personality: string | null;
  stats: WrappedSnapshot;
  updated_at: string;
}

/** Reads a published Wrapped via a security-definer RPC (returns nothing if private or revoked). */
export async function getPublicWrapped(slug: string): Promise<PublicWrappedRow | null> {
  if (!/^[a-z0-9]{6,32}$/i.test(slug)) return null;
  const sb = anonClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_public_wrapped", { slug });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as PublicWrappedRow;
}
