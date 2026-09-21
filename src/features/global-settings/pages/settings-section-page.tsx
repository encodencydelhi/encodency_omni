"use client";

import type { SectionKey } from "../data/types";
import { AccessGovernanceSection } from "../sections/access-governance";
import { AuthenticationSecuritySection } from "../sections/authentication-security";
import { CommunicationsLegalSection } from "../sections/communications-legal";
import { CompanyOnboardingSection } from "../sections/company-onboarding";
import { ConfigurationHistorySection } from "../sections/configuration-history";
import { DataPrivacySection } from "../sections/data-privacy";
import { GeneralIdentitySection } from "../sections/general-identity";
import { LocalizationDefaultsSection } from "../sections/localization-defaults";
import { MaintenanceAvailabilitySection } from "../sections/maintenance-availability";

const SECTION_COMPONENTS: Record<SectionKey, () => React.JSX.Element> = {
  identity: GeneralIdentitySection,
  localization: LocalizationDefaultsSection,
  onboarding: CompanyOnboardingSection,
  security: AuthenticationSecuritySection,
  governance: AccessGovernanceSection,
  privacy: DataPrivacySection,
  communications: CommunicationsLegalSection,
  maintenance: MaintenanceAvailabilitySection,
  history: ConfigurationHistorySection,
};

/** Renders one Global Settings section. The frame around it lives in the route layout. */
export function SettingsSectionPage({ section }: { section: SectionKey }) {
  const Section = SECTION_COMPONENTS[section];
  return <Section />;
}
