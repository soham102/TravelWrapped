"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { PageHeader } from "@/components/app-shell";
import { TripForm } from "@/components/trips/trip-form";

export default function NewTripPage() {
  const router = useRouter();
  // Next 16 keeps recently visited pages alive (React Activity), which would restore the previous
  // draft. Bump the form key whenever this page is hidden so every visit starts with a blank trip.
  const [formKey, setFormKey] = React.useState(0);
  React.useLayoutEffect(() => () => setFormKey((k) => k + 1), []);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/trips" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> My trips
      </Link>
      <PageHeader title="Add a trip" subtitle="Takes about 30 seconds. Only the destination and dates are required." />
      <TripForm key={formKey} onSaved={() => router.push("/trips")} />
    </div>
  );
}
