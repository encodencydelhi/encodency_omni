import { createRng, daysAgo, daysAhead, minutesAgo } from "@/mocks/lib/random";
import type { InternalRole } from "@/types/domain/team";
import type {
  AccessReviewStatus,
  AssignmentResponsibility,
  InvitationStatus,
  StaffAccessReview,
  StaffActivity,
  StaffAssignment,
  StaffInvitation,
  StaffLifecycleEvent,
  StaffMember,
} from "./types";
import { getMfaState } from "./config";

interface StaffSeed {
  name: string;
  email: string;
  role: InternalRole;
  department: string;
  jobTitle: string;
  status: "active" | "invited" | "suspended";
}

const STAFF_SEEDS: StaffSeed[] = [
  { name: "Aditya Raghunath", email: "aditya.raghunath@encodency.com", role: "super_admin", department: "Platform Engineering", jobTitle: "Platform Owner", status: "active" },
  { name: "Renu Balakrishnan", email: "renu.balakrishnan@encodency.com", role: "super_admin", department: "Platform Engineering", jobTitle: "Platform Administrator", status: "active" },
  { name: "Manish Sirohi", email: "manishsirohi@encodency.com", role: "technical_admin", department: "Platform Engineering", jobTitle: "Technical Lead", status: "active" },
  { name: "Elena Marsh", email: "elena.marsh@encodency.com", role: "technical_admin", department: "Trust & Safety", jobTitle: "Security Engineer", status: "active" },
  { name: "Sanjana Kulkarni", email: "sanjana.kulkarni@encodency.com", role: "support", department: "Support", jobTitle: "Support Manager", status: "active" },
  { name: "Tomas Novak", email: "tomas.novak@encodency.com", role: "support", department: "Support", jobTitle: "Technical Support Lead", status: "active" },
  { name: "Priyanka Deshmukh", email: "priyanka.deshmukh@encodency.com", role: "support", department: "Support", jobTitle: "Customer Support Agent", status: "invited" },
  { name: "Marcus Bennett", email: "marcus.bennett@encodency.com", role: "finance", department: "Finance", jobTitle: "Finance Manager", status: "active" },
  { name: "Yuki Tanaka", email: "yuki.tanaka@encodency.com", role: "finance", department: "Revenue Operations", jobTitle: "Revenue Analyst", status: "active" },
  { name: "Ishita Nair", email: "ishita.nair@encodency.com", role: "operations", department: "Customer Success", jobTitle: "Operations Manager", status: "active" },
  { name: "Daniel Okafor", email: "daniel.okafor@encodency.com", role: "operations", department: "Customer Success", jobTitle: "Account Operations Lead", status: "active" },
  { name: "Clara Fontaine", email: "clara.fontaine@encodency.com", role: "operations", department: "Revenue Operations", jobTitle: "Revenue Operations Specialist", status: "suspended" },
];

const COMPANY_POOL = [
  { id: "cmp_namo-gange-trust", name: "Namo Gange Trust" },
  { id: "cmp_CityInida", name: "CityInida Pvt Ltd" },
  { id: "cmp_meridian-digital", name: "Meridian Digital" },
  { id: "cmp_bharat-organic-foods", name: "Bharat Organic Foods" },
  { id: "cmp_sattva-wellness", name: "Sattva Wellness Group" },
  { id: "cmp_craftline-interiors", name: "Craftline Interiors" },
  { id: "cmp_blue-harbour-logistics", name: "Blue Harbour Logistics" },
  { id: "cmp_auric-jewels", name: "Auric Jewels" },
  { id: "cmp_nordwind-studios", name: "Nordwind Studios" },
  { id: "cmp_peak-and-pine", name: "Peak & Pine Outdoors" },
  { id: "cmp_lumen-health", name: "Lumen Health Systems" },
  { id: "cmp_amberline-cosmetics", name: "Amberline Cosmetics" },
];

const REVIEWER_POOL = [
  { id: "stf_001", name: "Aditya Raghunath" },
  { id: "stf_002", name: "Renu Balakrishnan" },
];

function buildAssignments(staffId: string, rng: ReturnType<typeof createRng>, status: string): StaffAssignment[] {
  if (status === "invited") return [];
  const count = rng.int(0, 4);
  if (count === 0) return [];
  const pool = rng.pickMany(COMPANY_POOL, count);
  const responsibilities: AssignmentResponsibility[] = ["primary_owner", "backup_owner", "support_owner", "integration_support", "billing_contact"];
  return pool.map((company, i) => ({
    id: `asgn_${staffId}_${i}`,
    staffId,
    companyId: company.id,
    companyName: company.name,
    responsibility: i === 0 ? "primary_owner" : rng.pick(responsibilities),
    assignedAt: daysAgo(rng.int(10, 200)),
    assignedBy: "stf_001",
    status: "active" as const,
  }));
}

function buildReviewStatus(rng: ReturnType<typeof createRng>, status: string): { accessReviewStatus: AccessReviewStatus; nextReviewDate: string | null } {
  if (status === "invited") return { accessReviewStatus: "not_scheduled", nextReviewDate: null };
  const roll = rng.weighted({ completed: 3, upcoming: 2, due: 1, overdue: 1, not_scheduled: 1 } as Record<AccessReviewStatus, number>);
  return {
    accessReviewStatus: roll,
    nextReviewDate: roll === "not_scheduled" ? null : daysAhead(rng.int(-10, 30)),
  };
}

export const STAFF_MEMBERS: StaffMember[] = STAFF_SEEDS.map((seed, index) => {
  const rng = createRng(91000 + index * 13);
  const staffId = `stf_${String(index + 1).padStart(3, "0")}`;
  const assignments = buildAssignments(staffId, rng, seed.status);
  const mfaEnabled = seed.status === "invited" ? false : rng.bool(0.85);
  const review = buildReviewStatus(rng, seed.status);
  const privileged = seed.role === "super_admin" || seed.role === "technical_admin";

  return {
    id: staffId,
    name: seed.name,
    email: seed.email,
    avatarUrl: null,
    jobTitle: seed.jobTitle,
    department: seed.department,
    role: seed.role,
    status: seed.status,
    mfaEnabled,
    mfaState: getMfaState(mfaEnabled),
    lastActiveAt: seed.status === "invited" ? null : minutesAgo(rng.int(2, 6000)),
    createdAt: daysAgo(rng.int(40, 900)),
    globalUserId: `usr_${String(index + 1).padStart(3, "0")}`,
    assignments,
    accessReviewStatus: review.accessReviewStatus,
    nextReviewDate: review.nextReviewDate,
    privilegedAccess: privileged,
    effectiveCapabilities: [],
    sensitiveCapabilities: [],
  };
});

const INVITATION_SEEDS: Array<{ name: string; email: string; role: InternalRole; department: string; jobTitle: string; status: InvitationStatus }> = [
  { name: "Priyanka Deshmukh", email: "priyanka.deshmukh@encodency.com", role: "support", department: "Support", jobTitle: "Customer Support Agent", status: "pending" },
  { name: "Rajesh Menon", email: "rajesh.menon@encodency.com", role: "operations", department: "Operations", jobTitle: "Operations Analyst", status: "pending" },
  { name: "Sofia Alvarez", email: "sofia.alvarez@encodency.com", role: "technical_admin", department: "Platform Engineering", jobTitle: "DevOps Engineer", status: "accepted" },
  { name: "Vikram Joshi", email: "vikram.joshi@encodency.com", role: "finance", department: "Finance", jobTitle: "Accounts Payable Lead", status: "expired" },
  { name: "Leila Chen", email: "leila.chen@encodency.com", role: "support", department: "Support", jobTitle: "Support Engineer", status: "revoked" },
];

export const STAFF_INVITATIONS: StaffInvitation[] = INVITATION_SEEDS.map((seed, index) => {
  const rng = createRng(72000 + index * 11);
  const companyCount = rng.int(0, 2);
  const pool = companyCount > 0 ? rng.pickMany(COMPANY_POOL, companyCount) : [];
  return {
    id: `inv_${String(index + 1).padStart(3, "0")}`,
    email: seed.email,
    name: seed.name,
    department: seed.department,
    jobTitle: seed.jobTitle,
    role: seed.role,
    invitedBy: { id: "stf_001", name: "Aditya Raghunath" },
    createdAt: daysAgo(rng.int(1, 30)),
    expiresAt: seed.status === "expired" ? daysAgo(rng.int(1, 5)) : daysAhead(rng.int(5, 25)),
    status: seed.status,
    companyAssignments: pool.map((c) => ({
      companyId: c.id,
      companyName: c.name,
      responsibility: rng.pick<AssignmentResponsibility>(["primary_owner", "backup_owner", "support_owner"]),
    })),
    acceptedUserId: seed.status === "accepted" ? `usr_${String(13 + index).padStart(3, "0")}` : null,
  };
});

export const STAFF_ACCESS_REVIEWS: StaffAccessReview[] = STAFF_MEMBERS.filter((s) => s.status !== "invited").map((member, index) => {
  const rng = createRng(55000 + index * 17);
  const statusMap: Record<string, AccessReviewStatus> = {
    completed: "completed", upcoming: "upcoming", due: "due", overdue: "overdue", not_scheduled: "not_scheduled",
  };
  const reviewStatus = statusMap[member.accessReviewStatus] || "not_scheduled";
  return {
    id: `rev_${member.id}`,
    staffId: member.id,
    staffName: member.name,
    staffEmail: member.email,
    role: member.role,
    department: member.department,
    mfaState: member.mfaState,
    lastReviewDate: reviewStatus === "completed" ? daysAgo(rng.int(5, 90)) : reviewStatus === "not_scheduled" ? null : daysAgo(rng.int(90, 365)),
    nextReviewDate: member.nextReviewDate,
    status: reviewStatus,
    reviewer: reviewStatus !== "not_scheduled" ? rng.pick(REVIEWER_POOL).name : null,
    notes: reviewStatus === "completed" ? "Access confirmed. No changes required." : null,
    outcome: reviewStatus === "completed" ? "confirmed" : null,
  };
});

export const STAFF_ACTIVITIES: StaffActivity[] = STAFF_MEMBERS.flatMap((member) => {
  const seedNum = parseInt(member.id.split("_")[1] || "0", 10);
  const rng = createRng(33000 + seedNum * 23);
  const events: StaffActivity[] = [];
  const eventTypes = ["staff_invited", "invitation_accepted", "role_assigned", "company_assigned", "access_review_completed"];
  const count = member.status === "invited" ? 1 : rng.int(2, 5);
  for (let i = 0; i < count; i++) {
    const eventType = rng.pick(eventTypes);
    const company = rng.pick(COMPANY_POOL);
    events.push({
      id: `act_${member.id}_${i}`,
      staffId: member.id,
      timestamp: daysAgo(rng.int(1, 180)),
      eventType,
      actor: { id: "stf_001", name: "Aditya Raghunath" },
      details: eventType === "company_assigned" ? `Assigned to ${company.name}` : `${eventType.replace(/_/g, " ")} for ${member.name}`,
      companyId: company.id,
      companyName: company.name,
      result: "successful",
    });
  }
  return events;
}).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const STAFF_LIFECYCLE_EVENTS: StaffLifecycleEvent[] = STAFF_MEMBERS.flatMap((member) => {
  const seedNum = parseInt(member.id.split("_")[1] || "0", 10);
  const rng = createRng(44000 + seedNum * 31);
  const events: StaffLifecycleEvent[] = [];
  events.push({
    id: `lc_${member.id}_0`,
    staffId: member.id,
    eventType: "invited",
    timestamp: member.createdAt,
    actor: { id: "stf_001", name: "Aditya Raghunath" },
    details: `Invited as ${member.role}`,
  });
  if (member.status === "active") {
    events.push({
      id: `lc_${member.id}_1`,
      staffId: member.id,
      eventType: "activated",
      timestamp: daysAgo(rng.int(30, 800)),
      actor: { id: "stf_001", name: "Aditya Raghunath" },
      details: "Staff membership activated",
    });
  }
  if (member.status === "suspended") {
    events.push({
      id: `lc_${member.id}_1`,
      staffId: member.id,
      eventType: "activated",
      timestamp: daysAgo(rng.int(100, 600)),
      actor: { id: "stf_001", name: "Aditya Raghunath" },
      details: "Staff membership activated",
    });
    events.push({
      id: `lc_${member.id}_2`,
      staffId: member.id,
      eventType: "suspended",
      timestamp: daysAgo(rng.int(10, 50)),
      actor: { id: "stf_002", name: "Renu Balakrishnan" },
      details: "Suspended due to policy violation review",
    });
  }
  return events;
}).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const COMPANY_POOL_EXPORT = COMPANY_POOL;
