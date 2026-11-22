"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Share2, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { ScaledFrame } from "./formats";
import { AnimateCtx, STORY_H, STORY_W } from "./primitives";
import { SLIDES, type StoryData } from "./slides";

export function StoryViewer({
  s,
  onClose,
  onDownload,
  onShare,
  embedded = false,
  startAt = 0,
  busyIndex,
}: {
  s: StoryData;
  onClose?: () => void;
  onDownload?: (index: number) => void;
  onShare?: (index: number) => void;
  embedded?: boolean;
  startAt?: number;
  busyIndex?: number | null;
}) {
  const [[index, dir], setState] = React.useState<[number, number]>([startAt, 0]);
  const [maxH, setMaxH] = React.useState(640);
  const embedRef = React.useRef<HTMLDivElement>(null);
  const last = SLIDES.length - 1;

  const go = React.useCallback(
    (delta: number) =>
      setState(([i]) => {
        const n = Math.min(last, Math.max(0, i + delta));
        return n === i ? [i, 0] : [n, delta];
      }),
    [last],
  );

  React.useEffect(() => {
    if (embedded) return;
    const onResize = () => setMaxH(Math.max(360, window.innerHeight - 140));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [embedded]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      // An embedded viewer only listens while it's hovered/focused (a full-screen viewer may be open on top).
      if (embedded && !embedRef.current?.matches(":hover, :focus-within")) return;
      if (e.key === "ArrowRight" || (e.key === " " && !embedded)) {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, embedded]);

  React.useEffect(() => {
    if (embedded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 50 || info.velocity.x > 400) go(-1);
  };

  const Slide = SLIDES[index].C;

  const frame = (
    <div className="relative mx-auto w-full" style={{ maxWidth: embedded ? undefined : (maxH * STORY_W) / STORY_H }}>
      {/* progress */}
      <div className="absolute inset-x-3 top-3 z-30 flex gap-1" role="tablist" aria-label="Story progress">
        {SLIDES.map((sl, i) => (
          <button
            key={sl.key}
            role="tab"
            aria-selected={i === index}
            aria-label={`${sl.title} (${i + 1} of ${SLIDES.length})`}
            onClick={() => setState(([cur]) => [i, i > cur ? 1 : -1])}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
          >
            <span className={cn("block h-full rounded-full bg-white transition-all duration-500", i <= index ? "w-full" : "w-0")} />
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[22px] shadow-2xl ring-1 ring-white/10">
        <ScaledFrame w={STORY_W} h={STORY_H} maxHeight={embedded ? undefined : maxH}>
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={index}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d >= 0 ? 80 : -80, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d >= 0 ? -80 : 80, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={onDragEnd}
              style={{ width: STORY_W, height: STORY_H, touchAction: "pan-y" }}
            >
              <AnimateCtx.Provider value={true}>
                <Slide s={s} interactive />
              </AnimateCtx.Provider>
            </motion.div>
          </AnimatePresence>
        </ScaledFrame>
        {/* tap zones (narrow, so the interactive map stays usable) */}
        <button aria-label="Previous slide" onClick={() => go(-1)} className="absolute inset-y-12 left-0 z-20 w-[22%] cursor-w-resize" />
        <button aria-label="Next slide" onClick={() => go(1)} className="absolute inset-y-12 right-0 z-20 w-[22%] cursor-e-resize" />
      </div>
    </div>
  );

  const controls = (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button onClick={() => go(-1)} disabled={index === 0} className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30" aria-label="Previous">
        <ChevronLeft className="size-5" />
      </button>
      {onDownload && (
        <button onClick={() => onDownload(index)} disabled={busyIndex === index} className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50">
          <Download className="size-4" /> {busyIndex === index ? "Saving…" : "Save"}
        </button>
      )}
      {onShare && (
        <button onClick={() => onShare(index)} className="flex h-11 items-center gap-2 rounded-full bg-sunset-500 px-4 text-sm font-semibold text-white transition hover:bg-sunset-600">
          <Share2 className="size-4" /> Share
        </button>
      )}
      <button onClick={() => go(1)} disabled={index === last} className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30" aria-label="Next">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );

  if (embedded)
    return (
      <div ref={embedRef} className="rounded-[28px] bg-navy-950 p-3 pb-4">
        {frame}
        {controls}
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy-950 px-4 py-4" role="dialog" aria-modal="true" aria-label="Your Travel Wrapped story">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-1/4 size-[30rem] rounded-full bg-electric-500/20 blur-3xl" />
        <div className="absolute -right-40 bottom-0 size-[30rem] rounded-full bg-sunset-500/20 blur-3xl" />
      </div>
      {onClose && (
        <button onClick={onClose} className="absolute right-4 top-4 z-40 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close story">
          <X className="size-5" />
        </button>
      )}
      <div className="relative w-full">{frame}</div>
      <div className="relative">{controls}</div>
      <p className="relative mt-2 hidden text-xs text-white/40 sm:block">Use ← → keys · {index + 1} / {SLIDES.length}</p>
    </div>
  );
}
