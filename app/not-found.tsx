import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 px-6 text-center text-cream-100">
      <p className="font-display text-7xl font-extrabold text-sunset-500">404</p>
      <p className="font-display text-3xl font-extrabold">Looks like you took a wrong turn.</p>
      <p className="max-w-md text-cream-200/70">This page isn&apos;t on the map.</p>
      <Link href="/" className="rounded-full bg-sunset-500 px-6 py-3 font-semibold text-white">Back to Travel Wrapped</Link>
    </div>
  );
}
