"use client";

import * as React from "react";
import { Disclaimer, Logo } from "@/components/brand";
import { IndiaMapSvg } from "@/components/map/india-map-svg";
import { statsToPoints } from "@/lib/hooks";
import { computeWrapped } from "@/lib/wrapped/compute";
import { sampleTrips } from "@/lib/wrapped/sample";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const demo = React.useMemo(() => computeWrapped(sampleTrips(2026), 2026, "You"), []);
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-4xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
        <Disclaimer className="text-center text-muted" />
      </div>
      <div className="grain relative hidden overflow-hidden bg-navy-900 lg:block">
        <div className="absolute -left-32 -top-32 size-[28rem] rounded-full bg-electric-500/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 size-[30rem] rounded-full bg-sunset-500/40 blur-3xl" />
        <div className="relative flex h-full flex-col items-center justify-center p-12">
          <IndiaMapSvg
            width={420}
            height={480}
            theme="night"
            visitedStates={demo.states}
            points={statsToPoints(demo)}
            labels={6}
            animate
            routes
            className="w-full max-w-md"
          />
          <p className="mt-6 max-w-sm text-center font-serif text-3xl italic text-cream-100">
            “Every city you explored. Every memory you made.”
          </p>
        </div>
      </div>
    </div>
  );
}

export function nextPath(fallback = "/dashboard"): string {
  if (typeof window === "undefined") return fallback;
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}
