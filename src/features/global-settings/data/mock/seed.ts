import { DEMO_CLOCK_ANCHOR } from "@/features/companies/data/config";
import { INTERNAL_TEAM } from "@/mocks/data/internal-team";
import { defaultValues, getDefinition } from "../registry";
import type {
  ConfigurationChange,
  ConfigurationVersion,
  EditableSectionKey,
  MaintenanceEntry,
  SettingValue,
  SettingValues,
} from "../types";

const DAY_MS = 86_400_000;
const at = (daysAgo: number, hour = 10) => {
  const base = new Date(DEMO_CLOCK_ANCHOR - daysAgo * DAY_MS);
  base.setUTCHours(hour, 15, 0, 0);
  return base.toISOString();
};

const staff = (id: string) => {
  const member = INTERNAL_TEAM.find((item) => item.id === id) ?? INTERNAL_TEAM[0];
  return { id: member?.id ?? id, name: member?.name ?? "Platform staff" };
};

interface SeedChange {
  key: string;
  from: SettingValue;
  reason: string;
}

interface SeedVersion {
  number: number;
  daysAgo: number;
  actor: string;
  summary: string;
  changes: SeedChange[];
}

/** Oldest first. The `to` side of every change is the registry default, or a later change's `from`. */
const SEED_VERSIONS: readonly SeedVersion[] = [
  { number: 1, daysAgo: 120, actor: "stf_001", summary: "Initial platform configuration", changes: [] },
  {
    number: 2,
    daysAgo: 96,
    actor: "stf_002",
    summary: "Support contact moved to the platform operations mailbox",
    changes: [{ key: "identity.support_email", from: "support@encodency.com", reason: "Consolidate support requests into one monitored mailbox." }],
  },
  {
    number: 3,
    daysAgo: 64,
    actor: "stf_001",
    summary: "Tightened staff idle timeout and minimum password length",
    changes: [
      { key: "security.sessions.idle_timeout_minutes", from: 120, reason: "Security review: shorten staff idle timeout." },
      { key: "security.password.min_length", from: 10, reason: "Security review: raise the password floor to 12." },
    ],
  },
  {
    number: 4,
    daysAgo: 41,
    actor: "stf_002",
    summary: "Regional defaults moved to India",
    changes: [
      { key: "localization.default_timezone", from: "UTC", reason: "Most companies operate from India." },
      { key: "localization.default_locale", from: "en-US", reason: "Match the regional default." },
      { key: "localization.number_locale", from: "en-US", reason: "Lakh/crore grouping for the primary market." },
      { key: "localization.display_currency", from: "USD", reason: "Display platform amounts in rupees." },
    ],
  },
  {
    number: 5,
    daysAgo: 23,
    actor: "stf_003",
    summary: "Longer retention for notification history and integration activity",
    changes: [
      { key: "privacy.retention.notification_history", from: 90, reason: "Support needs six months of delivery history." },
      { key: "privacy.retention.integration_activity", from: 60, reason: "Align integration activity with the support window." },
    ],
  },
  {
    number: 6,
    daysAgo: 11,
    actor: "stf_001",
    summary: "Owner invitation window and privacy contact updated",
    changes: [
      { key: "onboarding.owner_invite_expiry_days", from: 5, reason: "Owners in larger organisations need more time to accept." },
      { key: "communications.privacy_email", from: "legal@encodency.com", reason: "Privacy requests now go to the privacy mailbox." },
    ],
  },
  {
    number: 7,
    daysAgo: 4,
    actor: "stf_002",
    summary: "Stricter sign-in attempt limits",
    changes: [
      { key: "security.login.max_failed_attempts", from: 8, reason: "Reduce the window for credential guessing." },
      { key: "security.login.lockout_minutes", from: 10, reason: "Lengthen the temporary lockout." },
    ],
  },
];

export interface SeedState {
  values: SettingValues;
  versions: ConfigurationVersion[];
  changes: ConfigurationChange[];
  seq: number;
}

export function buildSeed(): SeedState {
  const values = defaultValues();

  // Walk backwards to recover each version's snapshot.
  const snapshots = new Map<number, SettingValues>();
  let cursor: SettingValues = { ...values };
  for (const version of [...SEED_VERSIONS].reverse()) {
    snapshots.set(version.number, { ...cursor });
    for (const change of version.changes) cursor = { ...cursor, [change.key]: change.from };
  }

  const versions: ConfigurationVersion[] = [];
  const changes: ConfigurationChange[] = [];
  let seq = 0;
  let running: SettingValues = { ...(snapshots.get(1) ?? values) };

  for (const spec of SEED_VERSIONS) {
    const actor = staff(spec.actor);
    const createdAt = at(spec.daysAgo);
    const ids: string[] = [];
    const sections = new Set<EditableSectionKey>();
    for (const change of spec.changes) {
      const definition = getDefinition(change.key);
      if (!definition) continue;
      seq += 1;
      const id = `cfg_chg_${String(seq).padStart(4, "0")}`;
      ids.push(id);
      sections.add(definition.section);
      changes.push({
        id,
        versionId: `cfg_v${spec.number}`,
        at: createdAt,
        actorId: actor.id,
        actorName: actor.name,
        section: definition.section,
        key: change.key,
        settingName: definition.name,
        previous: running[change.key] ?? definition.defaultValue,
        next: (snapshots.get(spec.number) ?? values)[change.key] ?? definition.defaultValue,
        changeType: "update",
        result: "applied",
        scope: definition.scope,
        effectiveAt: createdAt,
        reason: change.reason,
        sensitivity: definition.sensitivity,
        demo: true,
        auditRef: `AUD-${20000 + seq}`,
        approvalNote: definition.approval === "none" ? "Not required" : "Recorded in demo",
      });
    }
    running = { ...(snapshots.get(spec.number) ?? values) };
    versions.push({
      id: `cfg_v${spec.number}`,
      number: spec.number,
      label: `v${spec.number}`,
      status: spec.number === SEED_VERSIONS.length ? "current" : "previous",
      createdBy: actor.name,
      createdAt,
      effectiveAt: createdAt,
      sections: [...sections],
      summary: spec.summary,
      changeIds: ids,
      snapshot: { ...running },
    });
  }

  // Requests that are not part of the effective configuration.
  const requester = staff("stf_003");
  const scheduler = staff("stf_001");
  const pendingBase = { versionId: null, demo: true, auditRef: null } as const;
  const pending: ConfigurationChange[] = [
    {
      ...pendingBase,
      id: `cfg_chg_${String(++seq).padStart(4, "0")}`,
      at: at(2, 14),
      actorId: requester.id,
      actorName: requester.name,
      section: "security",
      key: "security.company_users.mfa_minimum",
      settingName: getDefinition("security.company_users.mfa_minimum")?.name ?? "Company user MFA minimum",
      previous: "required_for_admins",
      next: "required_for_all",
      changeType: "update",
      result: "pending_approval",
      scope: "company_users",
      effectiveAt: null,
      reason: "Extend the MFA baseline to every company user after the recent phishing reports.",
      sensitivity: "critical",
      approvalNote: "Awaiting secondary approval. Demo draft: no approval workflow runs in this frontend phase.",
    },
    {
      ...pendingBase,
      id: `cfg_chg_${String(++seq).padStart(4, "0")}`,
      at: at(1, 16),
      actorId: scheduler.id,
      actorName: scheduler.name,
      section: "communications",
      key: "communications.legal.terms",
      settingName: "Platform Terms of Service",
      previous: values["communications.legal.terms"] ?? null,
      next: {
        ...(values["communications.legal.terms"] as object),
        version: "3.2",
        effectiveDate: "2026-10-01",
        status: "under_review",
      } as SettingValue,
      changeType: "reference",
      result: "scheduled",
      scope: "platform_wide",
      effectiveAt: "2026-10-01T00:00:00.000Z",
      reason: "Reference the revised terms from their effective date. Wording is owned by Legal.",
      sensitivity: "moderate",
      approvalNote: "Planned record. No scheduler runs in the demo, so it is not applied automatically.",
    },
  ];

  return { values, versions, changes: [...changes, ...pending].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)), seq };
}

/** Read-only maintenance records shown beside the configured announcement. */
export const MAINTENANCE_RECORDS: readonly MaintenanceEntry[] = [
  { id: "mnt_2026_08", kind: "announcement", title: "Database maintenance", audience: ["all_companies", "platform_staff"], area: "Entire platform", startsAt: "2026-08-14T20:00:00.000Z", endsAt: "2026-08-14T22:00:00.000Z", status: "completed", editable: false },
  { id: "mnt_2026_07", kind: "announcement", title: "Publishing queue upgrade", audience: ["all_companies"], area: "Publishing & scheduling", startsAt: "2026-07-06T19:30:00.000Z", endsAt: "2026-07-06T20:30:00.000Z", status: "completed", editable: false },
  { id: "mnt_2026_10", kind: "announcement", title: "Regional infrastructure migration", audience: ["all_companies", "platform_staff"], area: "Integrations & sync", startsAt: "2026-10-04T19:00:00.000Z", endsAt: "2026-10-04T23:00:00.000Z", status: "upcoming", editable: false },
];
