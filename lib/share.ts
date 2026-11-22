"use client";

import type { WrappedSnapshot } from "./types";

export function whatsappUrl(text: string, url: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}
export function linkedinUrl(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}
export function facebookUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
export function xUrl(text: string, url: string) {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function canShareFiles(files: File[]): boolean {
  return typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files });
}

/** Native share sheet (mobile) — returns false when unsupported or cancelled. */
export async function nativeShare(data: { title?: string; text?: string; url?: string; files?: File[] }): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  if (data.files && !canShareFiles(data.files)) {
    const { files: _files, ...rest } = data;
    void _files;
    data = rest;
  }
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/* ───── Local-mode public links: the (public-safe) snapshot travels inside the URL hash ───── */

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str: string): Uint8Array {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeSnapshot(s: WrappedSnapshot): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(s));
  if (typeof CompressionStream !== "undefined") return "z" + b64urlEncode(await pipe(json, new CompressionStream("deflate-raw")));
  return "j" + b64urlEncode(json);
}

export async function decodeSnapshot(token: string): Promise<WrappedSnapshot> {
  const kind = token[0];
  const bytes = b64urlDecode(token.slice(1));
  const json = kind === "z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : bytes;
  return JSON.parse(new TextDecoder().decode(json));
}
