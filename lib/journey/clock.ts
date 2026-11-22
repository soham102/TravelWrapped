"use client";

import * as React from "react";
import { frameAt, type Frame, type Schedule } from "./schedule";

export type Speed = 0.5 | 1 | 2;

export interface ClockState {
  playing: boolean;
  speed: Speed;
  ended: boolean;
  segIndex: number;
  stop: number;
  revealed: number;
  /** Increments on every seek, so listeners can tell a jump from normal playback. */
  seekId: number;
}

/**
 * requestAnimationFrame playback clock.
 *
 * - Per-frame consumers (route drawing, progress bar) use `onTick` and update the DOM/map directly.
 * - React components subscribe to `state`, which only changes on segment boundaries, play/pause,
 *   speed and seeks — so the UI re-renders a handful of times per destination, not 60×/second.
 * - Pausing keeps the current time; hiding the tab pauses and resumes where it left off.
 */
export class JourneyClock {
  time = 0;
  private raf = 0;
  private last = 0;
  private tickers = new Set<(t: number, f: Frame) => void>();
  private listeners = new Set<() => void>();
  private resumeOnVisible = false;
  state: ClockState;

  constructor(public schedule: Schedule) {
    const f = frameAt(schedule, 0);
    this.state = { playing: false, speed: 1, ended: false, segIndex: f.segIndex, stop: f.stop, revealed: f.revealed, seekId: 0 };
  }

  get duration() {
    return this.schedule.duration;
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  };
  getState = () => this.state;

  onTick(cb: (t: number, f: Frame) => void) {
    this.tickers.add(cb);
    cb(this.time, frameAt(this.schedule, this.time));
    return () => void this.tickers.delete(cb);
  }

  private set(patch: Partial<ClockState>) {
    let changed = false;
    for (const k in patch) {
      const key = k as keyof ClockState;
      if (this.state[key] !== patch[key]) changed = true;
    }
    if (!changed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private emit() {
    const f = frameAt(this.schedule, this.time);
    this.tickers.forEach((cb) => cb(this.time, f));
    this.set({ segIndex: f.segIndex, stop: f.stop, revealed: f.revealed, ended: this.time >= this.duration });
  }

  private loop = (now: number) => {
    // Clamp the step so a stalled frame (or a background tab) never makes the journey jump ahead.
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time = Math.min(this.duration, this.time + dt * this.state.speed);
    this.emit();
    if (this.time >= this.duration) {
      this.set({ playing: false });
      this.raf = 0;
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  play() {
    if (this.state.playing) return;
    if (this.time >= this.duration) this.seek(0);
    this.set({ playing: true });
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  pause() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.set({ playing: false });
  }

  toggle() {
    if (this.state.playing) this.pause();
    else this.play();
  }

  seek(t: number) {
    this.time = Math.min(Math.max(0, t), this.duration);
    this.last = performance.now();
    this.set({ seekId: this.state.seekId + 1 });
    this.emit();
  }

  replay() {
    this.seek(0);
    this.play();
  }

  setSpeed(speed: Speed) {
    this.set({ speed });
  }

  /** Jump to a destination's arrival. */
  goToStop(i: number) {
    const at = this.schedule.revealAt[i];
    if (at != null) this.seek(at + 0.001);
  }

  next() {
    const { stop, segIndex } = this.state;
    const seg = this.schedule.segments[segIndex];
    if (seg.kind === "intro") return this.goToStop(0);
    if (seg.kind === "travel") return this.goToStop(stop);
    if (stop + 1 < this.schedule.revealAt.length) return this.goToStop(stop + 1);
    // From the last destination: the finale.
    const fin = this.schedule.segments.find((s) => s.kind === "finale");
    if (fin && this.time < fin.start) this.seek(fin.start);
    else this.seek(this.duration);
  }

  prev() {
    const { stop, segIndex } = this.state;
    const seg = this.schedule.segments[segIndex];
    if (seg.kind === "finale" || seg.kind === "outro") return this.goToStop(this.schedule.revealAt.length - 1);
    if (stop <= 0) return this.seek(0);
    // Mid-way through a reveal: restart it; at its very start (or travelling): previous stop.
    if (seg.kind === "reveal" && this.time - seg.start > 1.2) return this.goToStop(stop);
    this.goToStop(stop - 1);
  }

  /** Pause while the tab is hidden; resume when it's back. */
  attachVisibility() {
    const onVis = () => {
      if (document.hidden) {
        this.resumeOnVisible = this.state.playing;
        this.pause();
      } else if (this.resumeOnVisible) {
        this.resumeOnVisible = false;
        this.play();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.tickers.clear();
    this.listeners.clear();
  }
}

export function useJourneyClock(schedule: Schedule): JourneyClock {
  const [clock] = React.useState(() => new JourneyClock(schedule));
  React.useEffect(() => {
    const detach = clock.attachVisibility();
    return () => {
      detach();
      clock.pause();
    };
  }, [clock]);
  return clock;
}

export function useClockState(clock: JourneyClock): ClockState {
  return React.useSyncExternalStore(clock.subscribe, clock.getState, clock.getState);
}
