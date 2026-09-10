import type { AuthenticatedUser } from "@/types/domain/auth";
import { ROLE_PERMISSIONS, type InternalRole, type InternalTeamMember } from "@/types/domain/team";
import { createRng, daysAgo, minutesAgo } from "../lib/random";

interface MemberSeed {
  name: string;
  email: string;
  role: InternalRole;
  department: string;
  status: InternalTeamMember["status"];
}

/**
 * EnCodency staff with access to this panel.
 *
 * The first entry is the account the mock login issues a session for.
 */
const MEMBER_SEEDS: MemberSeed[] = [
  { name: "Aditya Raghunath", email: "aditya.raghunath@encodency.com", role: "super_admin", department: "Platform Engineering", status: "active" },
  { name: "Renu Balakrishnan", email: "renu.balakrishnan@encodency.com", role: "super_admin", department: "Platform Engineering", status: "active" },
  { name: "Manish Sirohi", email: "manishsirohi@encodency.com", role: "technical_admin", department: "Platform Engineering", status: "active" },
  { name: "Elena Marsh", email: "elena.marsh@encodency.com", role: "technical_admin", department: "Trust & Safety", status: "active" },
  { name: "Sanjana Kulkarni", email: "sanjana.kulkarni@encodency.com", role: "support", department: "Support", status: "active" },
  { name: "Tomas Novak", email: "tomas.novak@encodency.com", role: "support", department: "Support", status: "active" },
  { name: "Priyanka Deshmukh", email: "priyanka.deshmukh@encodency.com", role: "support", department: "Support", status: "invited" },
  { name: "Marcus Bennett", email: "marcus.bennett@encodency.com", role: "finance", department: "Finance", status: "active" },
  { name: "Yuki Tanaka", email: "yuki.tanaka@encodency.com", role: "finance", department: "Revenue Operations", status: "active" },
  { name: "Ishita Nair", email: "ishita.nair@encodency.com", role: "operations", department: "Customer Success", status: "active" },
  { name: "Daniel Okafor", email: "daniel.okafor@encodency.com", role: "operations", department: "Customer Success", status: "active" },
  { name: "Clara Fontaine", email: "clara.fontaine@encodency.com", role: "operations", department: "Revenue Operations", status: "suspended" },
];

export const INTERNAL_TEAM: readonly InternalTeamMember[] = MEMBER_SEEDS.map((seed, index) => {
  const rng = createRng(81000 + index * 7);
  return {
    id: `stf_${String(index + 1).padStart(3, "0")}`,
    name: seed.name,
    email: seed.email,
    avatarUrl: null,
    role: seed.role,
    status: seed.status,
    department: seed.department,
    lastActiveAt: seed.status === "invited" ? null : minutesAgo(rng.int(2, 6_000)),
    mfaEnabled: seed.status === "invited" ? false : rng.bool(0.85),
    createdAt: daysAgo(rng.int(40, 900)),
  } satisfies InternalTeamMember;
});

function toAuthenticatedUser(member: InternalTeamMember): AuthenticatedUser {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    avatarUrl: member.avatarUrl,
    role: member.role,
    permissions: ROLE_PERMISSIONS[member.role],
    status: member.status === "suspended" ? "suspended" : "active",
    department: member.department,
    lastLoginAt: member.lastActiveAt,
  };
}

/** Accounts the mock auth adapter accepts, keyed by email. */
export const MOCK_ACCOUNTS: ReadonlyMap<string, AuthenticatedUser> = new Map(
  INTERNAL_TEAM.filter((member) => member.status !== "invited").map((member) => [
    member.email.toLowerCase(),
    toAuthenticatedUser(member),
  ]),
);

/** Assignable support agents. */
export const SUPPORT_AGENTS = INTERNAL_TEAM.filter(
  (member) => member.status === "active" && (member.role === "support" || member.role === "super_admin"),
).map((member) => ({ id: member.id, name: member.name }));
