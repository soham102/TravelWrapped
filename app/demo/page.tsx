"use client";

import * as React from "react";
import { PublicWrapped } from "@/components/public-wrapped";
import { computeWrapped } from "@/lib/wrapped/compute";
import { sampleTrips } from "@/lib/wrapped/sample";

export default function DemoPage() {
  const s = React.useMemo(() => computeWrapped(sampleTrips(2026), 2026, "Aanya"), []);
  return <PublicWrapped s={s} mode="demo" viewKey="demo" />;
}
