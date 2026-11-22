import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Parse a YYYY-MM-DD string as a local date (no timezone drift). */
export function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

export function tripDays(start: string, end: string): number {
  const ms = parseDate(end).getTime() - parseDate(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = MONTHS;

export function fmtDate(d: string, opts: { year?: boolean } = {}): string {
  const date = parseDate(d);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${opts.year ? " " + date.getFullYear() : ""}`;
}

export function fmtRange(start: string, end: string): string {
  if (start === end) return fmtDate(start);
  const s = parseDate(start);
  const e = parseDate(end);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]}`;
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export function plural(n: number, one: string, many?: string): string {
  return `${n} ${n === 1 ? one : many ?? one + "s"}`;
}

export function firstName(name: string | null | undefined): string {
  if (!name) return "Traveller";
  return name.trim().split(/\s+/)[0] || "Traveller";
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isValidEmail(e: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254;
}

export function siteUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong";
}

/** Deterministic (SSR-safe) host label used on exported images. */
export function brandHost(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) {
    try {
      return new URL(url).host.replace(/^www\./, "");
    } catch {
      /* fall through */
    }
  }
  return "travel wrapped";
}

/** JSON.stringify with sorted keys — for comparing objects round-tripped through jsonb. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(",")}}`;
}
