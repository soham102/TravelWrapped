"use client";

import { Check, Copy, Mail, Send, Trash2, UserCheck, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Badge, Card, PageLoader, StatTile } from "@/components/ui/misc";
import { track } from "@/lib/analytics";
import { DEFAULT_INVITE_MESSAGE, MAX_INVITES_PER_DAY } from "@/lib/config";
import { parseEmailList, referralLink } from "@/lib/invite";
import { copyText, whatsappUrl } from "@/lib/share";
import type { Invitation } from "@/lib/types";
import { cn, errorMessage, fmtDate, isValidEmail } from "@/lib/utils";

const STATUS_STYLE: Record<Invitation["status"], string> = {
  pending: "bg-sun-400/25 text-[#8a5a00]",
  sent: "bg-electric-500/12 text-electric-600",
  accepted: "bg-jungle-500/15 text-jungle-600",
  failed: "bg-red-100 text-red-700",
};

export default function InvitePage() {
  const { store, profile } = useAuth();
  const [invites, setInvites] = React.useState<Invitation[] | null>(null);
  const [raw, setRaw] = React.useState("");
  const [message, setMessage] = React.useState(DEFAULT_INVITE_MESSAGE.replace("2026", String(new Date().getFullYear())));
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [mailto, setMailto] = React.useState<string | null>(null);
  const [link, setLink] = React.useState("");

  const load = React.useCallback(() => store.listInvitations().then(setInvites, () => setInvites([])), [store]);
  React.useEffect(() => {
    void load();
  }, [load]);
  React.useEffect(() => {
    if (profile) setLink(referralLink(profile.referral_code));
  }, [profile]);

  const emails = parseEmailList(raw);
  const invalid = emails.filter((e) => !isValidEmail(e));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMailto(null);
    if (emails.length === 0) return setError("Add at least one email address");
    if (invalid.length) return setError(`Check these: ${invalid.join(", ")}`);
    if (emails.length > 10) return setError("Up to 10 emails at a time");
    if (message.trim().length < 5) return setError("Add a short message");
    setSending(true);
    try {
      const res = await store.sendInvitations(emails, message.trim());
      if (store.mode === "local" && res.created.length) track("invite_sent", { count: res.created.length, delivery: res.delivery });
      if (res.created.length) {
        toast.success(
          res.delivery === "email"
            ? `Invitation${res.created.length > 1 ? "s" : ""} emailed to ${res.created.length} friend${res.created.length > 1 ? "s" : ""}`
            : `${res.created.length} invitation${res.created.length > 1 ? "s" : ""} ready — opening your email app`,
        );
        setRaw("");
      }
      if (res.skipped.length) toast.message(`Skipped: ${res.skipped.map((s) => `${s.email} (${s.reason})`).join(", ")}`);
      if (res.mailto) {
        setMailto(res.mailto);
        window.location.href = res.mailto;
      }
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    if (await copyText(link)) {
      setCopied(true);
      track("share_click", { channel: "referral_link" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!invites) return <PageLoader />;
  const accepted = invites.filter((i) => i.status === "accepted").length;

  return (
    <div>
      <PageHeader title="Invite friends" subtitle="Travel Wrapped is more fun when your whole crew has one." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card className="bg-navy-900 text-cream-100">
            <p className="font-display text-xl font-bold">Your personal invite link</p>
            <p className="mt-1 text-sm text-cream-200/70">Anyone who signs up through it is counted as your referral.</p>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 p-1.5 pl-4">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{link || "…"}</span>
              <Button size="sm" variant="light" onClick={copyLink} disabled={!link}>
                {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <a
              href={link ? whatsappUrl(message, link) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("share_click", { channel: "whatsapp_invite" })}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-jungle-300 hover:underline"
            >
              Send it on WhatsApp →
            </a>
          </Card>

          <Card>
            <form onSubmit={send} className="space-y-4" noValidate>
              <p className="font-display text-xl font-bold">Invite by email</p>
              <Field label="Friends' emails" htmlFor="emails" hint={`Separate with commas or new lines · up to 10 at a time · ${MAX_INVITES_PER_DAY}/day`}>
                <Textarea id="emails" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"riya@example.com, kabir@example.com"} className="min-h-20" aria-invalid={invalid.length > 0} />
              </Field>
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {emails.map((e) => (
                    <span key={e} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", isValidEmail(e) ? "bg-cream-100" : "bg-red-100 text-red-700")}>{e}</span>
                  ))}
                </div>
              )}
              <Field label="Message" htmlFor="msg">
                <Textarea id="msg" value={message} maxLength={600} onChange={(e) => setMessage(e.target.value)} />
              </Field>
              {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
              <Button type="submit" loading={sending} className="w-full sm:w-auto">
                <Send /> Send invitation{emails.length > 1 ? "s" : ""}
              </Button>
              {mailto && (
                <p className="text-sm text-muted">
                  Email app didn&apos;t open? <a href={mailto} className="font-semibold text-electric-600 underline">Open it here</a>.
                </p>
              )}
              {store.mode === "local" ? (
                <p className="text-xs text-muted">Local mode: invitations are sent from your own email app (mailto). Configure Supabase + Resend for server-side delivery and referral tracking.</p>
              ) : (
                <p className="text-xs text-muted">If server-side email isn&apos;t configured, we record the invitation and open your email app instead.</p>
              )}
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Invited" value={invites.length} accent="electric" />
            <StatTile label="Joined" value={accepted} accent="jungle" />
          </div>
          <Card>
            <p className="font-display text-lg font-bold">Invitations</p>
            {invites.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                <Users className="mx-auto mb-2 size-8 text-navy-900/20" />
                No invitations yet. Your crew is waiting!
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-navy-900/8">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream-100">
                      {i.status === "accepted" ? <UserCheck className="size-4 text-jungle-600" /> : <Mail className="size-4 text-muted" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{i.recipient_email}</span>
                      <span className="block text-xs text-muted">{fmtDate(i.created_at.slice(0, 10), { year: true })}</span>
                    </span>
                    <Badge className={STATUS_STYLE[i.status]}>{i.status}</Badge>
                    {i.status !== "accepted" && (
                      <button
                        onClick={async () => {
                          try {
                            await store.deleteInvitation(i.id);
                            setInvites((xs) => xs?.filter((x) => x.id !== i.id) ?? null);
                          } catch (e) {
                            toast.error(errorMessage(e));
                          }
                        }}
                        className="rounded-full p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove invitation to ${i.recipient_email}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
