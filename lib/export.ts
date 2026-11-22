"use client";

import { toJpeg, toPng } from "html-to-image";

export interface CaptureOptions {
  /** Output scale relative to the node's CSS size (e.g. 360px × 3 = 1080px). */
  pixelRatio?: number;
  background?: string;
}

async function waitForImages(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          }),
    ),
  );
  if (document.fonts?.ready) await document.fonts.ready;
}

export async function captureNode(node: HTMLElement, opts: CaptureOptions = {}): Promise<string> {
  await waitForImages(node);
  const options = {
    pixelRatio: opts.pixelRatio ?? 3,
    cacheBust: false,
    backgroundColor: opts.background,
    // Safari occasionally drops images on the first pass; a warm-up render fixes it.
  };
  await toPng(node, options).catch(() => undefined);
  return toPng(node, options);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

/** Render each node to a page of a single PDF (pages sized to the nodes' aspect ratio). */
export async function exportPdf(nodes: HTMLElement[], filename: string, onProgress?: (i: number) => void) {
  const { jsPDF } = await import("jspdf");
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (let i = 0; i < nodes.length; i++) {
    onProgress?.(i);
    const node = nodes[i];
    await waitForImages(node);
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const img = await toJpeg(node, { pixelRatio: 2.5, quality: 0.9, cacheBust: false });
    if (!pdf) pdf = new jsPDF({ orientation: h >= w ? "portrait" : "landscape", unit: "px", format: [w, h], hotfixes: ["px_scaling"] });
    else pdf.addPage([w, h], h >= w ? "portrait" : "landscape");
    pdf.addImage(img, "JPEG", 0, 0, w, h);
  }
  pdf?.save(filename);
}
