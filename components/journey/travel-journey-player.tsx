"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, MapPinOff, Share2, Volume2, VolumeX, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";
import type { Journey } from "@/lib/journey/build";
import { useClockState, useJourneyClock } from "@/lib/journey/clock";
import { buildSchedule } from "@/lib/journey/schedule";
import { renderTrack } from "@/lib/video/music";
import { cn, plural } from "@/lib/utils";
import type { Insets } from "./animated-travel-map";
import { DestinationRevealCard } from "./destination-reveal-card";
import { JourneyExportDialog, JourneyShareDialog } from "./journey-export";
import { EnRouteChip, JourneyIntro, JourneySummary } from "./journey-summary";
import { JourneyTimeline } from "./journey-timeline";

const AnimatedTravelMap = dynamic(() => import("./animated-travel-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center bg-navy-950 text-sm text-cream-200/60">Loading map…</div>,
});

export interface JourneyShareConfig {
  url: string | null;
  text: string;
  publish?: () => Promise<void>;
  publishLabel?: string;
  publicNote?: React.ReactNode;
}

/** Overlay space per layout — the map camera keeps destinations clear of the card and controls. */
function useInsets(): { insets: Insets; mobile: boolean } {
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  React.useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return React.useMemo(() => {
    const w = size?.w ?? 1280;
    const h = size?.h ?? 800;
    const mobile = w < 768;
    return {
      mobile,
      insets: mobile ? { top: 120, right: 0, bottom: Math.min(Math.round(h * 0.55), 360), left: 0 } : { top: 72, right: 0, bottom: 150, left: Math.min(460, w * 0.4) },
    };
  }, [size]);
}

export function TravelJourneyPlayer({
  journey,
  closeHref,
  share,
  fileBase,
  autoplay = true,
  sampleCta,
}: {
  journey: Journey;
  closeHref: string;
  share: JourneyShareConfig;
  fileBase: string;
  autoplay?: boolean;
  /** Shown on sample journeys, e.g. a link to add real trips. */
  sampleCta?: React.ReactNode;
}) {
  const schedule = React.useMemo(() => buildSchedule(journey), [journey]);
  const clock = useJourneyClock(schedule);
  const st = useClockState(clock);
  const { insets, mobile } = useInsets();
  const [dialog, setDialog] = React.useState<"export" | "share" | null>(null);
  const [sound, setSound] = React.useState(false);
  const seg = schedule.segments[st.segIndex];
  const stops = journey.stops;

  // Autoplay shortly after opening (gives the map a moment to settle).
  React.useEffect(() => {
    if (!autoplay) return;
    const id = setTimeout(() => clock.play(), 700);
    return () => clearTimeout(id);
  }, [clock, autoplay]);

  // Pause while a dialog is open.
  const resumeAfterDialog = React.useRef(false);
  const openDialog = (d: "export" | "share") => {
    resumeAfterDialog.current = clock.state.playing && !clock.state.ended;
    clock.pause();
    setDialog(d);
  };
  const closeDialog = () => {
    setDialog(null);
    if (resumeAfterDialog.current) clock.play();
  };

  // Keyboard: space = play/pause, ←/→ = previous/next destination.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialog) return;
      if ((e.target as HTMLElement)?.closest("input,textarea,select,[role=slider]")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (clock.state.ended) clock.replay();
        else clock.toggle();
      } else if (e.key === "ArrowRight") clock.next();
      else if (e.key === "ArrowLeft") clock.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clock, dialog]);

  // Full-screen: no page scroll underneath.
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Preload the next destination's photo so it's decoded before the card opens.
  React.useEffect(() => {
    const next = stops[st.stop + 1]?.photo?.url;
    if (next) {
      const img = new Image();
      img.decoding = "async";
      img.src = next;
    }
  }, [st.stop, stops]);

  useAmbientSound(sound, st.playing);

  const current = seg.kind === "reveal" ? stops[seg.stop] : null;
  const travel = seg.kind === "travel" ? { from: stops[seg.stop - 1], to: stops[seg.stop] } : null;
  const ending = seg.kind === "finale" || seg.kind === "outro";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-navy-950 text-cream-100 [&_.leaflet-control-attribution]:!bg-navy-950/60 [&_.leaflet-control-attribution]:!text-[9px] [&_.leaflet-control-attribution]:!text-cream-200/60" role="dialog" aria-modal="true" aria-label={`${journey.ownerName}'s ${journey.year} travel journey`}>
      {/* z-0 isolates Leaflet's own pane z-indexes (400–1000) below the overlays. */}
      <div className="absolute inset-0 z-0">
        <AnimatedTravelMap journey={journey} schedule={schedule} clock={clock} insets={insets} />
      </div>
      {/* cinematic vignette */}
      <div className="pointer-events-none absolute inset-0 z-[400] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(11,5,20,0.7))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] h-28 bg-gradient-to-b from-navy-950/90 to-transparent" />

      <div className="pointer-events-none absolute inset-0 z-[500]">
        {/* Top bar */}
        <div className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-3 sm:px-5 sm:pt-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-sunset-400 sm:tracking-[0.25em]">Travel Wrapped · {journey.year}</p>
            <p className="truncate font-display text-lg font-extrabold leading-tight sm:text-xl">{journey.ownerName}&apos;s Travel Journey</p>
          </div>
          {journey.sample && <span className="shrink-0 rounded-full bg-sun-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-navy-900 sm:px-2.5 sm:py-1 sm:text-[11px]">Sample<span className="hidden sm:inline"> data</span></span>}
          {journey.unlocated.length > 0 && (
            <span
              className="hidden shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-cream-200/80 sm:inline-flex"
              title={`Not on the map (no coordinates): ${journey.unlocated.map((u) => u.city).join(", ")}`}
            >
              <MapPinOff className="size-3.5" /> {plural(journey.unlocated.length, "place")} not mapped
            </span>
          )}
          <IconBtn label={sound ? "Turn sound off" : "Turn sound on"} onClick={() => setSound((s) => !s)}>
            {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </IconBtn>
          <IconBtn label="Download my journey" onClick={() => openDialog("export")} className="hidden sm:grid">
            <Download className="size-5" />
          </IconBtn>
          <IconBtn label="Share my journey" onClick={() => openDialog("share")}>
            <Share2 className="size-5" />
          </IconBtn>
          <Link href={closeHref} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20" aria-label="Close journey">
            <X className="size-5" />
          </Link>
        </div>

        <AnimatePresence>{seg.kind === "intro" && <JourneyIntro key="intro" journey={journey} />}</AnimatePresence>

        {/* En-route chip */}
        <div className={cn("absolute left-1/2 -translate-x-1/2", mobile ? "top-20" : "top-24")}>
          <AnimatePresence mode="wait">{travel && <EnRouteChip key={travel.to.id} from={travel.from.city} to={travel.to.city} km={travel.to.legKm} />}</AnimatePresence>
        </div>

        {/* Destination card */}
        <div
          className={cn(
            "absolute",
            mobile ? "inset-x-3 bottom-[184px]" : "bottom-40 left-6 top-24 flex w-[400px] max-w-[38vw] items-end",
          )}
        >
          <AnimatePresence mode="wait">
            {current && (
              <DestinationRevealCard
                key={current.id}
                stop={current}
                index={seg.kind === "reveal" ? seg.stop : 0}
                total={stops.length}
                compact={mobile}
                className={mobile ? undefined : "w-full"}
              />
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {ending && (
            <JourneySummary
              key="summary"
              journey={journey}
              closing={seg.kind === "outro"}
              onReplay={() => clock.replay()}
              onDownload={() => openDialog("export")}
              onShare={() => openDialog("share")}
              extra={journey.sample ? sampleCta : undefined}
            />
          )}
        </AnimatePresence>

        {/* Controls (on phones the finale has its own Replay button, so the timeline makes room) */}
        <div className={cn("absolute inset-x-3 bottom-6 z-20 mx-auto max-w-2xl transition-all duration-500 sm:bottom-5", mobile && ending && "pointer-events-none translate-y-8 opacity-0")}>
          <JourneyTimeline journey={journey} clock={clock} />
        </div>
      </div>

      <div className="relative z-[1000]">
      <JourneyExportDialog open={dialog === "export"} onClose={closeDialog} journey={journey} fileBase={fileBase} shareText={share.text} />
      <JourneyShareDialog
        open={dialog === "share"}
        onClose={closeDialog}
        url={share.url}
        text={share.text}
        publish={share.publish}
        publishLabel={share.publishLabel}
        publicNote={share.publicNote}
        onInstagram={() => setDialog("export")}
      />
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20", className)}
    >
      {children}
    </motion.button>
  );
}

/**
 * Optional ambient soundtrack (off by default). Uses one of the app's original synthesised tracks,
 * looped, and follows play/pause.
 */
function useAmbientSound(on: boolean, playing: boolean) {
  const ctx = React.useRef<AudioContext | null>(null);
  const src = React.useRef<AudioBufferSourceNode | null>(null);
  const loading = React.useRef(false);

  React.useEffect(() => {
    if (!on) {
      void ctx.current?.suspend();
      return;
    }
    let cancelled = false;
    (async () => {
      if (!ctx.current) ctx.current = new AudioContext();
      if (!src.current && !loading.current) {
        loading.current = true;
        try {
          const buf = await renderTrack("goldenhour", 46.8);
          if (cancelled || !ctx.current) return;
          const node = ctx.current.createBufferSource();
          node.buffer = buf;
          node.loop = true;
          const gain = ctx.current.createGain();
          gain.gain.value = 0.55;
          node.connect(gain).connect(ctx.current.destination);
          node.start();
          src.current = node;
        } finally {
          loading.current = false;
        }
      }
      if (playing) await ctx.current.resume();
      else await ctx.current.suspend();
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [on, playing]);

  React.useEffect(
    () => () => {
      try {
        src.current?.stop();
      } catch {
        /* not started */
      }
      void ctx.current?.close();
      ctx.current = null;
      src.current = null;
    },
    [],
  );
}
