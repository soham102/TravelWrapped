"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { Card, EmptyState, PageLoader, StatTile } from "@/components/ui/misc";
import { readLocalEvents } from "@/lib/analytics";

interface Metrics {
  users: number;
  trips: number;
  usersWithWrapped: number;
  engaged: number;
  invitations: number;
  accepted: number;
  referred: number;
  events: Record<string, number>;
  daily: ({ date: string } & Record<string, number | string>)[];
}

const LABELS: Record<string, string> = {
  landing_view: "Landing views",
  signup: "Signups",
  login: "Logins",
  trip_created: "Trips created",
  wrapped_generated: "Wrapped generated",
  story_download: "Downloads",
  share_click: "Share clicks",
  public_view: "Public views",
  invite_sent: "Invite batches",
  referral_signup: "Referral signups",
  demo_view: "Demo views",
};

function localMetrics(): Metrics {
  const ev = readLocalEvents();
  const events: Record<string, number> = {};
  for (const k of Object.keys(LABELS)) events[k] = 0;
  for (const e of ev) events[e.name] = (events[e.name] ?? 0) + 1;
  const users = new Set(ev.filter((e) => e.name === "signup").map((e) => e.user_id ?? e.anon_id)).size;
  const usersWithWrapped = new Set(ev.filter((e) => e.name === "wrapped_generated").map((e) => e.user_id)).size;
  const engaged = new Set(ev.filter((e) => ["story_download", "share_click"].includes(e.name)).map((e) => e.user_id)).size;
  const days: Metrics["daily"] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const row: Metrics["daily"][number] = { date };
    for (const e of ev) if (e.created_at.slice(0, 10) === date) row[e.name] = ((row[e.name] as number) ?? 0) + 1;
    days.push(row);
  }
  const invitations = ev.filter((e) => e.name === "invite_sent").reduce((s, e) => s + Number(e.props.count ?? 1), 0);
  return { users, trips: events.trip_created, usersWithWrapped, engaged, invitations, accepted: 0, referred: 0, events, daily: days };
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default function AdminPage() {
  const { store } = useAuth();
  const [m, setM] = React.useState<Metrics | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      if (store.mode === "local") return setM(localMetrics());
      const token = await store.getAccessToken();
      const res = await fetch("/api/admin/metrics", { headers: { authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Could not load metrics");
      else setM(json);
    })();
  }, [store]);

  if (error) return <EmptyState title="Analytics unavailable" body={error} />;
  if (!m) return <PageLoader label="Loading metrics…" />;

  const funnel = Object.entries(LABELS).map(([k, label]) => ({ label, value: m.events[k] ?? 0 }));
  const daily = m.daily.map((d) => ({ date: d.date.slice(5), signups: Number(d.signup ?? 0), wrapped: Number(d.wrapped_generated ?? 0) }));

  return (
    <div>
      <PageHeader
        eyebrow={store.mode === "local" ? "Local mode · this browser only" : "All users"}
        title="Product analytics"
        subtitle="Real counts from tracked events — nothing estimated."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Real users" value={m.users} accent="navy" sub={`${m.trips} trips created`} />
        <StatTile label="Generated a Wrapped" value={pct(m.usersWithWrapped, m.users)} accent="electric" sub={`${m.usersWithWrapped} users`} />
        <StatTile label="Downloaded or shared" value={pct(m.engaged, m.users)} accent="sunset" sub={`${m.engaged} users`} />
        <StatTile label="Invitations sent" value={m.invitations} accent="jungle" sub={`${m.accepted} accepted`} />
        <StatTile label="Referral signups" value={m.referred} accent="navy" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <p className="font-display text-lg font-bold">Event totals</p>
          <p className="mb-3 text-xs text-muted">All time</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#0b102614" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#636162" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={118} tick={{ fontSize: 11, fill: "#2a2929" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#0b10260a" }} contentStyle={{ borderRadius: 12, border: "1px solid #0b102614" }} />
                <Bar dataKey="value" name="Count" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="font-display text-lg font-bold">Signups per day</p>
          <p className="mb-3 text-xs text-muted">Last 14 days</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ right: 8 }}>
                <CartesianGrid vertical={false} stroke="#0b102614" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#636162" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#636162" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: "#0b10260a" }} contentStyle={{ borderRadius: 12, border: "1px solid #0b102614" }} />
                <Bar dataKey="signups" name="Signups" fill="#ff3366" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card className="mt-5 overflow-x-auto">
        <p className="mb-3 font-display text-lg font-bold">Table view</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted"><th className="py-1.5">Event</th><th className="py-1.5 text-right">Count</th></tr>
          </thead>
          <tbody>
            {funnel.map((f) => (
              <tr key={f.label} className="border-t border-navy-900/8"><td className="py-1.5">{f.label}</td><td className="py-1.5 text-right tabular-nums">{f.value}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
