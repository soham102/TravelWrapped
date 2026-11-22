# Travel Wrapped — Your year in journeys

Spotify-Wrapped-style recaps for travel. Users log their trips, and the app turns them into an
interactive 10-slide story, an accurate India map, and downloadable/shareable images.

> Built by Soham for the goSTOPS Build Sprint. Not an official goSTOPS product.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — without Supabase the app runs in local mode
npm run dev
```

**Local mode** (no env vars): everything works in the browser — accounts, trips, photos, Wrapped,
exports, share links (snapshot encoded in the URL hash), invitations via `mailto:`, and local analytics.
Data lives in `localStorage` on that device only. A banner makes this explicit.

**Supabase mode**: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then:

1. Create a Supabase project (free tier is fine).
2. SQL editor → run `supabase/migrations/0001_init.sql` (tables, constraints, RLS, storage bucket + policies, triggers, RPCs).
3. Auth → URL configuration: set the Site URL and add `https://YOUR-DOMAIN/**` to redirect URLs (used by email confirmation, password reset and Google OAuth).
4. Optional: Auth → Providers → Google, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
5. Optional: `RESEND_API_KEY` + `INVITE_FROM_EMAIL` (a verified domain) for server-sent invitations.
6. Optional: `SUPABASE_SERVICE_ROLE_KEY` + `ADMIN_EMAILS` for `/admin` analytics.

## Deploy (Vercel)

Import the repo, add the env vars from `.env.example` (set `NEXT_PUBLIC_SITE_URL` to the production URL), deploy.
No extra config is needed.

## Architecture

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, Cache Components), TypeScript, Tailwind v4 |
| Data access | Browser → Supabase directly, protected by RLS (`lib/store/supabase-store.ts`); same `Store` interface backed by localStorage in local mode (`lib/store/local-store.ts`) |
| Server routes | `/api/invite` (Resend or mailto fallback + rate limit), `/api/geocode` (Photon/OSM proxy + cache), `/api/admin/metrics` (service role, admin-gated) |
| Public pages | `/w/[slug]` server-rendered via the `get_public_wrapped` security-definer RPC + dynamic OG image |
| Wrapped engine | `lib/wrapped/compute.ts` (stats, achievements), `lib/wrapped/personality.ts` (rule-based, with reasons) — pure functions over real trips |
| Maps | d3-geo SVG map from DataMeet state boundaries (`lib/geo/india-states.json`, 36 states/UTs) for stories & exports; React-Leaflet for the zoomable map page |
| Exports | html-to-image (PNG @3×: 1080×1920 / 1080×1080 / 1200×1680) + jsPDF (complete Wrapped) from an offscreen native-size render stage |
| Sharing | Web Share API with image files (→ Instagram/WhatsApp on mobile), WhatsApp/LinkedIn/Facebook/X intents, copy link, opt-in & revocable public links |

### Data model (see migration for full DDL)

`profiles` (1:1 auth.users, referral_code, referred_by) · `trips` · `destinations` (ordered stops, unique per trip) ·
`travel_photos` (private bucket `travel-photos/<uid>/<trip>/…`) · `travel_wrapped` (one per user/year, public-safe `stats` snapshot, `public_slug`, `is_public`) ·
`invitations` (unique per sender+email, 25/day trigger) · `events` (insert-only analytics).

### Privacy

- RLS: every table is owner-only. Public Wrapped are readable only through a slug-scoped RPC (no enumeration).
- Public snapshots exclude photos, notes and memorable moments.
- Photos are resized and re-encoded client-side (strips EXIF/GPS) and served via short-lived signed URLs.

### Honest numbers

Distance appears only when the user logs km. Personality and achievements are rule-based on actual trips,
and the personality slide shows *why*. Landing page shows no invented user counts or testimonials.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run lint`
