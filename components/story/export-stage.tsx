"use client";

import * as React from "react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { captureNode, dataUrlToFile, downloadDataUrl, exportPdf } from "@/lib/export";
import { nativeShare } from "@/lib/share";
import { errorMessage } from "@/lib/utils";
import { COLLAGE_FORMATS, type CollageStyle, PhotoCollage } from "./collage";
import { FORMATS } from "./formats";
import { AnimateCtx } from "./primitives";
import { SLIDES, type StoryData } from "./slides";

export type ExportKey = `slide:${number}` | "post" | "poster" | "timeline" | "collage-story" | "collage-post";

/**
 * Renders every slide and format once, offscreen, at native size (no animation, no scaling)
 * so html-to-image produces pixel-perfect exports.
 */
export function useExportStage(s: StoryData | null, fileBase: string, opts: { collageSeed?: number; collageStyle?: CollageStyle } = {}) {
  const refs = React.useRef(new Map<string, HTMLDivElement>());
  const [busy, setBusy] = React.useState<string | null>(null);
  const setRef = (key: string) => (el: HTMLDivElement | null) => {
    if (el) refs.current.set(key, el);
    else refs.current.delete(key);
  };

  const stage = s ? (
    <div aria-hidden style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none", opacity: 1 }}>
      <AnimateCtx.Provider value={false}>
        {SLIDES.map(({ key, C }, i) => (
          <div key={key} style={{ position: "absolute", left: 0, top: 0 }}>
            <div ref={setRef(`slide:${i}`)} style={{ width: 360, height: 640 }}>
              <C s={s} />
            </div>
          </div>
        ))}
        {FORMATS.filter((f) => "C" in f).map((f) => {
          const C = (f as { C: React.ComponentType<{ s: StoryData }> }).C;
          return (
            <div key={f.key} style={{ position: "absolute", left: 0, top: 0 }}>
              <div ref={setRef(f.key)} style={{ width: f.w, height: f.h }}>
                <C s={s} />
              </div>
            </div>
          );
        })}
        {COLLAGE_FORMATS.map((f) => (
          <div key={f.key} style={{ position: "absolute", left: 0, top: 0 }}>
            <div ref={setRef(f.key)} style={{ width: f.w, height: f.h }}>
              <PhotoCollage s={s} variant={f.variant} seed={opts.collageSeed ?? 0} style={opts.collageStyle ?? "mosaic"} />
            </div>
          </div>
        ))}
      </AnimateCtx.Provider>
    </div>
  ) : null;

  const nameFor = (key: ExportKey) => {
    if (key.startsWith("slide:")) {
      const i = Number(key.split(":")[1]);
      return `${fileBase}-${String(i + 1).padStart(2, "0")}-${SLIDES[i].key}.png`;
    }
    return `${fileBase}-${key}.png`;
  };

  const capture = async (key: ExportKey): Promise<string> => {
    const node = refs.current.get(key);
    if (!node) throw new Error("Nothing to export yet");
    return captureNode(node, { pixelRatio: 3 });
  };

  const download = async (key: ExportKey) => {
    setBusy(key);
    try {
      const url = await capture(key);
      downloadDataUrl(url, nameFor(key));
      track("story_download", { format: key });
      toast.success("Saved to your downloads");
    } catch (e) {
      toast.error(`Export failed: ${errorMessage(e)}`);
    } finally {
      setBusy(null);
    }
  };

  /** Share the image itself via the native share sheet (Instagram, WhatsApp… on mobile). Falls back to download. */
  const shareImage = async (key: ExportKey, text: string, url?: string) => {
    setBusy(key);
    try {
      const dataUrl = await capture(key);
      const file = await dataUrlToFile(dataUrl, nameFor(key));
      const ok = await nativeShare({ files: [file], text, url, title: "My Travel Wrapped" });
      track("share_click", { channel: ok ? "native_file" : "download_fallback", format: key });
      if (!ok) {
        downloadDataUrl(dataUrl, nameFor(key));
        toast.success("Image downloaded — open Instagram and add it to your story");
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    setBusy("pdf");
    const t = toast.loading("Building your PDF…");
    try {
      const nodes = SLIDES.map((_, i) => refs.current.get(`slide:${i}`)).filter(Boolean) as HTMLElement[];
      await exportPdf(nodes, `${fileBase}-complete.pdf`, (i) => toast.loading(`Rendering page ${i + 1} of ${nodes.length}…`, { id: t }));
      track("story_download", { format: "pdf" });
      toast.success("PDF downloaded", { id: t });
    } catch (e) {
      toast.error(`PDF export failed: ${errorMessage(e)}`, { id: t });
    } finally {
      setBusy(null);
    }
  };

  return { stage, download, shareImage, downloadPdf, busy };
}
