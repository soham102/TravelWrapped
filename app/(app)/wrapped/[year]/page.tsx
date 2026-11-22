"use client";

import { ArrowLeft, Camera, Download, FileDown, Play, Plus, RefreshCw, Share2, Shuffle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { JourneyEntryCard } from "@/components/journey/journey-entry-card";
import { useAuth } from "@/components/providers";
import { COLLAGE_FORMATS, COLLAGE_STYLES, type CollageStyle, collageCap, PhotoCollage } from "@/components/story/collage";
import { useExportStage } from "@/components/story/export-stage";
import { FORMATS, ScaledFrame } from "@/components/story/formats";
import { AnimateCtx } from "@/components/story/primitives";
import { SharePanel, usePublicUrl } from "@/components/story/share-panel";
import { SLIDES } from "@/components/story/slides";
import { StoryViewer } from "@/components/story/story-viewer";
import { VideoMaker } from "@/components/story/video-maker";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState, PageLoader } from "@/components/ui/misc";
import { track } from "@/lib/analytics";
import { useTrips } from "@/lib/hooks";
import { buildJourney } from "@/lib/journey/build";
import type { WrappedRecord } from "@/lib/types";
import { errorMessage, plural, stableStringify } from "@/lib/utils";
import { computeWrapped, shareLine, toSnapshot } from "@/lib/wrapped/compute";

export default function WrappedStudioPage() {
  const params = useParams<{ year: string }>();
  const year = Number(params.year);
  const valid = Number.isInteger(year) && year >= 2000 && year <= 2100;
  const { store, profile } = useAuth();
  const { trips, loading } = useTrips();
  const [record, setRecord] = React.useState<WrappedRecord | null | undefined>(undefined);
  const [viewer, setViewer] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const generatedOnce = React.useRef(false);
  const [collageSeed, setCollageSeed] = React.useState(0);
  const [collageStyle, setCollageStyle] = React.useState<CollageStyle>("mosaic");

  const stats = React.useMemo(() => computeWrapped(trips, year, profile?.full_name ?? null), [trips, year, profile?.full_name]);
  const snapshot = React.useMemo(() => toSnapshot(stats), [stats]);
  const journey = React.useMemo(() => buildJourney(trips, year, profile?.full_name ?? null), [trips, year, profile?.full_name]);
  const { stage, download, shareImage, downloadPdf, busy, capture } = useExportStage(stats, `travel-wrapped-${year}`, { collageSeed, collageStyle });
  const publicUrl = usePublicUrl(record ?? null);

  React.useEffect(() => {
    if (!valid) return;
    store.listWrapped().then(
      (rs) => setRecord(rs.find((r) => r.year === year) ?? null),
      () => setRecord(null),
    );
  }, [store, year, valid]);

  const save = React.useCallback(async () => {
    const r = await store.saveWrapped(year, snapshot);
    setRecord(r);
    return r;
  }, [store, year, snapshot]);

  // "Generate" on first open: compute from real trips and persist the snapshot.
  React.useEffect(() => {
    if (loading || record !== null || stats.totalTrips === 0 || generatedOnce.current) return;
    generatedOnce.current = true;
    save().then(
      () => track("wrapped_generated", { year, trips: stats.totalTrips, personality: stats.personality.key }),
      (e) => toast.error(errorMessage(e)),
    );
  }, [loading, record, stats, save, year]);

  const stale = record ? stableStringify(record.stats) !== stableStringify(snapshot) : false;

  const refresh = async () => {
    setSaving(true);
    try {
      await save();
      track("wrapped_generated", { year, refresh: true });
      toast.success("Wrapped updated with your latest trips");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!valid) return <EmptyState title="Unknown year" action={<Link href="/wrapped" className={buttonVariants()}>Back</Link>} />;
  if (loading || record === undefined) return <PageLoader label="Crunching your travel year…" />;
  if (stats.totalTrips === 0)
    return (
      <EmptyState
        title={`No trips in ${year} yet`}
        body="Add a trip from this year and your Wrapped will generate instantly."
        action={<Link href="/trips/new" className={buttonVariants()}><Plus /> Add a trip</Link>}
      />
    );
  if (!record) return <PageLoader label="Generating your Wrapped…" />;

  const text = shareLine(stats);

  return (
    <div>
      {stage}
      {viewer !== null && (
        <StoryViewer
          s={stats}
          startAt={viewer}
          onClose={() => setViewer(null)}
          onDownload={(i) => download(`slide:${i}`)}
          onShare={(i) => shareImage(`slide:${i}`, text, publicUrl ?? undefined)}
          busyIndex={busy?.startsWith("slide:") ? Number(busy.split(":")[1]) : null}
        />
      )}

      <Link href="/wrapped" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All years
      </Link>

      {stale && (
        <div className="mb-5 flex flex-col gap-3 rounded-3xl border-2 border-sun-400/50 bg-sun-400/15 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm font-semibold">Your trips changed since this Wrapped was generated. Your story below is already live — update the saved version{record.is_public ? " (and your public link)" : ""} too.</p>
          <Button size="sm" variant="dark" onClick={refresh} loading={saving}>
            <RefreshCw /> Update Wrapped
          </Button>
        </div>
      )}

      {/* Hero */}
      <div className="grain relative overflow-hidden rounded-[32px] bg-navy-900 p-6 text-cream-100 sm:p-10">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-sunset-500/40 blur-3xl" />
        <div className="absolute -bottom-24 left-10 size-72 rounded-full bg-electric-500/40 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sunset-400">Travel Wrapped {year}</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold leading-[0.95] sm:text-6xl">{stats.personality.title}</h1>
            <p className="mt-4 max-w-lg font-serif text-2xl italic text-cream-200">{text}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setViewer(0)}>
                <Play /> Play my story
              </Button>
              <Button size="lg" variant="glass" onClick={downloadPdf} loading={busy === "pdf"}>
                <FileDown /> Complete PDF
              </Button>
            </div>
          </div>
          <button onClick={() => setViewer(0)} className="mx-auto w-full max-w-[220px] rotate-2 overflow-hidden rounded-[22px] shadow-2xl ring-4 ring-white/10 transition hover:rotate-0" aria-label="Play story">
            <AnimateCtx.Provider value={false}>
              <ScaledFrame w={360} h={640}>
                {React.createElement(SLIDES[0].C, { s: stats })}
              </ScaledFrame>
            </AnimateCtx.Provider>
          </button>
        </div>
      </div>

      {/* Animated travel journey */}
      {journey.stops.length > 0 && <JourneyEntryCard href={`/journey/${year}`} journey={journey} className="mt-6" />}

      {/* Story slides */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold">Instagram Story slides</h2>
            <p className="text-sm text-muted">{SLIDES.length} slides · 9:16 · 1080 × 1920 PNG</p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadPdf} loading={busy === "pdf"}>
            <FileDown /> All slides as PDF
          </Button>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
          {SLIDES.map((sl, i) => (
            <div key={sl.key} className="w-36 shrink-0 snap-start sm:w-auto">
              <button onClick={() => setViewer(i)} className="block w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-navy-900/10 transition hover:-translate-y-1" aria-label={`Open ${sl.title}`}>
                <AnimateCtx.Provider value={false}>
                  <ScaledFrame w={360} h={640}>
                    <sl.C s={stats} />
                  </ScaledFrame>
                </AnimateCtx.Provider>
              </button>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="truncate text-xs font-semibold">{i + 1}. {sl.title}</span>
                <button onClick={() => download(`slide:${i}`)} disabled={busy === `slide:${i}`} className="rounded-full p-1.5 text-muted hover:bg-navy-900/5 hover:text-ink disabled:animate-pulse" aria-label={`Download ${sl.title}`}>
                  <Download className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Other formats */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-extrabold">More formats</h2>
        <p className="mb-4 text-sm text-muted">Same travel year, different stories.</p>
        <div className="grid gap-5 md:grid-cols-3">
          {FORMATS.filter((f) => "C" in f).map((f) => {
            const C = (f as unknown as { C: React.ComponentType<{ s: typeof stats }> }).C;
            const key = f.key as "post" | "poster" | "timeline";
            return (
              <div key={f.key} className="flex flex-col rounded-3xl border border-navy-900/8 bg-white p-4">
                <div className="flex flex-1 items-center justify-center rounded-2xl bg-cream-100 p-4">
                  <div className="w-full max-w-[260px] overflow-hidden rounded-xl shadow-xl">
                    <AnimateCtx.Provider value={false}>
                      <ScaledFrame w={f.w} h={f.h}>
                        <C s={stats} />
                      </ScaledFrame>
                    </AnimateCtx.Provider>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{f.title}</p>
                    <p className="text-xs text-muted">{f.ratio} · {f.size}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="outline" onClick={() => shareImage(key, text, publicUrl ?? undefined)} aria-label={`Share ${f.title}`}>
                      <Share2 />
                    </Button>
                    <Button size="icon" variant="dark" onClick={() => download(key)} loading={busy === key} aria-label={`Download ${f.title}`}>
                      {busy !== key && <Download />}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Photo collage (private — built from the user's own trip photos) */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold">Photo collage</h2>
            <p className="text-sm text-muted">
              {stats.gallery.length
                ? `Made from ${plural(stats.gallery.length, "photo")} you added to your ${year} trips.`
                : "Add photos to your trips and we'll arrange them into a collage."}
            </p>
          </div>
          {stats.gallery.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => setCollageSeed(Math.floor(Math.random() * 1e9) + 1)}>
              <Shuffle /> Shuffle layout
            </Button>
          )}
        </div>
        {stats.gallery.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-navy-900/12 bg-white/50 px-6 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-sunset-500/10 text-sunset-600"><Camera className="size-6" /></span>
            <p className="mt-4 font-display text-xl font-bold">No photos yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted">Open a trip, tap “Add photos”, and your collage appears here — ready for Instagram.</p>
            <Link href="/trips" className={buttonVariants({ className: "mt-5" })}>Add photos to my trips</Link>
          </div>
        ) : (
          <>
          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="radiogroup" aria-label="Collage style">
            {COLLAGE_STYLES.map((c) => {
              const active = c.key === collageStyle;
              return (
                <button
                  key={c.key}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCollageStyle(c.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                    active ? "border-navy-900 bg-navy-900 text-cream-50 shadow-md" : "border-navy-900/12 bg-white text-ink hover:border-navy-900/30"
                  }`}
                >
                  <span aria-hidden>{c.emoji}</span> {c.label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {COLLAGE_FORMATS.map((f) => (
              <div key={f.key} className="flex flex-col rounded-3xl border border-navy-900/8 bg-white p-4">
                <div className="flex flex-1 items-center justify-center rounded-2xl bg-cream-100 p-4">
                  <div className={f.variant === "story" ? "w-full max-w-[240px] overflow-hidden rounded-xl shadow-xl" : "w-full max-w-[320px] overflow-hidden rounded-xl shadow-xl"}>
                    <AnimateCtx.Provider value={false}>
                      <ScaledFrame w={f.w} h={f.h}>
                        <PhotoCollage s={stats} variant={f.variant} seed={collageSeed} style={collageStyle} />
                      </ScaledFrame>
                    </AnimateCtx.Provider>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{f.title}</p>
                    <p className="text-xs text-muted">{f.ratio} · {f.size} · up to {collageCap(collageStyle, f.variant)} photos</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="outline" onClick={() => shareImage(f.key, text)} aria-label={`Share ${f.title}`}>
                      <Share2 />
                    </Button>
                    <Button size="icon" variant="dark" onClick={() => download(f.key)} loading={busy === f.key} aria-label={`Download ${f.title}`}>
                      {busy !== f.key && <Download />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </section>

      {/* Video */}
      <section className="mt-10">
        <div className="mb-4">
          <h2 className="font-display text-2xl font-extrabold">Make it a video 🎬</h2>
          <p className="text-sm text-muted">Turn your story slides or your trip photos into a Reel with music, cut to the beat. 9:16, ready for Instagram.</p>
        </div>
        <VideoMaker s={stats} capture={capture} fileBase={`travel-wrapped-${year}`} shareText={text} />
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SharePanel record={record} onRecord={setRecord} ensureFresh={async () => (stale ? save() : record)} shareImage={shareImage} download={download} busy={busy} />
        <div className="rounded-3xl bg-electric-500 p-6 text-cream-50">
          <p className="font-display text-2xl font-extrabold leading-tight">Travel is better with friends.</p>
          <p className="mt-2 text-sm text-cream-50/85">Invite your travel crew to make their own Wrapped and compare maps.</p>
          <Link href="/invite" className={buttonVariants({ variant: "light", className: "mt-5" })}>
            Invite friends
          </Link>
          <p className="mt-6 text-xs text-cream-50/70">
            Based on {plural(stats.totalTrips, "trip")} you logged in {year}. Every number comes from your own data.
          </p>
        </div>
      </section>
    </div>
  );
}
