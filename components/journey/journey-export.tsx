"use client";

import { Check, Clapperboard, Copy, Download, Globe, ImageIcon, Link2, Lock, RotateCcw, Share2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InstagramIcon, WhatsAppIcon } from "@/components/story/share-panel";
import { Dialog } from "@/components/ui/misc";
import { track } from "@/lib/analytics";
import type { Journey } from "@/lib/journey/build";
import { renderJourneyGif, renderJourneyVideo } from "@/lib/journey/export";
import { buildSchedule } from "@/lib/journey/schedule";
import { canShareFiles, copyText, nativeShare, whatsappUrl } from "@/lib/share";
import { cn, errorMessage } from "@/lib/utils";
import { VideoUnsupportedError } from "@/lib/video/encode";
import { TRACKS, type TrackKey } from "@/lib/video/music";

type Kind = "video" | "gif";
type Phase =
  | { name: "idle" }
  | { name: "working"; kind: Kind; label: string; pct: number }
  | { name: "done"; kind: Kind; blob: Blob; url: string; ext: string; mime: string; silent: boolean };

function saveBlob(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** "Download My Journey": renders an MP4 (or WebM) video or a GIF on-device. */
export function JourneyExportDialog({
  open,
  onClose,
  journey,
  fileBase,
  shareText,
}: {
  open: boolean;
  onClose: () => void;
  journey: Journey;
  fileBase: string;
  shareText: string;
}) {
  const [music, setMusic] = React.useState<TrackKey | null>("goldenhour");
  const [phase, setPhase] = React.useState<Phase>({ name: "idle" });
  const abort = React.useRef<AbortController | null>(null);
  const seconds = React.useMemo(() => Math.round(Math.min(90, buildSchedule(journey).duration)), [journey]);

  const doneUrl = phase.name === "done" ? phase.url : null;
  React.useEffect(() => () => void (doneUrl && URL.revokeObjectURL(doneUrl)), [doneUrl]);
  React.useEffect(() => () => abort.current?.abort(), []);

  const close = () => {
    abort.current?.abort();
    onClose();
  };

  const make = async (kind: Kind) => {
    const ctrl = new AbortController();
    abort.current = ctrl;
    const onProgress = (label: string, f: number) => setPhase({ name: "working", kind, label, pct: Math.round(f * 100) });
    onProgress("Getting ready…", 0);
    try {
      if (kind === "video") {
        const r = await renderJourneyVideo({ journey, music, onProgress, signal: ctrl.signal });
        setPhase({ name: "done", kind, blob: r.blob, url: URL.createObjectURL(r.blob), ext: r.ext, mime: r.mime, silent: r.audioDropped || !music });
        track("story_download", { format: "journey_video", container: r.ext, music: music ?? "none", stops: journey.stops.length });
        if (r.audioDropped) toast.warning("This browser couldn't add audio, so the video is silent.");
      } else {
        const blob = await renderJourneyGif({ journey, onProgress, signal: ctrl.signal });
        setPhase({ name: "done", kind, blob, url: URL.createObjectURL(blob), ext: ".gif", mime: "image/gif", silent: true });
        track("story_download", { format: "journey_gif", stops: journey.stops.length });
      }
    } catch (e) {
      setPhase({ name: "idle" });
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error(e instanceof VideoUnsupportedError ? `${e.message} You can still download a GIF.` : `Couldn't create it: ${errorMessage(e)}`);
    } finally {
      abort.current = null;
    }
  };

  const fileName = (p: Extract<Phase, { name: "done" }>) => `${fileBase}${p.kind === "gif" ? "" : "-video"}${p.ext}`;

  const shareFile = async (p: Extract<Phase, { name: "done" }>) => {
    const file = new File([p.blob], fileName(p), { type: p.mime });
    if (canShareFiles([file]) && (await nativeShare({ files: [file], text: shareText, title: "My Travel Journey" }))) {
      track("share_click", { channel: "native_file", format: `journey_${p.kind}` });
      return;
    }
    saveBlob(p.url, fileName(p));
    toast.success("Saved. Open Instagram or WhatsApp and pick it from your files.");
  };

  return (
    <Dialog open={open} onClose={close} title="Download my journey" className="sm:max-w-xl">
      {phase.name === "done" ? (
        <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[180px_1fr]">
          {phase.kind === "video" ? (
            <video src={phase.url} controls playsInline autoPlay muted className="mx-auto aspect-[9/16] w-full max-w-[180px] rounded-2xl bg-navy-950 shadow-xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={phase.url} alt="Your journey as an animated GIF" className="mx-auto aspect-[9/16] w-full max-w-[180px] rounded-2xl bg-navy-950 shadow-xl" />
          )}
          <div>
            <p className="flex items-center gap-2 font-display text-xl font-extrabold">
              <Check className="size-5 text-jungle-600" /> Ready
            </p>
            <p className="mt-1 text-sm text-muted">
              {phase.kind === "gif"
                ? "Animated GIF · 360 × 640 · loops forever"
                : phase.ext === ".mp4"
                  ? "MP4 · 1080 × 1920 · ready for Reels & Stories"
                  : "WebM · 1080 × 1920 (this browser can't encode MP4 — Chrome, Edge or Safari can)"}{" "}
              · {(phase.blob.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => shareFile(phase)}>
                <Share2 /> Share
              </Button>
              <Button variant="outline" onClick={() => saveBlob(phase.url, fileName(phase))}>
                <Download /> Download
              </Button>
              <Button variant="ghost" onClick={() => setPhase({ name: "idle" })}>
                <RotateCcw /> Make another
              </Button>
            </div>
          </div>
        </div>
      ) : phase.name === "working" ? (
        <div className="py-2">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>{phase.label}</span>
            <button type="button" onClick={() => abort.current?.abort()} className="inline-flex items-center gap-1 text-muted hover:text-ink">
              <X className="size-4" /> Cancel
            </button>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-navy-900/8">
            <div className="h-full rounded-full bg-gradient-to-r from-sunset-500 to-electric-500 transition-[width] duration-300" style={{ width: `${phase.pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">Rendered on your device — nothing is uploaded. Keep this tab open; it takes about {phase.kind === "gif" ? "10–30" : "30–90"} seconds.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button type="button" onClick={() => make("video")} className="flex flex-col items-start gap-1 rounded-2xl border-2 border-navy-900 bg-navy-900 p-4 text-left text-cream-50 transition hover:bg-navy-800">
              <Clapperboard className="size-6 text-sunset-400" />
              <span className="mt-1 font-display text-lg font-bold">Video</span>
              <span className="text-xs text-cream-200/75">MP4 · 9:16 · ≈ {seconds}s · for Reels, Stories & WhatsApp</span>
            </button>
            <button type="button" onClick={() => make("gif")} className="flex flex-col items-start gap-1 rounded-2xl border-2 border-navy-900/10 bg-white p-4 text-left transition hover:border-navy-900/30">
              <ImageIcon className="size-6 text-electric-500" />
              <span className="mt-1 font-display text-lg font-bold">GIF</span>
              <span className="text-xs text-muted">Small looping animation · no sound · ≈ {Math.min(24, Math.round(seconds / 1.5))}s</span>
            </button>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Video soundtrack</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Soundtrack">
              {[{ key: null, name: "No music", emoji: "🔇" }, ...TRACKS].map((t) => {
                const active = music === t.key;
                return (
                  <button
                    key={t.key ?? "none"}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMusic(t.key as TrackKey | null)}
                    className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold transition", active ? "border-navy-900 bg-navy-900 text-cream-50" : "border-navy-900/12 bg-white hover:border-navy-900/30")}
                  >
                    <span aria-hidden>{t.emoji}</span> {t.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted">Built-in tracks are original, so Instagram won&apos;t mute them.</p>
          </div>

          <div className="rounded-2xl bg-cream-100 p-4 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <span className="[&_svg]:size-4"><InstagramIcon /></span> Posting to Instagram
            </p>
            <p className="mt-1 text-muted">Websites can&apos;t post to Instagram for you. Make the video, tap <b>Share</b> (or save it), then add it to your Story or a Reel in the Instagram app.</p>
          </div>
          {journey.visibility === "private" && journey.stops.some((s) => s.photo) && (
            <p className="flex items-start gap-1.5 text-xs text-muted">
              <Lock className="mt-0.5 size-3.5 shrink-0" /> Your trip photos appear in the downloaded file. They&apos;re never uploaded — only shared if you share the file.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}

/** "Share My Journey": public link (opt-in), WhatsApp, copy link, native share sheet. */
export function JourneyShareDialog({
  open,
  onClose,
  url,
  text,
  publish,
  publishLabel = "Create public link",
  publicNote,
  onInstagram,
}: {
  open: boolean;
  onClose: () => void;
  /** Public URL of this journey, or null if it isn't public. */
  url: string | null;
  text: string;
  /** Opt-in publishing (owner only). */
  publish?: () => Promise<void>;
  publishLabel?: string;
  publicNote?: React.ReactNode;
  onInstagram: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const doPublish = async () => {
    if (!publish) return;
    setBusy(true);
    try {
      await publish();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    if (await copyText(url)) {
      setCopied(true);
      track("share_click", { channel: "copy_link", format: "journey" });
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Share my journey">
      {url ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-2xl bg-cream-100 p-1.5 pl-4">
            <Link2 className="size-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{url}</span>
            <Button size="sm" variant="dark" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ShareTile
              label="WhatsApp"
              color="#25D366"
              onClick={() => {
                track("share_click", { channel: "whatsapp", format: "journey" });
                window.open(whatsappUrl(text, url), "_blank", "noopener,noreferrer");
              }}
            >
              <WhatsAppIcon />
            </ShareTile>
            <ShareTile label="Instagram" color="linear-gradient(45deg,#f58529,#dd2a7b,#8134af)" onClick={onInstagram}>
              <InstagramIcon />
            </ShareTile>
            <ShareTile
              label="More"
              color="#ff3366"
              onClick={async () => {
                if (await nativeShare({ title: "My Travel Journey", text, url })) track("share_click", { channel: "native", format: "journey" });
                else await copy();
              }}
            >
              <Share2 className="size-5" />
            </ShareTile>
          </div>
          {publicNote && <div className="text-xs text-muted">{publicNote}</div>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-2xl bg-cream-100 p-4">
            <Lock className="mt-0.5 size-5 shrink-0 text-muted" />
            <div className="text-sm">
              <p className="font-bold">Your journey is private</p>
              <p className="mt-1 text-muted">
                A public link lets anyone with it watch your route: the places, months and totals. <b>Your photos, captions and notes are never included.</b> You can revoke it anytime from your Wrapped page.
              </p>
            </div>
          </div>
          {publish ? (
            <Button variant="electric" onClick={doPublish} loading={busy} className="w-full">
              <Globe /> {publishLabel}
            </Button>
          ) : (
            <p className="text-sm text-muted">Public links aren&apos;t available here.</p>
          )}
          {publicNote && <div className="text-xs text-muted">{publicNote}</div>}
          <Button variant="outline" onClick={onInstagram} className="w-full">
            <Download /> Or download a video to share
          </Button>
        </div>
      )}
    </Dialog>
  );
}

function ShareTile({ label, color, children, onClick }: { label: string; color: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl p-2 text-xs font-semibold transition hover:bg-navy-900/5" aria-label={`Share to ${label}`}>
      <span className="grid size-12 place-items-center rounded-2xl text-white" style={{ background: color }}>
        {children}
      </span>
      {label}
    </button>
  );
}
