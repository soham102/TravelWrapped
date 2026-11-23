"use client";

import { Check, Copy, Download, Globe, Link2, Lock, Share2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, Dialog } from "@/components/ui/misc";
import { track } from "@/lib/analytics";
import { copyText, encodeSnapshot, facebookUrl, linkedinUrl, nativeShare, whatsappUrl, xUrl } from "@/lib/share";
import type { WrappedRecord } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";
import { shareLine } from "@/lib/wrapped/compute";
import type { ExportKey } from "./export-stage";

export function usePublicUrl(record: WrappedRecord | null) {
  const { store } = useAuth();
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    if (!record?.is_public) {
      setUrl(null);
      return;
    }
    if (store.mode === "supabase" && record.public_slug) setUrl(`${window.location.origin}/w/${record.public_slug}`);
    else encodeSnapshot(record.stats).then((t) => alive && setUrl(`${window.location.origin}/share#${t}`));
    return () => {
      alive = false;
    };
  }, [record, store.mode]);
  return url;
}

export function SharePanel({
  record,
  onRecord,
  ensureFresh,
  shareImage,
  download,
  busy,
}: {
  record: WrappedRecord;
  onRecord: (r: WrappedRecord) => void;
  /** Saves the latest snapshot before publishing so the public page is current. */
  ensureFresh: () => Promise<WrappedRecord>;
  shareImage: (key: ExportKey, text: string, url?: string) => Promise<void>;
  download: (key: ExportKey) => Promise<void>;
  busy: string | null;
}) {
  const { store } = useAuth();
  const url = usePublicUrl(record);
  const [toggling, setToggling] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [igOpen, setIgOpen] = React.useState(false);
  const text = shareLine(record.stats) + " ✈️ #TravelWrapped";

  const setPublic = async (on: boolean) => {
    setToggling(true);
    try {
      const fresh = on ? await ensureFresh() : record;
      const r = await store.setWrappedPublic(fresh.id, on);
      onRecord(r);
      toast.success(on ? "Public link created" : "Public link revoked — the old link no longer works");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setToggling(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    if (await copyText(url)) {
      setCopied(true);
      track("share_click", { channel: "copy_link" });
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const open = (channel: string, href: string) => {
    track("share_click", { channel });
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const social = [
    { key: "whatsapp", label: "WhatsApp", color: "#25D366", href: url ? whatsappUrl(text, url) : null, icon: <WhatsAppIcon /> },
    { key: "linkedin", label: "LinkedIn", color: "#0A66C2", href: url ? linkedinUrl(url) : null, icon: <span className="text-sm font-black">in</span> },
    { key: "facebook", label: "Facebook", color: "#1877F2", href: url ? facebookUrl(url) : null, icon: <span className="text-base font-black">f</span> },
    { key: "x", label: "X", color: "#1c0f38", href: url ? xUrl(text, url) : null, icon: <span className="text-sm font-black">𝕏</span> },
  ];

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xl font-bold">Share your Wrapped</p>
          <p className="text-sm text-muted">
            {record.is_public ? "Anyone with the link can view your stats & map. Photos and notes stay private." : "Private — only you can see it right now."}
          </p>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold", record.is_public ? "bg-jungle-500/15 text-jungle-600" : "bg-navy-900/8 text-muted")}>
          {record.is_public ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
          {record.is_public ? "Public" : "Private"}
        </span>
      </div>

      {record.is_public ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-2xl bg-cream-100 p-1.5 pl-4">
            <Link2 className="size-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{url ?? "Preparing link…"}</span>
            <Button size="sm" variant="dark" onClick={copy} disabled={!url}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <button onClick={() => setPublic(false)} disabled={toggling} className="text-xs font-semibold text-red-600 hover:underline">
            Revoke public access
          </button>
          {store.mode === "local" && <p className="text-xs text-muted">Local mode: the link carries your public stats inside it, so it can&apos;t be revoked once shared.</p>}
        </div>
      ) : (
        <Button variant="electric" onClick={() => setPublic(true)} loading={toggling} className="w-full sm:w-auto">
          <Globe /> Create public link
        </Button>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">Share to</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <ShareBtn label="Instagram" onClick={() => setIgOpen(true)} style={{ background: "linear-gradient(45deg,#f58529,#dd2a7b,#8134af)" }}>
            <InstagramIcon />
          </ShareBtn>
          {social.map((s) => (
            <ShareBtn key={s.key} label={s.label} disabled={!s.href} onClick={() => s.href && open(s.key, s.href)} style={{ background: s.color }}>
              {s.icon}
            </ShareBtn>
          ))}
          <ShareBtn
            label="More"
            onClick={async () => {
              const ok = await nativeShare({ title: "My Travel Wrapped", text, url: url ?? undefined });
              if (ok) track("share_click", { channel: "native" });
              else if (url) await copy();
              else void shareImage("slide:9", text);
            }}
            style={{ background: "#ff3366" }}
          >
            <Share2 className="size-5" />
          </ShareBtn>
        </div>
        {!record.is_public && <p className="mt-2 text-xs text-muted">Link-based sharing needs a public link. Instagram & “More” share the image itself.</p>}
      </div>

      <Dialog open={igOpen} onClose={() => setIgOpen(false)} title="Share to Instagram">
        <p className="text-sm text-muted">
          Instagram doesn&apos;t let websites post to your account directly, so we make it a two-tap job:
        </p>
        <ol className="mt-4 space-y-2 text-sm">
          <li className="flex gap-3"><Step n={1} /> Save (or share) your Instagram-ready image below.</li>
          <li className="flex gap-3"><Step n={2} /> Open Instagram → <b>Your story</b> (or a new post) and pick the image.</li>
          <li className="flex gap-3"><Step n={3} /> Add the link sticker{url ? " with your public link" : ""} so friends can view the full Wrapped.</li>
        </ol>
        <div className="mt-6 grid grid-cols-1 gap-2">
          <Button onClick={() => shareImage("slide:9", text, url ?? undefined)} loading={busy === "slide:9"}>
            <Share2 /> Share story image (opens share sheet on mobile)
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => download("slide:9")} loading={busy === "slide:9"}>
              <Download /> Story 9:16
            </Button>
            <Button variant="outline" onClick={() => download("post")} loading={busy === "post"}>
              <Download /> Post 1:1
            </Button>
          </div>
          {url && (
            <Button variant="ghost" onClick={copy}>
              <Copy /> Copy link for the sticker
            </Button>
          )}
        </div>
      </Dialog>
    </Card>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-cream-100">{n}</span>;
}

function ShareBtn({ label, children, disabled, onClick, style }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex flex-col items-center gap-1.5 rounded-2xl p-2 text-xs font-semibold transition hover:bg-navy-900/5 disabled:opacity-35" aria-label={`Share to ${label}`}>
      <span className="grid size-11 place-items-center rounded-2xl text-white" style={style}>
        {children}
      </span>
      {label}
    </button>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
