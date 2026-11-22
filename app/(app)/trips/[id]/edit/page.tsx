"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { TripForm } from "@/components/trips/trip-form";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageLoader } from "@/components/ui/misc";
import type { Trip } from "@/lib/types";
import { errorMessage } from "@/lib/utils";

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>();
  const { store } = useAuth();
  const router = useRouter();
  const [trip, setTrip] = React.useState<Trip | null | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTrip(undefined); // always edit the latest saved version
    store.getTrip(id).then(setTrip, (e) => setError(errorMessage(e)));
  }, [store, id]);

  if (error) return <EmptyState title="Couldn't load this trip" body={error} />;
  if (trip === undefined) return <PageLoader label="Loading trip…" />;
  if (trip === null)
    return (
      <EmptyState
        title="Trip not found"
        body="It may have been deleted."
        action={<Link href="/trips" className={buttonVariants()}>Back to trips</Link>}
      />
    );

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/trips" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> My trips
      </Link>
      <PageHeader title="Edit trip" subtitle={trip.trip_name} />
      <TripForm initial={trip} onSaved={() => router.push("/trips")} />
    </div>
  );
}
