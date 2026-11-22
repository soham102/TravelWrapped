import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_INVITES_PER_DAY, isSupabaseConfigured } from "@/lib/config";
import { buildInviteMailto } from "@/lib/invite";
import { bearer, userClient } from "@/lib/supabase/server";
import type { Invitation } from "@/lib/types";
import { isValidEmail } from "@/lib/utils";

const Body = z.object({
  emails: z.array(z.string().max(254)).min(1).max(10),
  message: z.string().max(600),
});

// Burst limiter (per server instance). The database trigger enforces the daily cap globally.
const bursts = new Map<string, number[]>();
function burstLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (bursts.get(userId) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  bursts.set(userId, recent);
  return recent.length > 5;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function emailHtml(sender: string, message: string, link: string) {
  return `<!doctype html><html><body style="margin:0;background:#fff5e6;font-family:Arial,Helvetica,sans-serif;color:#1a1530">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="100%" style="max-width:520px;background:#0b1026;border-radius:24px;color:#fff5e6" cellpadding="0" cellspacing="0">
  <tr><td style="padding:32px 28px">
    <p style="margin:0;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#ff8a5b;font-weight:bold">Travel Wrapped</p>
    <h1 style="margin:12px 0 0;font-size:30px;line-height:1.1">${escapeHtml(sender)} invited you to make your Travel Wrapped</h1>
    <p style="margin:18px 0 0;font-size:16px;line-height:1.5;color:#f6e7cf">“${escapeHtml(message)}”</p>
    <a href="${link}" style="display:inline-block;margin-top:24px;background:#ff6a3d;color:#fff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:999px">Create my Travel Wrapped</a>
    <p style="margin:24px 0 0;font-size:12px;color:#9a97b0">Map every city, every state and every memory from your year — then share it.</p>
  </td></tr></table>
  <p style="font-size:11px;color:#6b6580;margin-top:16px">Built by Soham for the goSTOPS Build Sprint. Not an official goSTOPS product.<br/>You received this because ${escapeHtml(sender)} entered your email. No further emails will be sent.</p>
  </td></tr></table></body></html>`;
}

async function sendResend(to: string, subject: string, html: string, text: string, replyTo?: string | null) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.INVITE_FROM_EMAIL || "Travel Wrapped <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  return res.ok;
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Server-side invitations need Supabase" }, { status: 400 });
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sb = userClient(token);
  const { data: auth, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !auth.user) return NextResponse.json({ error: "Session expired — please log in again" }, { status: 401 });
  const user = auth.user;

  if (burstLimited(user.id)) return NextResponse.json({ error: "Slow down — try again in a minute" }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter between 1 and 10 email addresses" }, { status: 400 });
  const message = parsed.data.message.trim();

  const { data: profile } = await sb.from("profiles").select("referral_code, full_name").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const link = `${origin}/r/${profile.referral_code}`;
  const sender = profile.full_name || user.email || "A friend";

  const created: Invitation[] = [];
  const skipped: { email: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const raw of parsed.data.emails) {
    const email = raw.trim().toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    if (!isValidEmail(email)) {
      skipped.push({ email, reason: "invalid email" });
      continue;
    }
    if (email === user.email?.toLowerCase()) {
      skipped.push({ email, reason: "that's you" });
      continue;
    }
    const { data, error } = await sb
      .from("invitations")
      .insert({ sender_id: user.id, recipient_email: email, referral_code: profile.referral_code, message })
      .select("id, recipient_email, status, message, created_at")
      .single();
    if (error) {
      if (error.code === "23505") skipped.push({ email, reason: "already invited" });
      else if (error.message.includes("RATE_LIMIT")) {
        skipped.push({ email, reason: `daily limit of ${MAX_INVITES_PER_DAY} reached` });
        break;
      } else skipped.push({ email, reason: "could not save" });
      continue;
    }
    created.push(data as Invitation);
  }

  let delivery: "email" | "mailto" = "mailto";
  if (process.env.RESEND_API_KEY && created.length) {
    delivery = "email";
    const subject = `${sender} invited you to create your Travel Wrapped ✈️`;
    await Promise.all(
      created.map(async (inv) => {
        const ok = await sendResend(inv.recipient_email, subject, emailHtml(sender, message, link), `${message}\n\nCreate yours: ${link}`, user.email).catch(() => false);
        inv.status = ok ? "sent" : "failed";
        await sb.from("invitations").update({ status: inv.status }).eq("id", inv.id);
      }),
    );
  }

  if (created.length) {
    await sb.from("events").insert({ name: "invite_sent", user_id: user.id, props: { count: created.length, delivery } });
  }

  return NextResponse.json({
    delivery,
    created,
    skipped,
    mailto: delivery === "mailto" && created.length ? buildInviteMailto(created.map((c) => c.recipient_email), message, link) : undefined,
    note:
      delivery === "mailto"
        ? "Server-side email isn't configured (RESEND_API_KEY). Invitations were recorded — send them from your own email app."
        : undefined,
  });
}
