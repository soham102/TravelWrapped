/**
 * The journey shares the Wrapped's opt-in public link: /w/<slug> → /w/<slug>/journey, and in local
 * mode /share#<token> → /share/journey#<token>. A private Wrapped has no journey link.
 */
export function journeyShareUrl(wrappedUrl: string | null): string | null {
  if (!wrappedUrl) return null;
  const u = new URL(wrappedUrl);
  if (u.pathname === "/share") return `${u.origin}/share/journey${u.hash}`;
  if (u.pathname.startsWith("/w/")) return `${u.origin}${u.pathname.replace(/\/$/, "")}/journey`;
  return null;
}
