import { NextResponse, type NextRequest } from "next/server";

/**
 * Downloads one picked Google Photos item for the browser. Picker media URLs require the user's
 * OAuth token and don't send CORS headers, so the client can't fetch them directly.
 * Only Google's media host is allowed, so this can't be used as an open proxy.
 */

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isGoogleMediaUrl(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 4096) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && (u.hostname === "googleusercontent.com" || u.hostname.endsWith(".googleusercontent.com"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!/^Bearer [\w.\-~+/]+=*$/.test(auth)) return NextResponse.json({ error: "Missing Google token" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  if (!isGoogleMediaUrl(body?.url)) return NextResponse.json({ error: "Invalid media URL" }, { status: 400 });

  try {
    const res = await fetch(body.url, {
      headers: { Authorization: auth, Accept: "image/jpeg,image/png,image/webp" },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: `Google Photos returned ${res.status}` }, { status: 502 });

    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(type)) return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ error: "Image too large" }, { status: 413 });

    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ error: "Image too large" }, { status: 413 });

    return new NextResponse(bytes, {
      headers: { "Content-Type": type, "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Couldn't download from Google Photos" }, { status: 502 });
  }
}
