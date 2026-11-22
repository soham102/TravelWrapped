"use client";

/**
 * Turns rendered story slides + an audio track into a 1080×1920 video, entirely in the browser
 * (WebCodecs via mediabunny). MP4/H.264 + AAC where supported (Chrome, Edge, Safari) for Instagram;
 * otherwise WebM. Nothing is uploaded.
 */

export const VIDEO_W = 1080;
export const VIDEO_H = 1920;
const FPS = 30;
const TRANSITION = 0.45; // crossfade length, seconds
const ZOOM = 0.06; // Ken Burns zoom amount per scene

export interface VideoResult {
  blob: Blob;
  ext: string;
  mime: string;
  /** True when the browser couldn't encode audio, so the video is silent. */
  audioDropped: boolean;
}

export class VideoUnsupportedError extends Error {}

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

function drawScene(ctx: CanvasRenderingContext2D, img: CanvasImageSource, progress: number, index: number, alpha: number) {
  const p = Math.min(1, Math.max(0, progress));
  const scale = index % 2 === 0 ? 1 + ZOOM * p : 1 + ZOOM * (1 - p); // alternate zoom in / out
  const w = VIDEO_W * scale;
  const h = VIDEO_H * scale;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, (VIDEO_W - w) / 2, (VIDEO_H - h) / 2, w, h);
  ctx.globalAlpha = 1;
}

function drawFrame(ctx: CanvasRenderingContext2D, scenes: CanvasImageSource[], sceneSeconds: number, t: number, total: number) {
  const n = scenes.length;
  const i = Math.min(n - 1, Math.floor(t / sceneSeconds));
  const local = t - i * sceneSeconds;
  ctx.fillStyle = "#060a1c";
  ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
  drawScene(ctx, scenes[i], local / sceneSeconds, i, 1);
  // Crossfade into the next scene during the last moments of this one.
  const into = local - (sceneSeconds - TRANSITION);
  if (i < n - 1 && into > 0) drawScene(ctx, scenes[i + 1], 0, i + 1, ease(into / TRANSITION));
  // Fade in from / out to black.
  const edge = Math.max(0, 1 - t / 0.3, 1 - (total - t) / 0.6);
  if (edge > 0) {
    ctx.fillStyle = `rgba(6,10,28,${Math.min(1, edge)})`;
    ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
  }
}

export async function encodeStoryVideo(opts: {
  scenes: CanvasImageSource[];
  sceneSeconds: number;
  audio: AudioBuffer | null;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<VideoResult> {
  const mb = await import("mediabunny");
  const total = opts.scenes.length * opts.sceneSeconds;

  const videoCodec = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "vp8"], { width: VIDEO_W, height: VIDEO_H, frameRate: FPS });
  if (!videoCodec) throw new VideoUnsupportedError("This browser can't create videos. Try Chrome, Edge or Safari (on a phone or computer).");
  const mp4 = videoCodec === "avc";
  const format = mp4 ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat();
  const target = new mb.BufferTarget();
  const output = new mb.Output({ format, target });

  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_W;
  canvas.height = VIDEO_H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new VideoUnsupportedError("Couldn't start the video renderer in this browser.");

  const videoSource = new mb.CanvasSource(canvas, { codec: videoCodec, quality: mb.QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(videoSource, { frameRate: FPS });

  let audioSource: InstanceType<typeof mb.AudioBufferSource> | null = null;
  let audioDropped = false;
  if (opts.audio) {
    const audioCodec = await mb.getFirstEncodableAudioCodec(mp4 ? ["aac", "opus"] : ["opus", "vorbis"], {
      numberOfChannels: opts.audio.numberOfChannels,
      sampleRate: opts.audio.sampleRate,
    });
    if (audioCodec) {
      audioSource = new mb.AudioBufferSource({ codec: audioCodec, quality: mb.QUALITY_HIGH });
      output.addAudioTrack(audioSource);
    } else audioDropped = true;
  }

  await output.start();
  try {
    if (audioSource && opts.audio) {
      await audioSource.add(opts.audio);
      audioSource.close();
    }
    const frames = Math.round(total * FPS);
    for (let f = 0; f < frames; f++) {
      if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      drawFrame(ctx, opts.scenes, opts.sceneSeconds, f / FPS, total);
      await videoSource.add(f / FPS, 1 / FPS);
      if (f % 6 === 0) opts.onProgress?.(f / frames);
    }
    videoSource.close();
    await output.finalize();
  } catch (e) {
    await output.cancel().catch(() => undefined);
    throw e;
  }
  opts.onProgress?.(1);
  if (!target.buffer) throw new Error("Video encoding produced no data");
  return { blob: new Blob([target.buffer], { type: format.mimeType }), ext: format.fileExtension, mime: format.mimeType, audioDropped };
}

/** Loads a PNG data URL into something drawImage can use. */
export async function loadScene(dataUrl: string): Promise<CanvasImageSource> {
  const blob = await (await fetch(dataUrl)).blob();
  if ("createImageBitmap" in window) return createImageBitmap(blob);
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await img.decode();
  return img;
}
