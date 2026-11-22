import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PublicJourney } from "@/components/journey/public-journey";
import { PageLoader } from "@/components/ui/misc";
import { getPublicWrapped } from "@/lib/public-wrapped";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const w = await getPublicWrapped(slug);
  if (!w) return { title: "Travel Journey", robots: { index: false } };
  const title = `${w.stats.ownerName}'s ${w.year} Travel Journey`;
  const description = `Watch ${w.stats.cities.length} places across ${w.stats.states.length} states unfold on the map.`;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function PublicJourneyPage({ params }: Params) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-950"><PageLoader label="Loading journey…" /></div>}>
      <Content params={params} />
    </Suspense>
  );
}

/** Public journey: only exists while the owner keeps their Wrapped public (opt-in, revocable). */
async function Content({ params }: Params) {
  const { slug } = await params;
  const w = await getPublicWrapped(slug);
  if (!w)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 px-6 text-center text-cream-100">
        <p className="font-display text-4xl font-extrabold">This journey isn&apos;t available</p>
        <p className="max-w-md text-cream-200/70">The link may be wrong, or its owner made it private.</p>
        <Link href="/" className="rounded-full bg-sunset-500 px-6 py-3 font-semibold text-white">Create your own Travel Wrapped</Link>
      </div>
    );
  return <PublicJourney snapshot={w.stats} mode="public" viewKey={slug} closeHref={`/w/${slug}`} />;
}
