"use client";

import { motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  CalendarHeart,
  Car,
  Compass,
  Flame,
  Flower2,
  Heart,
  Hourglass,
  Landmark,
  Luggage,
  Map as MapIcon,
  Moon,
  Mountain,
  Plane,
  Route,
  Sparkles,
  Sun,
  Tent,
  User,
  Waves,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const STORY_W = 360;
export const STORY_H = 640;

/** When false (exports, thumbnails) everything renders in its final state. */
export const AnimateCtx = React.createContext(false);

export function Canvas({
  w = STORY_W,
  h = STORY_H,
  className,
  style,
  children,
}: {
  w?: number;
  h?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ width: w, height: h, ...style }}>
      {children}
    </div>
  );
}

export function R({
  children,
  delay = 0,
  y = 18,
  x = 0,
  scale,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const animate = React.useContext(AnimateCtx);
  if (!animate)
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y, x, scale: scale ?? 1 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ value, delay = 0, duration = 1.1, format }: { value: number; delay?: number; duration?: number; format?: (n: number) => string }) {
  const animate = React.useContext(AnimateCtx);
  const [n, setN] = React.useState(animate ? 0 : value);
  React.useEffect(() => {
    if (!animate) {
      setN(value);
      return;
    }
    let raf = 0;
    const startAt = performance.now() + delay * 1000;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - startAt) / (duration * 1000)));
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate, delay, duration]);
  return <>{format ? format(n) : n}</>;
}

/** Small brand strip shown on every slide so individually-shared images stay attributed. */
export function SlideBrand({ year, light = true, label }: { year: number; light?: boolean; label?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-9 text-[10px] font-bold uppercase tracking-[0.2em]",
        light ? "text-cream-100/80" : "text-ink/70",
      )}
    >
      <span>Travel Wrapped</span>
      <span>{label ?? year}</span>
    </div>
  );
}

export function SlideFooter({ light = true, text = "travel wrapped" }: { light?: boolean; text?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 px-6 pb-6 text-[10px] font-semibold tracking-wide",
        light ? "text-cream-100/55" : "text-ink/50",
      )}
    >
      {text}
    </div>
  );
}

export function fitSize(text: string, sizes: [number, number][], fallback: number): number {
  for (const [len, size] of sizes) if (text.length <= len) return size;
  return fallback;
}

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  luggage: Luggage,
  map: MapIcon,
  building: Building2,
  calendar: CalendarDays,
  mountain: Mountain,
  waves: Waves,
  landmark: Landmark,
  user: User,
  route: Route,
  hourglass: Hourglass,
  sun: Sun,
  tent: Tent,
  plane: Plane,
  heart: Heart,
};

export const PERSONALITY_ICONS: Record<string, LucideIcon> = {
  solo: Compass,
  mountain: Mountain,
  beach: Waves,
  weekend: CalendarHeart,
  roadtrip: Car,
  spiritual: Flower2,
  cultural: Landmark,
  adventure: Flame,
  city: Building2,
  curious: Sparkles,
  dreamer: Moon,
};
