"use client";

import * as React from "react";
import { useAuth } from "@/components/providers";
import type { Trip, WrappedSnapshot } from "./types";
import { errorMessage } from "./utils";
import type { MapPoint } from "@/components/map/india-map-svg";

export function useTrips() {
  const { store, user } = useAuth();
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setTrips(await store.listTrips());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [store, user]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { trips, setTrips, loading, error, reload };
}

/** Map points from wrapped stats (one per unique city, coloured by first trip). */
export function statsToPoints(s: Pick<WrappedSnapshot, "cities">): MapPoint[] {
  return s.cities
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({
      lat: c.lat!,
      lng: c.lng!,
      label: c.city,
      group: c.tripIndex,
      sub: c.visits > 1 ? `${c.visits} visits` : c.state ?? undefined,
    }));
}
