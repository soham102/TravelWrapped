"use client";

import { motion } from "framer-motion";
import { MapPin, Repeat } from "lucide-react";
import * as React from "react";
import { type JourneyStop, monthYear } from "@/lib/journey/build";
import { cn, fmtNumber, fmtRange } from "@/lib/utils";

/**
 * Floating card shown when the journey arrives at a destination: the user's own photo (if any),
 * city, state, month and caption. `compact` is the phone layout (thumbnail beside the text).
 */
export const DestinationRevealCard = React.memo(function DestinationRevealCard({
  stop,
  index,
  total,
  compact = false,
  className,
}: {
  stop: JourneyStop;
  index: number;
  total: number;
  compact?: boolean;
  className?: string;
}) {
  const [photoOk, setPhotoOk] = React.useState(true);
  const photo = stop.photo && photoOk ? stop.photo : null;
  const where = [stop.state, stop.country !== "India" || !stop.state ? stop.country : null].filter(Boolean).join(", ");

  const media = photo ? (
    <motion.div
      className={cn("relative shrink-0 overflow-hidden bg-navy-800", compact ? "size-[104px] rounded-2xl" : "aspect-[16/10] w-full")}
      initial={{ clipPath: "inset(100% 0 0 0)" }}
      animate={{ clipPath: "inset(0% 0 0 0)" }}
      transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.img
        src={photo.url}
        alt={photo.caption ?? `Your photo from ${stop.tripName ?? stop.city}`}
        decoding="async"
        onError={() => setPhotoOk(false)}
        className="size-full object-cover"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1.02 }}
        transition={{ duration: 4, ease: "easeOut" }}
      />
      {!compact && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy-900/90 to-transparent" />
          {stop.tripName && (
            <span className="absolute bottom-3 left-4 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-cream-100/90 backdrop-blur">
              Your photo · {stop.tripName}
            </span>
          )}
        </>
      )}
    </motion.div>
  ) : (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-[linear-gradient(120deg,#6d28d9,#ff3366)]",
        compact ? "grid size-[104px] place-items-center rounded-2xl" : "h-20 sm:h-24",
      )}
    >
      {compact ? (
        <span className="font-display text-5xl font-extrabold text-white/90">{String(index + 1).padStart(2, "0")}</span>
      ) : (
        <>
          <span className="absolute -bottom-6 right-3 font-display text-[7rem] font-extrabold leading-none text-white/15">{String(index + 1).padStart(2, "0")}</span>
          <MapPin className="absolute left-5 top-5 size-6 text-cream-50/90" />
        </>
      )}
    </div>
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.25 } }}
      transition={{ type: "spring", damping: 24, stiffness: 220 }}
      className={cn(
        "pointer-events-auto overflow-hidden border border-white/10 bg-navy-900/80 text-cream-100 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl",
        compact ? "flex gap-3.5 rounded-[24px] p-3" : "rounded-[28px]",
        className,
      )}
      aria-live="polite"
    >
      {media}
      <div className={cn("min-w-0", compact ? "flex-1 py-0.5" : "p-5 sm:p-6")}>
        <p className="flex flex-wrap items-center gap-x-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sunset-400 sm:text-[11px]">
          Stop {index + 1} of {total}
          {stop.visit > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sun-400/15 px-2 py-0.5 tracking-normal text-sun-400">
              <Repeat className="size-3" /> Visit #{stop.visit}
            </span>
          )}
        </p>
        <motion.h2
          className={cn("break-words font-display font-extrabold uppercase leading-[0.95]", compact ? "mt-1 text-[1.7rem]" : "mt-1.5 text-4xl sm:text-5xl")}
          initial={{ opacity: 0, y: 14, letterSpacing: "0.08em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "-0.01em" }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {stop.city}
        </motion.h2>
        {where && <p className={cn("truncate font-semibold text-cream-200/70", compact ? "text-xs" : "mt-1 text-sm")}>{where}</p>}
        <p className={cn("font-serif italic text-sun-400", compact ? "text-lg leading-tight" : "mt-2 text-2xl")}>{monthYear(stop.date)}</p>
        {stop.caption && stop.captionSource === "trip" && !compact && (
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cream-200/50">Trip memory</p>
        )}
        {stop.caption && (
          <motion.p
            className={cn("font-serif italic leading-snug text-cream-100/85", compact ? "mt-1 line-clamp-2 text-sm" : stop.captionSource === "trip" ? "mt-0.5 line-clamp-3 text-lg" : "mt-3 line-clamp-3 text-lg")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            “{stop.caption}”
          </motion.p>
        )}
        {!compact && (
          <p className="mt-3 truncate text-xs text-cream-200/55">
            {stop.tripName && (
              <>
                {stop.tripName}
                {stop.stopsInTrip > 1 && ` · stop ${stop.stopInTrip}/${stop.stopsInTrip}`} ·{" "}
              </>
            )}
            {stop.date && stop.endDate ? fmtRange(stop.date, stop.endDate) : "Dates not recorded"}
            {stop.legKm != null && stop.legKm >= 15 && ` · ≈ ${fmtNumber(stop.legKm)} km from the last stop`}
          </p>
        )}
      </div>
    </motion.article>
  );
});
