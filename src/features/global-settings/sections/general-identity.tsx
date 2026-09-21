"use client";

import { BrandingPanel, PublicIdentityPreview } from "../components/branding-panel";
import { SectionData, SettingGroup, ViewOnlyNotice } from "../components/section-parts";
import { useSectionEditor } from "../components/use-section-editor";
import type { ConfigurationChange, ConfigurationSnapshot } from "../data/types";

function Editor({ config, pending }: { config: ConfigurationSnapshot; pending: ConfigurationChange[] }) {
  const editor = useSectionEditor("identity", config, pending);
  return (
    <div className="space-y-3">
      {!editor.canEdit ? <ViewOnlyNotice section="identity" /> : null}
      {editor.banner}
      <SettingGroup editor={editor} group="platform_information" compact />
      <BrandingPanel editor={editor} />
      <PublicIdentityPreview editor={editor} />
      {editor.bar}
      {editor.dialog}
    </div>
  );
}

export function GeneralIdentitySection() {
  return <SectionData>{({ config, pending }) => <Editor config={config} pending={pending} />}</SectionData>;
}
