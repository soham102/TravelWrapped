import { Suspense } from "react";
import { PageLoader } from "@/components/ui/misc";
import { RefCapture } from "./ref-capture";

type Params = { params: Promise<{ code: string }> };

export const metadata = {
  title: "You're invited to Travel Wrapped",
  description: "A friend invited you to turn your travel year into a beautiful, shareable story.",
};

export default function ReferralPage({ params }: Params) {
  return (
    <Suspense fallback={<PageLoader label="Opening your invite…" />}>
      <Resolve params={params} />
    </Suspense>
  );
}

async function Resolve({ params }: Params) {
  const { code } = await params;
  return <RefCapture code={code.slice(0, 32)} />;
}
