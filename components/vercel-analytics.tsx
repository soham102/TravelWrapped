"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics (page views). Query strings are stripped before sending so auth callback
 * codes, invite/referral tokens, etc. never land in analytics. Only active on Vercel deployments
 * with Analytics enabled in the dashboard; in dev it just logs to the console.
 */
export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.search = "";
        url.hash = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
