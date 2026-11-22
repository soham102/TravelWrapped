import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageLoader } from "@/components/ui/misc";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoader label="Loading…" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
