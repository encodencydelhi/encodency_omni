import { Suspense, type ReactNode } from "react";
import { AdsDataProvider } from "@/features/admin/meta-ads/data-source";

export default function MetaAdsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdsDataProvider>{children}</AdsDataProvider>
    </Suspense>
  );
}
