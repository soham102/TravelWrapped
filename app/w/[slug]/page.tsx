import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PublicWrapped } from "@/components/public-wrapped";
import { PageLoader } from "@/components/ui/misc";
import { getPublicWrapped } from "@/lib/public-wrapped";
import { shareLine } from "@/lib/wrapped/compute";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const w = await getPublicWrapped(slug);
  if (!w) return { title: "Travel Wrapped", robots: { index: false } };
  const title = `${w.stats.ownerName}'s ${w.year} Travel Wrapped — ${w.stats.personality.title}`;
  const description = shareLine(w.stats);
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function PublicWrappedPage({ params }: Params) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-950"><PageLoader label="Loading Travel Wrapped…" /></div>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Params) {
  const { slug } = await params;
  const w = await getPublicWrapped(slug);
  if (!w)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 px-6 text-center text-cream-100">
        <p className="font-display text-4xl font-extrabold">This Wrapped isn&apos;t available</p>
        <p className="max-w-md text-cream-200/70">The link may be wrong, or its owner made it private.</p>
        <Link href="/" className="rounded-full bg-sunset-500 px-6 py-3 font-semibold text-white">Create your own Travel Wrapped</Link>
      </div>
    );
  return <PublicWrapped s={w.stats} mode="public" viewKey={slug} journeyHref={`/w/${slug}/journey`} />;
}
