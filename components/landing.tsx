"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download, Lock, MapPinned, PenLine, Share2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Logo, SiteFooter } from "@/components/brand";
import { IndiaMapSvg } from "@/components/map/india-map-svg";
import { useAuth } from "@/components/providers";
import { ScaledFrame } from "@/components/story/formats";
import { AnimateCtx, PERSONALITY_ICONS } from "@/components/story/primitives";
import { AchievementsSlide, LongestSlide, MostExploredSlide, NumbersSlide, PersonalitySlide } from "@/components/story/slides";
import { StoryViewer } from "@/components/story/story-viewer";
import { buttonVariants } from "@/components/ui/button";
import { trackOnce } from "@/lib/analytics";
import { DISCLAIMER } from "@/lib/config";
import { statsToPoints } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { computeWrapped } from "@/lib/wrapped/compute";
import { PERSONALITY_CATALOGUE } from "@/lib/wrapped/personality";
import { sampleTrips } from "@/lib/wrapped/sample";

const MARQUEE = ["Manali", "Gokarna", "Hampi", "Rishikesh", "Jaisalmer", "Pondicherry", "Kasol", "Varkala", "Udaipur", "Spiti Valley", "Shillong", "Coorg", "Leh", "Pushkar", "Munnar", "Tawang"];

export function Landing() {
  const { user } = useAuth();
  const demo = React.useMemo(() => computeWrapped(sampleTrips(2026), 2026, "Aanya"), []);
  const cta = user ? "/dashboard" : "/signup";

  React.useEffect(() => {
    trackOnce("landing_view", "home", { ref: document.referrer ? new URL(document.referrer).hostname : null });
  }, []);

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ── */}
      <section className="grain relative bg-navy-950 text-cream-100">
        <div className="absolute -left-40 -top-40 size-[36rem] rounded-full bg-electric-500/35 blur-3xl" />
        <div className="absolute -right-40 top-40 size-[34rem] rounded-full bg-sunset-500/30 blur-3xl" />
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Logo light />
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-cream-200/80 hover:text-cream-100 sm:block">How it works</a>
            <Link href="/demo" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-cream-200/80 hover:text-cream-100 sm:block">Sample</Link>
            {user ? (
              <Link href="/dashboard" className={buttonVariants({ size: "sm", variant: "light" })}>Dashboard</Link>
            ) : (
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-cream-100">Log in</Link>
            )}
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid grid-cols-1 max-w-6xl items-center gap-10 px-5 pb-20 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-14">
          <div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sunset-300">
              <Sparkles className="size-3.5" /> Your journeys. Your memories. Your year.
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5 font-display text-[44px] font-extrabold leading-[0.95] sm:text-7xl">
              2026 was more than a year.{" "}
              <span className="bg-gradient-to-r from-sun-400 via-sunset-500 to-electric-300 bg-clip-text font-serif font-normal italic text-transparent">It was a journey.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 max-w-xl text-lg text-cream-200/80">
              Every city you explored. Every kilometre you travelled. Every memory you made. Turn your travel year into a story worth sharing.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 flex flex-wrap gap-3">
              <Link href={cta} className={buttonVariants({ size: "lg" })}>
                Create My Travel Wrapped <ArrowRight />
              </Link>
              <a href="#how" className={buttonVariants({ size: "lg", variant: "glass" })}>See How It Works</a>
            </motion.div>
            <p className="mt-4 text-sm text-cream-200/50">Free · Private by default · Made for India&apos;s explorers</p>
          </div>

          <div className="relative mx-auto w-full max-w-[460px]">
            <IndiaMapSvg width={440} height={500} theme="night" visitedStates={demo.states} points={statsToPoints(demo)} labels={8} routes animate interactive className="w-full" />
            <FloatingCard className="left-1 top-6 w-[108px] -rotate-6 sm:-left-10 sm:w-[136px]" delay={1.1}>
              <NumbersSlide s={demo} />
            </FloatingCard>
            <FloatingCard className="bottom-2 right-1 w-[108px] rotate-6 sm:-right-8 sm:w-[136px]" delay={1.3}>
              <PersonalitySlide s={demo} />
            </FloatingCard>
          </div>
        </div>

        <div className="relative z-10 overflow-hidden border-y border-white/10 bg-navy-900/60 py-4">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-2xl font-extrabold text-cream-100/25">
            {[...MARQUEE, ...MARQUEE].map((c, i) => (
              <span key={i} className="flex items-center gap-10">
                {c} <span className="text-sunset-500">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="scroll-mt-10 bg-cream-100 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sunset-600">How it works</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">Three steps from “where did this year go?” to a story you&apos;ll want to post.</h2>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { icon: PenLine, color: "bg-sunset-500", t: "Add your trips", b: "Search any destination, pick your dates, tag who you went with. Multi-city routes, photos and memories welcome." },
              { icon: Sparkles, color: "bg-electric-500", t: "We crunch your year", b: "Real stats only — cities, states, longest trip, most-visited place, plus a travel personality with the reasons behind it." },
              { icon: Share2, color: "bg-jungle-500", t: "Download & share", b: "Instagram-ready story slides, a square post, a map poster and a full PDF. Share a link to WhatsApp, LinkedIn and more." },
            ].map((s, i) => (
              <motion.div key={s.t} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative rounded-[28px] bg-white p-7">
                <span className="absolute right-6 top-5 font-display text-6xl font-extrabold text-navy-900/5">{i + 1}</span>
                <span className={cn("grid size-12 place-items-center rounded-2xl text-white", s.color)}>
                  <s.icon className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-2xl font-bold">{s.t}</h3>
                <p className="mt-2 text-muted">{s.b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive preview ── */}
      <section className="bg-navy-900 py-20 text-cream-100 sm:py-28">
        <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sunset-400">Interactive preview</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold leading-tight sm:text-5xl">Tap through a real Travel Wrapped.</h2>
            <p className="mt-4 max-w-lg text-cream-200/70">
              This one is built from 8 sample trips — Goa, Rajasthan, the Himalayas and more. Yours is built from your own trips, so every number on every slide is true.
            </p>
            <ul className="mt-8 grid max-w-lg grid-cols-2 gap-3 text-sm">
              {["Your travel year in numbers", "Your India map", "Most-explored destination", "Trip-by-trip timeline", "Longest adventure", "Travel personality", "Photo highlights", "Achievements unlocked"].map((x) => (
                <li key={x} className="flex items-center gap-2 text-cream-200/80">
                  <span className="size-1.5 rounded-full bg-sunset-500" /> {x}
                </li>
              ))}
            </ul>
            <Link href="/demo" className={buttonVariants({ variant: "glass", className: "mt-8" })}>
              Open the full sample <ArrowRight />
            </Link>
          </div>
          <div className="mx-auto w-full max-w-[360px]">
            <StoryViewer s={demo} embedded />
          </div>
        </div>
      </section>

      {/* ── Sample cards ── */}
      <section className="bg-cream-200 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-600">Story cards</p>
            <h2 className="mx-auto mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">Every slide is designed to be screenshotted.</h2>
          </div>
          <div className="no-scrollbar -mx-5 mt-12 flex snap-x gap-4 overflow-x-auto px-5 pb-6 md:justify-center">
            {[NumbersSlide, MostExploredSlide, LongestSlide, AchievementsSlide].map((C, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className={cn("w-[200px] shrink-0 snap-center overflow-hidden rounded-[20px] shadow-2xl sm:w-[230px]", ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3"][i])}>
                <AnimateCtx.Provider value={false}>
                  <ScaledFrame w={360} h={640}>
                    <C s={demo} />
                  </ScaledFrame>
                </AnimateCtx.Provider>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold">
            {["9:16 Instagram Story", "1:1 Instagram Post", "India map poster", "Travel timeline", "Complete PDF"].map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2"><Download className="size-3.5 text-sunset-500" /> {f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Personalities ── */}
      <section className="bg-cream-100 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-jungle-600">Travel personalities</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">Which traveller were you this year?</h2>
          <p className="mt-3 max-w-xl text-muted">Assigned by clear rules on your actual trips — and we always show you why.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
            {PERSONALITY_CATALOGUE.map((p, i) => {
              const Icon = PERSONALITY_ICONS[p.key] ?? Sparkles;
              const tone = ["bg-sunset-500 text-white", "bg-navy-900 text-cream-100", "bg-electric-500 text-white", "bg-jungle-500 text-white", "bg-sun-400 text-navy-900"][i % 5];
              return (
                <motion.div key={p.key} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className={cn("flex flex-col rounded-[24px] p-5", tone)}>
                  <Icon className="size-7" />
                  <p className="mt-6 font-display text-lg font-extrabold leading-tight">{p.title}</p>
                  <p className="mt-1 text-sm opacity-80">{p.tagline}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why trust it (no invented numbers) ── */}
      <section id="privacy" className="bg-navy-950 py-20 text-cream-100 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sunset-400">Built different</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">No fake stats. No public profile. Just your year.</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: MapPinned, t: "Every number is real", b: "Stats, achievements and your personality come only from the trips you enter. Distance shows up only when you log it." },
              { icon: Lock, t: "Private by default", b: "Your trips and photos are visible only to you. Public links are opt-in, revocable, and never include photos or notes." },
              { icon: ShieldCheck, t: "Geographically accurate", b: "Your map uses official state & UT boundaries for India — not a decorative outline." },
            ].map((x) => (
              <div key={x.t} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                <x.icon className="size-7 text-sunset-400" />
                <h3 className="mt-5 font-display text-xl font-bold">{x.t}</h3>
                <p className="mt-2 text-sm text-cream-200/70">{x.b}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm font-semibold text-cream-200/60">{DISCLAIMER}</p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-sunset-500 py-20 text-center sm:py-24">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-navy-950 sm:text-6xl">Your 2026 deserves a recap.</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-cream-50">Add your first trip in under a minute. Your map starts lighting up immediately.</p>
          <Link href={cta} className={buttonVariants({ size: "lg", variant: "dark", className: "mt-8" })}>
            Create My Travel Wrapped <ArrowRight />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function FloatingCard({ children, className, delay }: { children: React.ReactNode; className?: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: "spring", stiffness: 120 }} className={cn("absolute", className)}>
      <div className="animate-float overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20">
        <AnimateCtx.Provider value={false}>
          <ScaledFrame w={360} h={640}>{children}</ScaledFrame>
        </AnimateCtx.Provider>
      </div>
    </motion.div>
  );
}
