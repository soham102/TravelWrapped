import { NextResponse } from "next/server";
import { adminClient, bearer, userClient } from "@/lib/supabase/server";

const EVENT_NAMES = [
  "landing_view",
  "signup",
  "login",
  "trip_created",
  "wrapped_generated",
  "story_download",
  "share_click",
  "public_view",
  "invite_sent",
  "referral_signup",
  "demo_view",
] as const;

export async function GET(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: auth } = await userClient(token).auth.getUser(token);
  const email = auth.user?.email?.toLowerCase();
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!email || !admins.includes(email)) return NextResponse.json({ error: "Admins only. Add your email to ADMIN_EMAILS." }, { status: 403 });

  const db = adminClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 500 });

  const head = (table: string) => db.from(table).select("*", { count: "exact", head: true });
  const n = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [users, trips, invitations, accepted, referred, wrappedRows, engagedRows, recent, ...eventCounts] = await Promise.all([
    n(head("profiles")),
    n(head("trips")),
    n(head("invitations")),
    n(head("invitations").eq("status", "accepted")),
    n(head("profiles").not("referred_by", "is", null)),
    db.from("travel_wrapped").select("user_id").limit(50000),
    db.from("events").select("user_id").in("name", ["story_download", "share_click"]).not("user_id", "is", null).limit(50000),
    db.from("events").select("name, created_at").gte("created_at", since).limit(50000),
    ...EVENT_NAMES.map((name) => n(head("events").eq("name", name))),
  ]);

  const usersWithWrapped = new Set((wrappedRows.data ?? []).map((r: { user_id: string }) => r.user_id)).size;
  const engaged = new Set((engagedRows.data ?? []).map((r: { user_id: string }) => r.user_id)).size;

  const days: Record<string, Record<string, number>> = {};
  for (let i = 13; i >= 0; i--) days[new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)] = {};
  for (const e of (recent.data ?? []) as { name: string; created_at: string }[]) {
    const d = e.created_at.slice(0, 10);
    if (days[d]) days[d][e.name] = (days[d][e.name] ?? 0) + 1;
  }

  return NextResponse.json({
    users,
    trips,
    usersWithWrapped,
    engaged,
    invitations,
    accepted,
    referred,
    events: Object.fromEntries(EVENT_NAMES.map((name, i) => [name, eventCounts[i] as number])),
    daily: Object.entries(days).map(([date, v]) => ({ date, ...v })),
  });
}
