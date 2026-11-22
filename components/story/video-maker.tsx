"use client";

import { Check, Clapperboard, Download, Music2, Pause, Play, RotateCcw, Share2, Upload, VolumeX, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { canShareFiles, nativeShare } from "@/lib/share";
import { cn, errorMessage } from "@/lib/utils";
import { encodeStoryVideo, loadScene, VideoUnsupportedError, type VideoResult } from "@/lib/video/encode";
import { beatAlignedSeconds, decodeAudioFile, fitAudio, renderTrack, TRACKS, type TrackKey } from "@/lib/video/music";
import { buildPhotoScenes } from "@/lib/video/photo-scenes";
import { galleryOf, pickCollagePhotos } from "./collage";
import type { ExportKey } from "./export-stage";
import { SLIDES, type StoryData } from "./slides";

type Music = { kind: "track"; key: TrackKey } | { kind: "upload"; name: string; buffer: AudioBuffer } | { kind: "none" };
type Pace = "snappy" | "relaxed";
type Source = "slides" | "photos";
const PACE_TARGET: Record<Pace, number> = { snappy: 2.2, relaxed: 3.2 };
const PREVIEW_SECONDS = 12;
/** Photo videos show at most this many photos (picked across all trips, in date order). */
const MAX_VIDEO_PHOTOS = 15;

type Phase =
  | { name: "idle" }
  | { name: "working"; label: string; pct: number }
  | { name: "done"; result: VideoResult; url: string; music: string };

export function VideoMaker({
  s,
  capture,
  fileBase,
  shareText,
}: {
  s: StoryData;
  capture: (key: ExportKey) => Promise<string>;
  fileBase: string;
  shareText: string;
}) {
  const gallery = galleryOf(s);
  const hasPhotos = gallery.length > 0;
  const [source, setSource] = React.useState<Source>("slides");
  const [music, setMusic] = React.useState<Music>({ kind: "track", key: "roadtrip" });
  const [pace, setPace] = React.useState<Pace>("snappy");
  const [withCollage, setWithCollage] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>({ name: "idle" });
  const [previewing, setPreviewing] = React.useState<string | null>(null);
  const [loadingUpload, setLoadingUpload] = React.useState(false);

  const audioCtx = React.useRef<AudioContext | null>(null);
  const playing = React.useRef<AudioBufferSourceNode | null>(null);
  const previewCache = React.useRef(new Map<string, AudioBuffer>());
  const abort = React.useRef<AbortController | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const stopPreview = React.useCallback(() => {
    try {
      playing.current?.stop();
    } catch {
      /* already stopped */
    }
    playing.current = null;
    setPreviewing(null);
  }, []);

  // Clean up audio + the object URL when leaving the page.
  const doneUrl = phase.name === "done" ? phase.url : null;
  React.useEffect(() => () => void (doneUrl && URL.revokeObjectURL(doneUrl)), [doneUrl]);
  React.useEffect(
    () => () => {
      stopPreview();
      abort.current?.abort();
      void audioCtx.current?.close();
    },
    [stopPreview],
  );

  const preview = async (id: string, get: () => Promise<AudioBuffer>) => {
    if (previewing === id) return stopPreview();
    stopPreview();
    setPreviewing(id);
    try {
      audioCtx.current ??= new AudioContext();
      await audioCtx.current.resume();
      let buf = previewCache.current.get(id);
      if (!buf) {
        buf = await get();
        previewCache.current.set(id, buf);
      }
      const src = audioCtx.current.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtx.current.destination);
      src.onended = () => {
        if (playing.current === src) {
          playing.current = null;
          setPreviewing(null);
        }
      };
      playing.current = src;
      src.start();
    } catch (e) {
      setPreviewing(null);
      toast.error(errorMessage(e));
    }
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return toast.error("That file is over 25 MB. Try a shorter clip.");
    setLoadingUpload(true);
    stopPreview();
    try {
      const buffer = await decodeAudioFile(file);
      previewCache.current.delete("upload");
      setMusic({ kind: "upload", name: file.name.replace(/\.[^.]+$/, ""), buffer });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoadingUpload(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const generate = async () => {
    stopPreview();
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      // 1. Scenes.
      const scenes: CanvasImageSource[] = [];
      if (source === "slides") {
        // Every story slide, with the photo collage slotted in before the closing share card.
        const keys: ExportKey[] = SLIDES.map((_, i) => `slide:${i}` as ExportKey);
        if (hasPhotos && withCollage) keys.splice(keys.length - 1, 0, "collage-story");
        for (let i = 0; i < keys.length; i++) {
          if (ctrl.signal.aborted) return;
          setPhase({ name: "working", label: `Capturing slide ${i + 1} of ${keys.length}…`, pct: (i / keys.length) * 30 });
          scenes.push(await loadScene(await capture(keys[i])));
        }
      } else {
        // Title card → each photo (city by city, in date order) → collage → closing card.
        const collage = withCollage ? await loadScene(await capture("collage-story")) : null;
        const photos = pickCollagePhotos(gallery, MAX_VIDEO_PHOTOS, 0);
        scenes.push(
          ...(await buildPhotoScenes({
            info: { year: s.year, ownerName: s.ownerName, totalTrips: s.totalTrips, totalDays: s.totalDays, places: s.cities.length },
            photos,
            collage,
            onProgress: (done, total) => setPhase({ name: "working", label: `Preparing photo ${done + 1} of ${total}…`, pct: (done / total) * 30 }),
          })),
        );
        if (ctrl.signal.aborted) return;
      }

      // 2. Timing: with a built-in track, cuts land on the beat.
      const target = PACE_TARGET[pace];
      const bpm = music.kind === "track" ? TRACKS.find((t) => t.key === music.key)!.bpm : 0;
      const sceneSeconds = bpm ? beatAlignedSeconds(bpm, target) : target;
      const total = scenes.length * sceneSeconds;

      // 3. Music, rendered to exactly the video's length.
      setPhase({ name: "working", label: "Mixing your soundtrack…", pct: 32 });
      const audio = music.kind === "track" ? await renderTrack(music.key, total) : music.kind === "upload" ? await fitAudio(music.buffer, total) : null;

      // 4. Encode.
      const result = await encodeStoryVideo({
        scenes,
        sceneSeconds,
        audio,
        signal: ctrl.signal,
        onProgress: (f) => setPhase({ name: "working", label: "Rendering video…", pct: 36 + f * 64 }),
      });
      const label = music.kind === "track" ? music.key : music.kind;
      setPhase({ name: "done", result, url: URL.createObjectURL(result.blob), music: label });
      track("story_download", { format: "video", source, music: label, pace, seconds: Math.round(total), container: result.ext });
      if (result.audioDropped) toast.warning("This browser couldn't add audio, so the video is silent. Try Chrome or Safari for music.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setPhase({ name: "idle" });
        return;
      }
      setPhase({ name: "idle" });
      toast.error(e instanceof VideoUnsupportedError ? e.message : `Couldn't create the video: ${errorMessage(e)}`);
    } finally {
      abort.current = null;
    }
  };

  const fileName = (r: VideoResult) => `${fileBase}-video${r.ext}`;

  const download = (r: VideoResult, url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName(r);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const share = async (r: VideoResult, url: string) => {
    const file = new File([r.blob], fileName(r), { type: r.mime });
    if (canShareFiles([file]) && (await nativeShare({ files: [file], text: shareText, title: "My Travel Wrapped" }))) {
      track("share_click", { channel: "native_file", format: "video" });
      return;
    }
    download(r, url);
    toast.success("Video downloaded. Open Instagram and add it to your story or a reel.");
  };

  /* ───────── result ───────── */
  if (phase.name === "done") {
    const { result, url } = phase;
    return (
      <div className="grid items-center gap-6 rounded-3xl border border-navy-900/8 bg-white p-5 sm:grid-cols-[240px_1fr] sm:p-6">
        <video src={url} controls playsInline autoPlay className="mx-auto aspect-[9/16] w-full max-w-[240px] rounded-2xl bg-navy-950 shadow-xl" />
        <div>
          <p className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <Check className="size-6 text-jungle-600" /> Your video is ready
          </p>
          <p className="mt-1 text-sm text-muted">
            1080 × 1920 · {result.ext === ".mp4" ? "MP4, ready for Reels & Stories" : "WebM (this browser can't make MP4; Chrome or Safari can)"} · {(result.blob.size / 1024 / 1024).toFixed(1)} MB
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => share(result, url)}>
              <Share2 /> Share video
            </Button>
            <Button variant="outline" onClick={() => download(result, url)}>
              <Download /> Download
            </Button>
            <Button variant="ghost" onClick={() => setPhase({ name: "idle" })}>
              <RotateCcw /> Make another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ───────── builder ───────── */
  const working = phase.name === "working";
  const chip = (active: boolean) =>
    cn(
      "relative flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition",
      active ? "border-navy-900 bg-navy-900 text-cream-50 shadow-lg" : "border-navy-900/10 bg-white hover:border-navy-900/30",
    );
  const playBtn = (id: string, get: () => Promise<AudioBuffer>, active: boolean, label: string) => (
    <span
      role="button"
      tabIndex={0}
      aria-label={previewing === id ? `Stop ${label} preview` : `Preview ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        void preview(id, get);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          void preview(id, get);
        }
      }}
      className={cn("ml-auto grid size-9 shrink-0 place-items-center rounded-full transition", active ? "bg-cream-50/15 hover:bg-cream-50/25" : "bg-navy-900/5 hover:bg-navy-900/10")}
    >
      {previewing === id ? <Pause className="size-4" /> : <Play className="size-4" />}
    </span>
  );

  const sceneCount =
    source === "slides"
      ? SLIDES.length + (hasPhotos && withCollage ? 1 : 0)
      : Math.min(MAX_VIDEO_PHOTOS, gallery.length) + 2 + (withCollage ? 1 : 0);
  const sources = [
    { key: "slides" as const, emoji: "📖", title: "Story slides", body: "Your stats, map, personality and highlights" },
    {
      key: "photos" as const,
      emoji: "📸",
      title: "Photo memories",
      body: hasPhotos ? `Your ${s.year} photos, city by city, with your collage` : "Add photos to your trips to unlock this",
    },
  ];

  return (
    <div className="rounded-3xl border border-navy-900/8 bg-white p-5 sm:p-6">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted">
        <Clapperboard className="size-4" /> What should the video show?
      </p>
      <div className="mb-6 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Video type">
        {sources.map((o) => {
          const active = source === o.key;
          const disabled = working || (o.key === "photos" && !hasPhotos);
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => setSource(o.key)}
              className={cn(chip(active), "p-4 disabled:cursor-not-allowed disabled:opacity-50")}
            >
              <span className="text-3xl" aria-hidden>
                {o.emoji}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-bold">{o.title}</span>
                <span className={cn("block text-xs", active ? "text-cream-200/80" : "text-muted")}>{o.body}</span>
              </span>
              {active && <Check className="ml-auto size-5 shrink-0" />}
            </button>
          );
        })}
      </div>

      <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted">
        <Music2 className="size-4" /> Pick your soundtrack
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {TRACKS.map((t) => {
          const active = music.kind === "track" && music.key === t.key;
          return (
            <button key={t.key} type="button" disabled={working} onClick={() => setMusic({ kind: "track", key: t.key })} className={chip(active)} aria-pressed={active}>
              <span className="text-2xl" aria-hidden>
                {t.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold">{t.name}</span>
                <span className={cn("block truncate text-xs", active ? "text-cream-200/80" : "text-muted")}>
                  {t.vibe} · {t.bpm} BPM
                </span>
              </span>
              {playBtn(t.key, () => renderTrack(t.key, PREVIEW_SECONDS), active, t.name)}
            </button>
          );
        })}

        <button
          type="button"
          disabled={working || loadingUpload}
          onClick={() => (music.kind === "upload" ? undefined : fileInput.current?.click())}
          className={chip(music.kind === "upload")}
          aria-pressed={music.kind === "upload"}
        >
          <span className="text-2xl" aria-hidden>
            🎵
          </span>
          <span className="min-w-0">
            <span className="block truncate font-bold">{music.kind === "upload" ? music.name : loadingUpload ? "Loading…" : "Your own song"}</span>
            <span className={cn("block truncate text-xs", music.kind === "upload" ? "text-cream-200/80" : "text-muted")}>
              {music.kind === "upload" ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInput.current?.click();
                  }}
                  onKeyDown={(e) => e.key === "Enter" && fileInput.current?.click()}
                >
                  Change file
                </span>
              ) : (
                "Upload MP3, M4A or WAV"
              )}
            </span>
          </span>
          {music.kind === "upload" ? (
            playBtn("upload", () => fitAudio(music.buffer, Math.min(PREVIEW_SECONDS, music.buffer.duration)), true, music.name)
          ) : (
            <Upload className="ml-auto size-4 shrink-0 text-muted" />
          )}
        </button>

        <button type="button" disabled={working} onClick={() => setMusic({ kind: "none" })} className={chip(music.kind === "none")} aria-pressed={music.kind === "none"}>
          <VolumeX className="size-6 shrink-0" />
          <span>
            <span className="block font-bold">No music</span>
            <span className={cn("block text-xs", music.kind === "none" ? "text-cream-200/80" : "text-muted")}>Add a sound in Instagram</span>
          </span>
        </button>
        <input ref={fileInput} type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
      </div>
      {music.kind === "upload" && (
        <p className="mt-2 text-xs text-muted">Only use music you have the rights to. Instagram may mute copyrighted songs. The built-in tracks are original and safe to post.</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Pace</span>
          <div className="flex rounded-full bg-navy-900/5 p-1" role="radiogroup" aria-label="Pace">
            {(["snappy", "relaxed"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={pace === p}
                disabled={working}
                onClick={() => setPace(p)}
                className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize transition", pace === p ? "bg-navy-900 text-cream-50" : "text-ink/70 hover:text-ink")}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {hasPhotos && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={withCollage} disabled={working} onChange={(e) => setWithCollage(e.target.checked)} className="size-4 accent-sunset-500" />
            {source === "photos" ? "End with my photo collage" : "Include my photo collage"}
          </label>
        )}
        <span className="text-xs text-muted">≈ {Math.round(sceneCount * PACE_TARGET[pace])} seconds · 1080 × 1920</span>
      </div>

      <div className="mt-6">
        {working ? (
          <div>
            <div className="flex items-center justify-between gap-3 text-sm font-semibold">
              <span>{phase.label}</span>
              <button type="button" onClick={() => abort.current?.abort()} className="inline-flex items-center gap-1 text-muted hover:text-ink">
                <X className="size-4" /> Cancel
              </button>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-navy-900/8">
              <div className="h-full rounded-full bg-gradient-to-r from-sunset-500 to-electric-500 transition-[width] duration-300" style={{ width: `${Math.round(phase.pct)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">Made on your device, so nothing is uploaded. Keep this tab open; it takes about 20–60 seconds.</p>
          </div>
        ) : (
          <Button size="lg" onClick={generate} className="w-full sm:w-auto">
            <Clapperboard /> Create my video
          </Button>
        )}
      </div>
    </div>
  );
}
