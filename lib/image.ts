"use client";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return `${file.name}: please use JPG, PNG or WebP`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: images must be under 15 MB`;
  return null;
}

/** Downscale and re-encode as JPEG in the browser (keeps uploads small and strips EXIF/GPS metadata). */
export async function resizeImage(file: Blob, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality),
  );
}
