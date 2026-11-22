"use client";

/**
 * Original background tracks, synthesised with the Web Audio API.
 *
 * Nothing is downloaded and nothing is licensed: every track is generated from the patterns below,
 * so the music is royalty-free and safe to post (Instagram won't mute it for copyright).
 * Each track renders to an AudioBuffer of exactly the video's length, ending with a fade-out.
 */

export const TRACKS = [
  { key: "roadtrip", name: "Road Trip", vibe: "Upbeat pop", emoji: "🚗", bpm: 118 },
  { key: "goldenhour", name: "Golden Hour", vibe: "Lo-fi chill", emoji: "🌅", bpm: 82 },
  { key: "dhol", name: "Dhol Groove", vibe: "Desi festive", emoji: "🥁", bpm: 100 },
  { key: "nightdrive", name: "Night Drive", vibe: "Retro synthwave", emoji: "🌃", bpm: 104 },
  { key: "monsoon", name: "Monsoon", vibe: "Dreamy ambient", emoji: "🌧️", bpm: 72 },
] as const;

export type TrackKey = (typeof TRACKS)[number]["key"];

export const SAMPLE_RATE = 48000;

/* ───────────── synth primitives ───────────── */

type Ctx = BaseAudioContext;
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

const noiseCache = new WeakMap<Ctx, AudioBuffer>();
function noise(ctx: Ctx): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

function panTo(ctx: Ctx, out: AudioNode, pan = 0): AudioNode {
  if (!pan) return out;
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  p.connect(out);
  return p;
}

interface ToneOpts {
  t: number;
  midi: number;
  /** Held length before release, in seconds. 0 = pluck. */
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  cutoff?: number;
  q?: number;
  detune?: number;
  pan?: number;
}

function tone(ctx: Ctx, out: AudioNode, o: ToneOpts) {
  const a = o.attack ?? 0.01;
  const hold = Math.max(a, o.dur ?? 0);
  const r = o.release ?? 0.25;
  const peak = o.gain ?? 0.2;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.value = mtof(o.midi);
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, o.t);
  g.gain.linearRampToValueAtTime(peak, o.t + a);
  g.gain.setValueAtTime(peak, o.t + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + hold + r);
  let node: AudioNode = osc;
  if (o.cutoff) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.cutoff;
    f.Q.value = o.q ?? 0.7;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(panTo(ctx, out, o.pan));
  osc.start(o.t);
  osc.stop(o.t + hold + r + 0.05);
}

function kick(ctx: Ctx, out: AudioNode, t: number, gain = 0.9, from = 150, to = 42) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.4);
}

function hiss(ctx: Ctx, out: AudioNode, t: number, o: { gain: number; decay: number; type: BiquadFilterType; freq: number; q?: number; pan?: number }) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.frequency.value = o.freq;
  if (o.q) f.Q.value = o.q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(o.gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.decay);
  src.connect(f).connect(g).connect(panTo(ctx, out, o.pan));
  src.start(t, Math.random() * 0.5);
  src.stop(t + o.decay + 0.02);
}

const snare = (ctx: Ctx, out: AudioNode, t: number, gain = 0.35, decay = 0.18) => {
  hiss(ctx, out, t, { gain, decay, type: "highpass", freq: 1500 });
  tone(ctx, out, { t, midi: 54, type: "triangle", gain: gain * 0.5, attack: 0.002, release: 0.08 });
};
const hat = (ctx: Ctx, out: AudioNode, t: number, gain = 0.08, open = false) =>
  hiss(ctx, out, t, { gain, decay: open ? 0.22 : 0.045, type: "highpass", freq: 7500, pan: 0.25 });
const clap = (ctx: Ctx, out: AudioNode, t: number, gain = 0.3) => {
  for (const d of [0, 0.011, 0.023]) hiss(ctx, out, t + d, { gain: gain * (d ? 0.6 : 1), decay: d === 0.023 ? 0.16 : 0.03, type: "bandpass", freq: 1200, q: 0.8 });
};
const shaker = (ctx: Ctx, out: AudioNode, t: number, gain = 0.05) =>
  hiss(ctx, out, t, { gain, decay: 0.06, type: "bandpass", freq: 6000, q: 1.2, pan: -0.3 });

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
}

/* ───────────── tracks ───────────── */

type Render = (ctx: Ctx, out: AudioNode, duration: number) => void;

/** Calls `fn(barStartTime, barIndex)` for every bar that starts before `duration`. */
function bars(bpm: number, duration: number, fn: (t: number, bar: number, beat: number) => void) {
  const beat = 60 / bpm;
  for (let bar = 0; bar * 4 * beat < duration; bar++) fn(bar * 4 * beat, bar, beat);
}

const roadtrip: Render = (ctx, out, duration) => {
  // I – V – vi – IV in C, bright saw stabs, four-on-the-floor.
  const chords = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]];
  const roots = [36, 43, 45, 41];
  bars(118, duration, (t, bar, beat) => {
    const c = chords[bar % 4];
    const s = beat / 4;
    for (let b = 0; b < 4; b++) {
      if (bar > 0) kick(ctx, out, t + b * beat, 0.85);
      hat(ctx, out, t + b * beat + beat / 2, 0.07);
      tone(ctx, out, { t: t + b * beat, midi: roots[bar % 4], type: "sawtooth", cutoff: 420, gain: 0.16, dur: beat * 0.6, release: 0.08 });
      tone(ctx, out, { t: t + b * beat + beat / 2, midi: roots[bar % 4] + 12, type: "sawtooth", cutoff: 500, gain: 0.1, dur: beat * 0.3, release: 0.06 });
      for (const m of c) tone(ctx, out, { t: t + b * beat + beat / 2, midi: m, type: "sawtooth", cutoff: 2400, gain: 0.045, dur: 0.08, release: 0.12, detune: 6 });
    }
    if (bar > 0) for (const b of [1, 3]) clap(ctx, out, t + b * beat, 0.32);
    if (bar >= 2)
      for (let i = 0; i < 16; i++)
        tone(ctx, out, { t: t + i * s, midi: c[i % 3] + 12 + (i % 8 >= 6 ? 12 : 0), type: "square", cutoff: 3200, gain: 0.028, release: 0.12, pan: i % 2 ? 0.35 : -0.35 });
  });
};

const goldenhour: Render = (ctx, out, duration) => {
  // Lo-fi: jazzy 7th chords on a soft keys sound, swung drums, vinyl crackle.
  const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  const rand = seeded(7);
  bars(82, duration, (t, bar, beat) => {
    const c = chords[bar % 4];
    const swing = beat * 0.08;
    for (const m of c) {
      tone(ctx, out, { t: t + 0.01, midi: m, type: "triangle", cutoff: 1300, gain: 0.07, attack: 0.02, dur: beat * 3.2, release: 0.9 });
      tone(ctx, out, { t: t + 0.01, midi: m + 12, type: "sine", gain: 0.018, attack: 0.02, dur: beat * 2, release: 0.6 });
    }
    tone(ctx, out, { t, midi: c[0] - 12, type: "sine", gain: 0.28, dur: beat * 1.5, release: 0.3 });
    tone(ctx, out, { t: t + beat * 2.5, midi: c[0] - 12 + (bar % 2 ? 7 : 0), type: "sine", gain: 0.22, dur: beat, release: 0.3 });
    kick(ctx, out, t, 0.7, 120, 45);
    kick(ctx, out, t + beat * 1.5 + swing, 0.5, 120, 45);
    kick(ctx, out, t + beat * 2.5 + swing, 0.55, 120, 45);
    for (const b of [1, 3]) snare(ctx, out, t + b * beat, 0.2, 0.15);
    for (let i = 0; i < 8; i++) hat(ctx, out, t + (i * beat) / 2 + (i % 2 ? swing : 0), i % 2 ? 0.035 : 0.05);
    for (let i = 0; i < 6; i++) hiss(ctx, out, t + rand() * beat * 4, { gain: 0.03 + rand() * 0.04, decay: 0.008, type: "highpass", freq: 3000, pan: rand() - 0.5 });
  });
  // vinyl bed
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 1800;
  const g = ctx.createGain();
  g.gain.value = 0.012;
  src.connect(f).connect(g).connect(out);
  src.start(0);
  src.stop(duration);
};

const dhol: Render = (ctx, out, duration) => {
  // Bhangra-style chaal on synthesised dhol, a plucky tumbi-like riff, and a drone.
  const riff = [74, 74, 77, 74, 81, 79, 77, 74, 72, 74, 77, 79, 77, 74, 72, 69];
  bars(100, duration, (t, bar, beat) => {
    const s = beat / 4;
    for (const i of [0, 6, 8, 11]) kick(ctx, out, t + i * s, i === 0 ? 0.9 : 0.7, 110, 55);
    for (const i of [2, 4, 10, 12, 14]) {
      tone(ctx, out, { t: t + i * s, midi: 64, type: "sine", gain: 0.22, attack: 0.002, release: 0.12 });
      hiss(ctx, out, t + i * s, { gain: 0.12, decay: 0.03, type: "bandpass", freq: 2500, q: 1 });
    }
    for (let i = 0; i < 16; i++) shaker(ctx, out, t + i * s, i % 4 === 2 ? 0.07 : 0.035);
    if (bar % 4 === 0) {
      tone(ctx, out, { t, midi: 38, type: "sawtooth", cutoff: 500, gain: 0.05, attack: 0.5, dur: beat * 15, release: 1.5 });
      tone(ctx, out, { t, midi: 45, type: "sawtooth", cutoff: 600, gain: 0.035, attack: 0.5, dur: beat * 15, release: 1.5, detune: 5 });
    }
    tone(ctx, out, { t, midi: 26, type: "sine", gain: 0.3, dur: beat * 0.8, release: 0.2 });
    tone(ctx, out, { t: t + beat * 2, midi: 26, type: "sine", gain: 0.25, dur: beat * 0.8, release: 0.2 });
    if (bar >= 1) {
      const half = (bar % 2) * 8;
      for (let i = 0; i < 8; i++) {
        if (i === 3 || i === 7) continue;
        tone(ctx, out, { t: t + i * (beat / 2), midi: riff[half + i], type: "square", cutoff: 3500, q: 4, gain: 0.05, attack: 0.002, release: 0.18, pan: 0.2 });
      }
    }
  });
};

const nightdrive: Render = (ctx, out, duration) => {
  // Synthwave: pulsing octave bass, wide pads, sparkly arp, big gated snare.
  const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const roots = [33, 29, 36, 31];
  bars(104, duration, (t, bar, beat) => {
    const c = chords[bar % 4];
    for (let i = 0; i < 8; i++)
      tone(ctx, out, { t: t + (i * beat) / 2, midi: roots[bar % 4] + (i % 2 ? 12 : 0), type: "sawtooth", cutoff: 700, gain: 0.14, dur: beat * 0.35, release: 0.05 });
    for (const m of c)
      for (const d of [-9, 9])
        tone(ctx, out, { t, midi: m, type: "sawtooth", cutoff: 1500, gain: 0.03, attack: 0.25, dur: beat * 3.4, release: 0.6, detune: d, pan: d > 0 ? 0.4 : -0.4 });
    if (bar >= 1) {
      for (const b of [0, 2]) kick(ctx, out, t + b * beat, 0.85);
      for (const b of [1, 3]) snare(ctx, out, t + b * beat, 0.32, 0.32);
      for (let i = 0; i < 8; i++) hat(ctx, out, t + (i * beat) / 2, 0.05);
    }
    if (bar >= 2)
      for (let i = 0; i < 16; i++)
        tone(ctx, out, { t: t + (i * beat) / 4, midi: c[[0, 1, 2, 1][i % 4]] + 24, type: "square", cutoff: 4000, gain: 0.022, release: 0.1, pan: Math.sin(i) * 0.5 });
  });
};

const monsoon: Render = (ctx, out, duration) => {
  // Ambient: slow detuned pads, sparse pentatonic plucks, soft rain.
  const chords = [[57, 60, 64, 71], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]];
  const scale = [69, 72, 74, 76, 79, 81, 84];
  const rand = seeded(42);
  bars(72, duration, (t, bar, beat) => {
    if (bar % 2 === 0) {
      const c = chords[(bar / 2) % 4];
      for (const m of c)
        for (const d of [-7, 0, 7])
          tone(ctx, out, { t, midi: m, type: "sawtooth", cutoff: 850, gain: 0.018, attack: 1.4, dur: beat * 7, release: 2.2, detune: d, pan: d / 14 });
      tone(ctx, out, { t, midi: c[0] - 24, type: "sine", gain: 0.2, attack: 0.8, dur: beat * 7, release: 2 });
    }
    for (let i = 0; i < 8; i++)
      if (rand() < 0.45)
        tone(ctx, out, { t: t + (i * beat) / 2, midi: scale[Math.floor(rand() * scale.length)], type: "triangle", gain: 0.06, attack: 0.004, release: 1.2, pan: rand() - 0.5 });
    kick(ctx, out, t, 0.35, 90, 40);
  });
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 4500;
  f.Q.value = 0.4;
  const g = ctx.createGain();
  g.gain.value = 0.02;
  src.connect(f).connect(g).connect(out);
  src.start(0);
  src.stop(duration);
};

const RENDERERS: Record<TrackKey, Render> = { roadtrip, goldenhour, dhol, nightdrive, monsoon };

/** Master chain: glue compressor + fade in/out. Returns the input node to connect instruments to. */
function master(ctx: Ctx, duration: number, fadeOut = 1.6): AudioNode {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, 0);
  g.gain.linearRampToValueAtTime(0.9, 0.05);
  g.gain.setValueAtTime(0.9, Math.max(0.05, duration - fadeOut));
  g.gain.linearRampToValueAtTime(0, duration);
  comp.connect(g).connect(ctx.destination);
  return comp;
}

/** Renders a built-in track to an AudioBuffer exactly `duration` seconds long. */
export async function renderTrack(key: TrackKey, duration: number): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
  RENDERERS[key](ctx, master(ctx, duration), duration);
  return ctx.startRendering();
}

/** Decodes an uploaded audio file. */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, SAMPLE_RATE, SAMPLE_RATE);
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("Couldn't read that audio file. Try an MP3, M4A or WAV.");
  }
}

/** Fits any audio to exactly `duration` seconds (starting at `offset`), resampled to 48 kHz stereo, with a fade-out. */
export async function fitAudio(buffer: AudioBuffer, duration: number, offset = 0): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = buffer.duration - offset < duration; // short clips loop rather than leave silence
  src.connect(master(ctx, duration, 2));
  src.start(0, Math.max(0, Math.min(offset, buffer.duration - 0.5)));
  return ctx.startRendering();
}

/** Seconds per scene so cuts land on the beat: a whole number of beat pairs, as close to `target` as possible. */
export function beatAlignedSeconds(bpm: number, target: number): number {
  const twoBeats = (2 * 60) / bpm;
  return Math.max(1, Math.round(target / twoBeats)) * twoBeats;
}
