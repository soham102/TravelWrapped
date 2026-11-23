"use client";

import { ArrowRight, Gift, Globe, Map as MapIcon, Plane, Plus, Settings, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { JourneyEntryCard } from "@/components/journey/journey-entry-card";
import { IndiaMapSvg } from "@/components/map/india-map-svg";
import { useAuth } from "@/components/providers";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageLoader, StatTile } from "@/components/ui/misc";
import { track } from "@/lib/analytics";
import { statsToPoints, useTrips } from "@/lib/hooks";
import { buildJourney } from "@/lib/journey/build";
import type { Invitation, WrappedRecord } from "@/lib/types";
import { cn, errorMessage, firstName, fmtRange, plural } from "@/lib/utils";
import { availableYears, computeWrapped } from "@/lib/wrapped/compute";
import { sampleTripInputs } from "@/lib/wrapped/sample";

export default function DashboardPage() {
  const { store, profile } = useAuth();
  const router = useRouter();
  const { trips, loading, error, reload } = useTrips();
  const [wrapped, setWrapped] = React.useState<WrappedRecord[]>([]);
  const [invites, setInvites] = React.useState<Invitation[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [welcome, setWelcome] = React.useState(false);

  React.useEffect(() => {
    setWelcome(new URLSearchParams(window.location.search).has("welcome"));
    store.listWrapped().then(setWrapped, () => {});
    store.listInvitations().then(setInvites, () => {});
  }, [store]);

  const thisYear = new Date().getFullYear();
  const years = availableYears(trips);
  const year = years.includes(thisYear) ? thisYear : years[0] ?? thisYear;
  const stats = React.useMemo(() => computeWrapped(trips, year, profile?.full_name ?? null), [trips, year, profile?.full_name]);
  const record = wrapped.find((w) => w.year === year);
  const journey = React.useMemo(() => buildJourney(trips, year, profile?.full_name ?? null), [trips, year, profile?.full_name]);

  const importSample = async () => {
    setImporting(true);
    try {
      for (const t of sampleTripInputs(thisYear)) await store.saveTrip(t);
      track("trip_created", { sample: true, count: 8 });
      toast.success("8 sample trips added — edit or delete them anytime");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error)
    return (
      <EmptyState title="Couldn't load your trips" body={error} action={<Button onClick={reload}>Try again</Button>} />
    );

  const name = firstName(profile?.full_name);

  if (trips.length === 0)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow={welcome ? "Welcome aboard" : "Your travel year"} title={`Hey ${name} 👋`} subtitle="Let's turn your trips into a story worth sharing." />
        <div className="grain relative overflow-hidden rounded-[32px] bg-navy-900 p-6 text-cream-100 sm:p-10">
          <div className="absolute -right-20 -top-20 size-72 rounded-full bg-sunset-500/40 blur-3xl" />
          <div className="relative grid items-center gap-8 sm:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">Your {thisYear} map is still blank.</h2>
              <p className="mt-3 text-cream-200/80">Add the places you went this year — a weekend in Lonavala counts! Every trip lights up your India map.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/trips/new" className={buttonVariants({ size: "lg" })}>
                  <Plus /> Add my first trip
                </Link>
                <Button variant="glass" size="lg" onClick={importSample} loading={importing}>
                  <Wand2 /> Try with sample trips
                </Button>
              </div>
              <p className="mt-3 text-xs text-cream-200/60">Sample trips are labelled and easy to delete.</p>
              <Link href="/demo/journey" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sunset-400 hover:underline">
                ▶ Watch a sample travel journey <ArrowRight className="size-4" />
              </Link>
            </div>
            <IndiaMapSvg width={300} height={340} theme="night" animate className="mx-auto w-full max-w-[260px]" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["1", "Add trips", "Cities, dates and who you went with."],
            ["2", "Generate", "We crunch your real data into 10 story slides."],
            ["3", "Share", "Download for Instagram or send a link."],
          ].map(([n, t, b]) => (
            <Card key={n}>
              <span className="font-display text-3xl font-extrabold text-sunset-500">{n}</span>
              <p className="mt-1 font-bold">{t}</p>
              <p className="text-sm text-muted">{b}</p>
            </Card>
          ))}
        </div>
      </div>
    );

  const yearTrips = stats.timeline;
  const publicOnes = wrapped.filter((w) => w.is_public);
  const pending = invites.filter((i) => i.status !== "accepted").length;
  const accepted = invites.filter((i) => i.status === "accepted").length;

  return (
    <div>
      <PageHeader
        eyebrow={`Your ${year} so far`}
        title={`Hey ${name} 👋`}
        subtitle={stats.totalTrips ? `${plural(stats.totalTrips, "trip")} and ${plural(stats.cities.length, "place")} in ${year}. Keep exploring.` : `No trips logged for ${year} yet.`}
        action={
          <>
            <Link href="/trips/new" className={buttonVariants({ variant: "outline" })}>
              <Plus /> Add trip
            </Link>
            <Link href={`/wrapped/${year}`} className={buttonVariants()}>
              <Sparkles /> {record ? "Open my Wrapped" : "Generate my Wrapped"}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Trips" value={stats.totalTrips} accent="sunset" />
        <StatTile label="Places explored" value={stats.cities.length} accent="electric" />
        <StatTile label="States & UTs" value={stats.states.length} accent="jungle" />
        <StatTile
          label={stats.totalKm != null ? "Km logged" : "Days travelling"}
          value={stats.totalKm != null ? Math.round(stats.totalKm).toLocaleString("en-IN") : stats.totalDays}
          accent="navy"
          sub={stats.totalKm != null && stats.kmTripsCount < stats.totalTrips ? `from ${plural(stats.kmTripsCount, "trip")} with distance` : undefined}
        />
      </div>

      {journey.stops.length > 0 && <JourneyEntryCard href={`/journey/${year}`} journey={journey} compact className="mt-6" />}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Wrapped hero */}
        <Link href={`/wrapped/${year}`} className="grain group relative overflow-hidden rounded-[28px] p-6 text-cream-50 lg:col-span-2" style={{ background: "linear-gradient(135deg,#6d28d9,#7c3aed 40%,#ff3366)" }}>
          <div className="relative z-10 flex h-full flex-col">
            <Badge className="w-fit bg-white/20 text-cream-50">My Travel Wrapped</Badge>
            <p className="mt-4 font-display text-4xl font-extrabold leading-none sm:text-5xl">{year}</p>
            <p className="mt-2 font-serif text-2xl italic">{stats.personality.title}</p>
            <p className="mt-1 max-w-md text-sm text-cream-50/80">{stats.personality.reasons[0]}</p>
            <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-sm font-bold transition group-hover:gap-3">
              {record ? "Play my story" : "Generate my Wrapped"} <ArrowRight className="size-4" />
            </span>
          </div>
        </Link>

        {/* Map */}
        <Link href="/map" className="group relative overflow-hidden rounded-[28px] bg-navy-900 p-5 text-cream-100">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold">My Travel Map</p>
            <MapIcon className="size-5 text-sunset-400" />
          </div>
          <IndiaMapSvg width={300} height={300} theme="night" visitedStates={stats.states} points={statsToPoints(stats)} className="mx-auto mt-2 w-full max-w-[240px]" />
          <p className="text-center text-sm text-cream-200/70">{plural(stats.states.length, "state")} explored · tap to explore</p>
        </Link>

        {/* Trips */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg font-bold">My Trips</p>
            <Link href="/trips" className="text-sm font-semibold text-electric-600 hover:underline">View all</Link>
          </div>
          {yearTrips.length === 0 ? (
            <p className="text-sm text-muted">No trips in {year}. <Link href="/trips/new" className="font-semibold text-sunset-600">Add one</Link></p>
          ) : (
            <ul className="divide-y divide-navy-900/8">
              {[...yearTrips].reverse().slice(0, 4).map((t) => (
                <li key={t.id}>
                  <Link href={`/trips/${t.id}/edit`} className="flex items-center gap-3 py-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sunset-500/10 text-sunset-600"><Plane className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{t.name}</span>
                      <span className="block truncate text-xs text-muted">{fmtRange(t.start, t.end)} · {t.cities.join(" → ")}</span>
                    </span>
                    <Badge>{t.type}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <QuickLink href="/wrapped" icon={<Globe />} title="Shared stories" body={publicOnes.length ? `${plural(publicOnes.length, "public link")} live` : "Nothing shared publicly yet"} />
          <QuickLink href="/invite" icon={<Gift />} title="Invitations" body={invites.length ? `${accepted} joined · ${pending} pending` : "Invite friends to make theirs"} />
          <QuickLink href="/profile" icon={<Settings />} title="Profile settings" body={profile?.email ?? ""} />
        </div>
      </div>

      {years.length > 1 && (
        <Card className="mt-4">
          <p className="mb-3 font-display text-lg font-bold">Other years</p>
          <div className="flex flex-wrap gap-2">
            {years.filter((y) => y !== year).map((y) => (
              <button key={y} onClick={() => router.push(`/wrapped/${y}`)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                {y} Wrapped
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function QuickLink({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-3xl border border-navy-900/8 bg-white p-4 transition hover:border-navy-900/20">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-electric-500/10 text-electric-600 [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted">{body}</span>
      </span>
      <ArrowRight className="size-4 text-muted" />
    </Link>
  );
}
