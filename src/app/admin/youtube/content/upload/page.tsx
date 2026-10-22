import { UploadPage } from "@/features/admin/youtube/pages/upload-page";
import { FeatureGate } from "@/lib/feature-flags/feature-gate";

export default function Page() {
  return (
    <FeatureGate flag="channels.youtube_publishing">
      <UploadPage />
    </FeatureGate>
  );
}
