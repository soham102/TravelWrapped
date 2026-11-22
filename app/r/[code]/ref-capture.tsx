"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { REF_KEY } from "@/components/providers";
import { PageLoader } from "@/components/ui/misc";

export function RefCapture({ code }: { code: string }) {
  const router = useRouter();
  React.useEffect(() => {
    try {
      if (/^[a-z0-9]{4,32}$/i.test(code)) localStorage.setItem(REF_KEY, code);
    } catch {
      /* ignore */
    }
    router.replace("/signup");
  }, [code, router]);
  return <PageLoader label="Opening your invite…" />;
}
