import { siteUrl } from "./utils";

export function referralLink(code: string): string {
  return `${siteUrl()}/r/${encodeURIComponent(code)}`;
}

export function buildInviteMailto(emails: string[], message: string, link: string): string {
  const subject = "Create your Travel Wrapped ✈️";
  const body = `${message}\n\nMake yours here: ${link}`;
  const to = emails.length === 1 ? emails[0] : "";
  const bcc = emails.length > 1 ? `&bcc=${encodeURIComponent(emails.join(","))}` : "";
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${bcc}`;
}

export function parseEmailList(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}
