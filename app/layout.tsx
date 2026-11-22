import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dmsans", subsets: ["latin"], display: "swap" });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Travel Wrapped — Your year in journeys",
    template: "%s · Travel Wrapped",
  },
  description:
    "Turn your 2026 travel year into a beautiful, shareable story. Map every city, every state and every memory — then share it with friends.",
  openGraph: {
    title: "Travel Wrapped — Your journeys. Your memories. Your year.",
    description: "Turn your travel year into a story worth sharing.",
    type: "website",
    siteName: "Travel Wrapped",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b1026",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} ${instrument.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject attributes on <body> before hydration. Only affects this element's own attributes, not its children. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
