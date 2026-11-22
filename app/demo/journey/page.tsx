"use client";

import * as React from "react";
import { PublicJourney } from "@/components/journey/public-journey";
import { buildJourney } from "@/lib/journey/build";
import { sampleTrips } from "@/lib/wrapped/sample";

/** Sample journey — clearly labelled as sample data throughout. */
export default function DemoJourneyPage() {
  const journey = React.useMemo(() => buildJourney(sampleTrips(2026), 2026, "Aanya", { sample: true }), []);
  return <PublicJourney journey={journey} mode="demo" viewKey="demo" closeHref="/demo" />;
}
