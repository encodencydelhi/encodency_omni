# Frontend ↔ Backend Integration Gap Report — 2026-09-26

**Prepared for:** Backend engineer (handoff) + frontend engineer (action queue)
**Sources reviewed:**
- `encodency_omni_documents/` — `05-api-contracts/api-coverage-matrix.md`, `09-handoffs/current-project-state.md` (through 2026-09-26 L1113–1116), `backend-business-flow-completion-summary.md`, `frontend-handoff-after-backend-alignment.md`, `sompal-frontend-complete-audit.md`, `sompal-next-instructions-draft.md`, `frontend-backend-final-verification-and-cleanup.md`
- `encodency_omni_backend/src` — every controller read; **77 routes implemented** (71 effective, 6 dev-harness gated)
- `encodency_omni/src` — every `apiClient` call site enumerated (96 call sites), every repository/provider switch inspected

**Rule applied:** Section 2 lists **only** items where the **backend is READY (route implemented + synced to dev)** and the frontend has **not** integrated it. Section 3 lists the reverse direction (frontend feature, backend route missing) and is explicitly **out of scope for frontend work**.

---

## 1. What the frontend HAS integrated (verified by code, live API mode)

`NEXT_PUBLIC_DATA_SOURCE=api` → `src/lib/api/http-transport.ts` is the only network path (`credentials:"include"`, same-origin `/api/v1` via `next.config.ts` rewrite, `x-company-id` / `x-client-id` scoping).

| Domain | Backend routes (all under `/api/v1`) | Frontend caller | Status |
|---|---|---|---|
| Auth + MFA (9) | `POST /auth/login`, `/auth/totp/setup`, `/auth/totp/verify-setup`, `/auth/verify-totp`, `/auth/verify-recovery-code`, `/auth/logout`, `/auth/totp/replace`, `/auth/totp/verify-replacement`, `GET /auth/me` | `features/auth/services/auth-service.ts:43,53,63,74,85,102,116,141,155` | ✅ wired, contract-clean (no `rememberMe`, profile read from `/users/me`) |
| Current user | `GET /users/me`, `PATCH /users/me` | `auth-service.ts:33`, `user-profile-api.ts:17` | ✅ |
| Avatar (IMAGE-01 P4) | `PUT/DELETE /users/me/avatar` | `features/auth/services/user-avatar-api.ts:50,58` → `admin/settings/components/preferences-section.tsx:17`, `admin/shell/admin-topbar.tsx:20` | ✅ wired (docs still list this as "pending frontend" — it is done) |
| Clients (10/10) | `POST/GET /clients`, `GET/PATCH /clients/:id`, `GET/POST/DELETE /clients/:id/members`, `PUT /clients/:id/lead`, `PUT/DELETE /clients/:id/logo` | `admin/projects/live/clients-api.ts:195–313` + `clients/data/api-provider.ts` | ⚠️ mostly wired — **2 sub-gaps, see 2.4 / 2.5** |
| Team (3) | `GET /team/members`, `PUT /team/members/:id/role` | `admin/team/live/team-api.ts:51,58`, `team-data/repository.ts:95,241` | ✅ (profile route unused — see 2.6) |
| Invitations (3) | `POST /companies/:id/invitations`, `POST /invitations/validate`, `POST /invitations/accept`, `POST /invitations/finalize` | `team-api.ts:82,92,102,112`, `auth/components/accept-invitation-view.tsx:86,115` | ✅ 2-path validate/finalize flow implemented as per 2026-09-26 contract |
| Campaigns (4) | `POST/GET /campaigns`, `GET/PATCH /campaigns/:id` | `admin/campaigns/live/campaigns-api.ts:159,178,201,222` | ✅ B1 field renames already applied (`campaignType`, `biddingStrategy`, machine channel codes, numeric KPIs, ROAS string — `campaign-mapper.ts:130–260`) |
| Drafts (7 of 8) | `POST/GET /content/drafts`, `GET/PATCH /content/drafts/:id`, `/submit-review`, `/approve`, `/reject` | `admin/content/live/drafts-api.ts:139–265` | ✅ (`PUT /content/drafts/:id/media` **not** wired — see 2.1) |
| Scheduling / publishing (5/5) | `GET .../targets`, `POST .../schedule`, `GET /content/scheduled-posts`, `GET /content/scheduled-posts/:id`, `POST /content/scheduled-posts/:id/cancel` | `admin/content/live/scheduling-api.ts:279–369` via `components/ScheduledPostsPanel.tsx` | ✅ wired (supersedes the "scheduling UI is static" line in `sompal-frontend-complete-audit.md`) |
| Branding (5) | `GET /settings/branding`, `PUT/DELETE /settings/branding/:purpose`, `PUT/DELETE /super-admin/companies/:companyId/logo` | `admin/settings/live/branding-api.ts:126,148,161,181,192` | ✅ |
| Super Admin Companies (6/6) | list, create (+`Idempotency-Key`), `:id`, `owner-invitation/resend`, logo `PUT/DELETE` | `companies/live/super-admin-companies-api.ts:71,92`, `companies/data/api-provider.ts:200,253,267`, `branding-api.ts:181,192` | ✅ `Idempotency-Key` sent (`api-provider.ts:270`), `ownerOnboarding` read (`:160`) |
| Super Admin Clients | `GET /super-admin/clients` | `companies/live/super-admin-companies-api.ts:109` ← `clients/data/api-provider.ts:225` | ✅ wired into `/super-admin/clients` (supersedes handoff note "no platform-wide Clients API") |
| Jobs | `GET /super-admin/jobs/stats` | `jobs-queues/data/api-provider.ts:208`, `dashboard/services/dashboard-service.ts:62` | ✅ (only dashboard metric marked `isLive: true`) |
| OAuth + registry | `GET /integrations/registry`, `POST /integrations/oauth/init` | `admin/integrations/live/integrations-api.ts:85,105` via `integrations-data/repository.ts:144,315`; `integrations/data/api-provider.ts:76` (super-admin) | ✅ init path only — see 2.3 |
| Health | `GET /health`, `GET /health/error` | `system-health/services/system-health-service.ts:17,30` | ✅ |
| Tenancy dev harness (6) | `/_manual/tenancy/*` | `tenancy-harness-service.ts:46–72` | ✅ (only when `ENABLE_TENANCY_DEV_HARNESS=true`) |

**Coverage: 60 of 71 effective backend routes have a real frontend call site.** The remaining 11 are the gaps below.

---

## 2. GAPS — Backend READY, frontend NOT integrated  *(the only list that matters for this report)*

### 2.1 Media module — 4 routes built, media UI 100% static  |  SEVERITY: HIGH

| | |
|---|---|
| **Backend (ready)** | `POST /media/upload`, `GET /media`, `GET /media/:id`, `DELETE /media/:id` — `src/media/media.controller.ts` (client-scoped, `content:read`/`content:write`) + `PUT /content/drafts/:id/media` (atomic ordered replace) — `src/content/content.controllers.ts` |
| **Frontend** | `src/features/admin/content/live/media-api.ts` implements **all 5 calls** (lines 131, 155, 174, 193, 214) but the module is **imported by nothing except its own type import and tests** — dead code. |
| **Evidence** | `/admin/media` (`src/app/admin/media/page.tsx`) is a hard-coded static array (no repository, no `apiClient`). `DraftsTab.tsx:305` literally renders `Media … files (TASK-11C pending)`. |
| **Action** | Frontend: wire a media repository to `media-api.ts` and build the draft media attachment UI. Backend: nothing — TASK-11C is complete and synced. |

### 2.2 Organization settings — routes built, frontend throws instead of saving  |  SEVERITY: HIGH

| | |
|---|---|
| **Backend (ready)** | `GET /settings/organization`, `PATCH /settings/organization` (`organization/organization.controller.ts`, `organization:read`/`organization:write`) — B2 migration applied, synced |
| **Frontend** | `src/features/admin/settings/live/organization-api.ts` (lines 50, 60) implements both calls and is **never imported** — dead code. `settings-data/repository.ts:119` → `saveSettings()` **throws `SETTINGS_SERVICE_UNAVAILABLE`** whenever `NEXT_PUBLIC_DATA_SOURCE=api`. |
| **Action** | Frontend: replace the throw with `organizationApi` for the organization section (branding is already live separately). Backend: nothing. |

### 2.3 Integrations — resource discovery + mapping built, UI still runs on mock  |  SEVERITY: HIGH

| | |
|---|---|
| **Backend (ready)** | `GET /integrations/:id/resources`, `POST /integrations/:id/map` (`integrations/resources/integration-resources.controller.ts`, TASK-10, 2026-09-24) + `GET /integrations/registry` |
| **Frontend** | Client exists: `admin/integrations/live/integrations-api.ts:125 (discoverResources)`, `:144 (mapResource)`. But `integrations-data/repository.ts:158–161` `discoverResources()` delegates to the **mock** helper from `integrations-data/mock-provider.ts:805`, and `mapResource` has **zero production callers** (only `lib/api/__tests__/live-api-contracts.test.ts`). The console only ever reaches the backend for `initOAuth` (`repository.ts:144,315`). Registry is fetched only by the **super-admin** provider (`features/integrations/data/api-provider.ts:76`), never by the company-admin console. |
| **Action** | Frontend: switch `repository.discoverResources`/`connect` to `integrationsApi.discoverResources` / `integrationsApi.mapResource`, and fetch registry in the company-admin repository. Backend: nothing. |

### 2.4 Client team members — `GET /clients/:id/members` never called  |  SEVERITY: HIGH

| | |
|---|---|
| **Backend (ready)** | `GET /clients/:id/members` (`clients.controller.ts:52`, B5), returns the assignment list |
| **Frontend** | `clients-api.ts:273 listMembers()` exists but has **no caller**. The repository exposes `getTeam: fallback.getTeam` (`clients/data/api-provider.ts:402`) — i.e. `/admin/clients/[clientId]/team` and the client overview "Assigned members" block render **mock rows**. Only mutations are live: `addMembers` (`:466`), `removeMember` (`:479`), `setLead` (`:457`). |
| **Action** | Frontend: implement `getTeam` on `clientsApi.listMembers`. Backend: nothing. |

### 2.5 Eligible-member picker — live branch is unreachable  |  SEVERITY: MEDIUM

| | |
|---|---|
| **Backend (ready)** | `GET /super-admin/companies/:id` returns `members[]` (`super-admin-companies.service.ts:128–136`); `GET /team/members` also available |
| **Frontend** | `clients/data/api-provider.ts:371–399`: `listEligibleMembers()` **returns `fallback.listEligibleMembers(...)` first**; the live `GET /super-admin/companies/:id` branch only runs if the mock *throws*, so it is dead in practice. Used by the "assign member" flow in `client-team.tsx`. |
| **Action** | Frontend: invert the try/fallback order so the API is the primary source. Backend: nothing. |

### 2.6 Member profile update — route built, no UI caller  |  SEVERITY: LOW

| | |
|---|---|
| **Backend (ready)** | `PATCH /team/members/:membershipId/profile` (`team/team.controller.ts`) — B3 |
| **Frontend** | `admin/team/live/team-api.ts:65 updateMemberProfile()` defined, **only referenced from tests**. No team/settings screen edits job title / department / phone. |
| **Action** | Frontend: surface it in `/admin/team/[memberId]` or Settings → Profile. Backend: nothing. |

### 2.7 Settings save path (non-organization sections) — partial  |  SEVERITY: MEDIUM

| | |
|---|---|
| **Backend (ready)** | `GET/PUT/DELETE /settings/branding[/:purpose]` and `GET/PATCH /settings/organization` |
| **Frontend** | Branding is wired (`branding-section.tsx:29`, `organization-section.tsx:19`). Organization is **not** (2.2). The remaining sections (workspace, security, preferences, activity) have **no backend route** → correctly out of scope here, but `saveSettings()` still hard-throws for all of them, so *any* settings save in API mode fails as one blob. |
| **Action** | Frontend: split `saveSettings` per section — persist organization via `organizationApi`, branding via `brandingApi`, leave the rest explicitly "not connected" instead of throwing. |

### 2.8 Super Admin dashboard — silent mock fallback  |  SEVERITY: MEDIUM (frontend-only fix)

| | |
|---|---|
| **Backend (ready)** | `GET /super-admin/jobs/stats` only (no dashboard/snapshot endpoint exists) |
| **Frontend** | `dashboard/services/dashboard-service.ts:88,94` — jobs metric `isLive: true`, every other tile `isLive: false` from `DASHBOARD_SNAPSHOT`, with **no visible "demo data" label**. This is Sompal's Task 1 in `sompal-next-instructions-draft.md` and is still open. |
| **Action** | Frontend only: label demo tiles / show error + Retry on API failure. No new backend route required for this fix (a real dashboard endpoint would be a *new* backend task — see 3.x). |

**Section 2 total: 8 gaps, all unblocked — backend code is implemented, synced to dev (23 migrations) and none of them require new backend work.**

---

## 3. Reverse gaps — frontend feature present, backend route MISSING
*(backend engineer's queue; frontend must keep these disabled/labelled, never simulated)*

| # | Frontend caller | Path called | Backend status |
|---|---|---|---|
| 3.1 | `auth-service.ts:145` (`/forgot-password` page) | `POST /auth/forgot-password` | **No route.** Password reset was never built. |
| 3.2 | `companies/services/company-service.ts:20,28` → `use-companies` (`global-search.tsx`, `users-view.tsx`, `access-security-page.tsx`) | `GET /companies`, `GET /companies/refs` | **No route.** No "my memberships" endpoint; company context currently comes from `GET /users/me` memberships + `/clients`. |
| 3.3 | `notifications/services/notification-service.ts:12,21,28` → topbar `notifications-menu.tsx` | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` | **No route.** Notifications module has workers only, zero HTTP routes. |
| 3.4 | `system-health/services/system-health-service.ts:8` → `operations-center.tsx`, `health-provider.tsx` | `GET /system-health` | **No route** (only `/health` + `/health/error` exist). |
| 3.5 | `services/admin/reports.service.ts:6` → `admin/reports/hooks/use-reports.ts:9` | `GET /reports/dashboard` | **No route** (TASK-15/14 reports not started). |
| 3.6 | `users/services/user-service.ts:12,19,25` (no UI importer today) | `GET /users`, `GET /users/:id`, `PATCH /users/:id/status` | **No route** — TASK-16 Global Users not started. |
| 3.7 | Repository `*_MOCK_MODE` / `unavailable-provider` features: roles, audit-logs, feature-flags, global-settings, plans, subscriptions, billing, usage-limits, webhooks, api-monitoring, support, CRM, automation, SEO, CMS/website, internal-team, per-channel consoles (X, YouTube, GBP, Meta ads, WhatsApp, LinkedIn), calendar/publishing-by-channel | *(no apiClient call)* | **No routes.** In API mode these already flip to an explicit "not connected" provider (good) — **except** the six hard-coded `*_MOCK_MODE = true` features (`automation`, `roles`, `google-business`, `youtube`, `internal-team`, `users`) which keep showing fake data in live mode and must be relabelled. |
| 3.8 | Team invitations admin (`admin/team/invitations`) | *(no apiClient call for list/resend/revoke)* | **No route**: no list-invitations, resend, revoke, or invite-edit endpoint. Owner-invitation resend exists (`POST /super-admin/companies/:id/owner-invitation/resend`) and is wired. |

---

## 4. Contract checks already verified clean (no action)

- Login body is `{email,password}` only — `rememberMe` correctly dropped (`auth-service.ts:43`).
- Company create sends `{name, ownerEmail}` + `Idempotency-Key` (`api-provider.ts:267–275`) and reads `ownerOnboarding` (`:160`).
- Client create maps `leadUserId→leadMembershipId`, `memberIds→membershipIds` with legacy aliases tolerated (`api-provider.ts:272–296`).
- Campaign payload uses `campaignType`, `biddingStrategy`, machine channel codes, numeric KPI/age, `targetRoas` as string — **all B1 follow-ups from `current-project-state.md:1080,1087` are already implemented in `campaign-mapper.ts`**.
- Content/campaign/scheduling clients all send `x-company-id` + `x-client-id` (`drafts-api.ts:116`, `scheduling-api.ts:144`, `campaigns-api.ts:137`).
- Profile is read from `GET /users/me`, not `GET /auth/me` (which returns `{userId}` only).
- Session: HttpOnly cookie + `credentials:"include"`, no custom auth header, no `:4000` direct calls (Next rewrite).

## 5. Doc corrections this report triggers (stale handoff notes)

1. `sompal-next-instructions-draft.md` "blocked" list is **stale**: TASK-11B scheduling, IMAGE-01 logo/avatar, and TASK-10 resources/map are all in dev since 2026-09-25/26 (`current-project-state.md:983,996,1023,1048,1113`).
2. `sompal-next-instructions-draft.md:19` still says POST to `/companies/:companyId/invitations/accept` — real route is public `POST /api/v1/invitations/accept` (+ `validate`/`finalize`).
3. `frontend-integration-api-handoff-for-sompal.md:57` "no platform-wide Clients API" is outdated — `GET /super-admin/clients` exists and is wired.
4. `frontend-handoff-after-backend-alignment.md:5` "nothing exists on localhost:4000 yet" contradicted by `current-project-state.md:1113–1116` (master batch synced, 23 migrations, smoke 86/86).
5. Avatar UI (`current-project-state.md:1059`) is **done** — `user-avatar-api.ts` is wired in the topbar and preferences.

## 6. Verification method

- Enumerated all 77 `@Controller`/`@Get|@Post|@Put|@Patch|@Delete` handlers in `encodency_omni_backend/src` and read each controller (guards, path, params).
- Enumerated all 96 `apiClient.request` call sites in `encodency_omni/src`; for every candidate gap, grepped for importers of the client module to prove live vs dead code.
- No runtime/browser verification was performed in this pass; no code was modified.
