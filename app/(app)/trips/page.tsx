"use client";

import { CalendarDays, Camera, MapPin, Pencil, Plane, Plus, Route, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, Card, Dialog, EmptyState, PageLoader } from "@/components/ui/misc";
import { useTrips } from "@/lib/hooks";
import type { Trip } from "@/lib/types";
import { cn, errorMessage, fmtRange, plural, tripDays } from "@/lib/utils";
import { availableYears, tripYear } from "@/lib/wrapped/compute";

const CATEGORY_COLORS: Record<string, string> = {
  Adventure: "bg-sunset-500/12 text-sunset-600",
  Leisure: "bg-jungle-500/12 text-jungle-600",
  Backpacking: "bg-electric-500/12 text-electric-600",
  Spiritual: "bg-sun-400/25 text-[#8a5a00]",
  Business: "bg-navy-900/8 text-navy-800",
  "Road Trip": "bg-sunset-400/15 text-sunset-600",
};

export default function TripsPage() {
  const { store } = useAuth();
  const { trips, setTrips, loading, error, reload } = useTrips();
  const [year, setYear] = React.useState<number | "all">("all");
  const [toDelete, setToDelete] = React.useState<Trip | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const years = availableYears(trips);
  const visible = year === "all" ? trips : trips.filter((t) => tripYear(t) === year);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await store.deleteTrip(toDelete.id);
      setTrips((ts) => ts.filter((t) => t.id !== toDelete.id));
      toast.success("Trip deleted");
      setToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <EmptyState title="Couldn't load your trips" body={error} action={<Button onClick={reload}>Try again</Button>} />;

  return (
    <div>
      <PageHeader
        title="My Trips"
        subtitle={trips.length ? `${plural(trips.length, "trip")} logged` : "Every journey you add powers your Wrapped."}
        action={
          <Link href="/trips/new" className={buttonVariants()}>
            <Plus /> Add trip
          </Link>
        }
      />

      {years.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Filter by year">
          {(["all", ...years] as const).map((y) => (
            <button
              key={y}
              role="tab"
              aria-selected={year === y}
              onClick={() => setYear(y)}
              className={cn(
                "shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition",
                year === y ? "border-navy-900 bg-navy-900 text-cream-100" : "border-navy-900/10 bg-white hover:border-navy-900/30",
              )}
            >
              {y === "all" ? "All years" : y}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Plane className="size-6" />}
          title={trips.length ? "No trips in this year" : "No trips yet"}
          body="Add a destination, pick your dates, and watch your map light up."
          action={
            <Link href="/trips/new" className={buttonVariants()}>
              <Plus /> Add a trip
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((t) => (
            <TripCard key={t.id} trip={t} onDelete={() => setToDelete(t)} />
          ))}
        </div>
      )}

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} title="Delete this trip?">
        <p className="text-sm text-muted">
          “{toDelete?.trip_name}” and its {toDelete?.photos.length ? plural(toDelete.photos.length, "photo") : "details"} will be permanently removed. Your Wrapped stats update automatically.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleting}>
            <Trash2 /> Delete trip
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function TripCard({ trip: t, onDelete }: { trip: Trip; onDelete: () => void }) {
  const days = tripDays(t.start_date, t.end_date);
  return (
    <Card className="flex flex-col gap-4 p-0 sm:p-0">
      {t.photos.length > 0 && (
        <div className="flex h-32 gap-1 overflow-hidden rounded-t-3xl">
          {t.photos.slice(0, 3).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" className="h-full min-w-0 flex-1 object-cover" />
          ))}
        </div>
      )}
      <div className={cn("flex flex-1 flex-col px-5 pb-5", t.photos.length ? "" : "pt-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl font-bold">{t.trip_name}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <CalendarDays className="size-3.5" /> {fmtRange(t.start_date, t.end_date)} {tripYear(t)} · {plural(days, "day")}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Link href={`/trips/${t.id}/edit`} className="rounded-full p-2 text-muted transition hover:bg-navy-900/5 hover:text-ink" aria-label={`Edit ${t.trip_name}`}>
              <Pencil className="size-4" />
            </Link>
            <button onClick={onDelete} className="rounded-full p-2 text-muted transition hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${t.trip_name}`}>
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {t.destinations.map((d, i) => (
            <React.Fragment key={d.id}>
              {i > 0 && <span className="text-muted">→</span>}
              <span className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-2.5 py-1 text-sm font-semibold">
                <MapPin className="size-3 text-sunset-500" /> {d.city}
              </span>
            </React.Fragment>
          ))}
        </div>
        {t.memorable_experience && <p className="mt-3 line-clamp-2 font-serif text-lg italic leading-snug text-ink/80">“{t.memorable_experience}”</p>}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          <Badge>{t.trip_type}</Badge>
          <Badge className={CATEGORY_COLORS[t.travel_category]}>{t.travel_category}</Badge>
          {t.distance_km != null && (
            <Badge><Route className="size-3" /> {Math.round(t.distance_km).toLocaleString("en-IN")} km</Badge>
          )}
          {t.photos.length > 0 && (
            <Badge><Camera className="size-3" /> {t.photos.length}</Badge>
          )}
          {t.notes === "Sample trip" && <Badge className="bg-electric-500/10 text-electric-600">Sample</Badge>}
        </div>
      </div>
    </Card>
  );
}
