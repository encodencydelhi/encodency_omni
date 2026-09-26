# Company Creation — Form vs Payload Mismatch Report

**Date:** 2026-09-26
**Scope:** `CreateCompanyWizard` (and CSV import dialog) → `POST /api/v1/super-admin/companies`
**Sources:** `encodency_omni/src/features/companies/components/company-create-wizard.tsx`, `.../data/api-provider.ts`, `.../data/types.ts`; `encodency_omni_backend/src/super-admin-companies/dto/create-super-admin-company.dto.ts`, `src/organization/dto/update-organization.dto.ts`, `src/tenancy/tenant-context.guard.ts`

---

## 1. One-line verdict

The wizard collects **25 field-groups across 5 steps**; the API provider sends **exactly 2 of them (`name`, `ownerEmail`)**. The other ~23 are **silently dropped — never transmitted, never persisted, anywhere.** Sending them as-is would return **400** (`forbidNonWhitelisted`).

---

## 2. What is actually on the wire

`features/companies/data/api-provider.ts:259–279`

```ts
POST /api/v1/super-admin/companies
Headers: Idempotency-Key: <uuid>
Body:    { "name": "...", "ownerEmail": "..." }      // nothing else
```

Backend DTO (`create-super-admin-company.dto.ts`) declares **only** `name` + `ownerEmail`, and its own comment states the profile/logo/owner-name are *"NOT part of this contract; unknown fields are rejected (400)"*. Global pipe: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` (`configure-app.ts:38`).

**So: wire payload ↔ backend DTO = perfect match. The mismatch is Form ↔ Wire.**

Logo is the one extra field handled correctly — uploaded *after* create via `PUT /super-admin/companies/:companyId/logo` (`company-create-wizard.tsx:341` → `branding-api.ts:181`).

---

## 3. Field-by-field diff (form → payload)

### Step 1 — Company  (`WizardForm`, `company-create-wizard.tsx:48–60`)

| # | Form field | Sent? | Destination today | Backend ready? |
|---|---|---|---|---|
| 1 | `name` | ✅ | `body.name` | ✅ |
| 2 | `logo` (local data-URL → file) | ✅ | separate `PUT …/logo` after create | ✅ |
| 3 | `legalName` | ❌ dropped | nowhere | ⚠️ `PATCH /settings/organization.legalName` exists, but see §5 |
| 4 | `website` | ❌ dropped | nowhere | ⚠️ org route (same blocker) |
| 5 | `industry` (default `"Marketing Agency"`) | ❌ dropped | nowhere | ⚠️ org route (same blocker) |
| 6 | `country` (`"India"`) | ❌ dropped | nowhere | ⚠️ org route expects **ISO-3166 alpha-2 `IN`**, value mismatch too |
| 7 | `companySize` | ❌ dropped | nowhere | ❌ **no backend field at all** |
| 8 | `contactEmail` | ❌ dropped | nowhere | ⚠️ org route (same blocker) |
| 9 | `contactPhone` | ❌ dropped | nowhere | ⚠️ org route, must be **E.164** |

### Step 2 — Owner (`:61–65`)

| # | Form field | Sent? | Backend note |
|---|---|---|---|
| 10 | `owner.email` | ✅ | `body.ownerEmail` |
| 11 | `owner.name` | ❌ dropped | **Explicitly rejected**: DTO comment says owner `name` arrives with B3; handoff doc records 400 if sent at create |
| 12 | `owner.phone` | ❌ dropped | same — 400 if sent; can only be set later via `PATCH /team/members/:id/profile` after the owner accepts |
| 13 | `owner.existingUserId` | ❌ dropped | same — 400 if sent; no "attach existing account" backend flow exists yet |

### Step 3 — Subscription (`:66–76`)

| # | Form field | Sent? | Backend ready? |
|---|---|---|---|
| 14 | `planTier` (default `growth`) | ❌ dropped | ❌ no plan/subscription API (TASK-12/13 not built) |
| 15 | `billingCycle` | ❌ dropped | ❌ |
| 16 | `mode` trial/paid | ❌ dropped | ❌ |
| 17 | `startDate` | ❌ dropped | ❌ |
| 18 | `trialEndsAt` | ❌ dropped | ❌ |
| 19 | `limitOverride` (resource/limit/expiry/reason) | ❌ dropped | ❌ |
| 20 | `internalNotes` | ❌ dropped | ❌ no notes API |

### Step 4 — Workspace + initial client (`:77–84`)

| # | Form field | Sent? | Backend ready? |
|---|---|---|---|
| 21 | `timezone` | ❌ dropped | ⚠️ `PATCH /settings/organization.timezone` (IANA) — blocked by §5 |
| 22 | `currency` | ❌ dropped | ⚠️ same route (ISO code, `INR` ok) |
| 23 | `language` (label `"English"`) | ❌ dropped | ❌ **`UpdateOrganizationDto` has no `language` field at all**; even if it did, frontend holds a label not a code |
| 24 | `region` (`"India (Mumbai)"`) | ❌ dropped | ❌ no backend field |
| 25 | `initialClient {name, websiteUrl}` | ❌ dropped | ⚠️ `POST /clients` exists — blocked by §5 |

**Totals: 3 sent (name, logo, ownerEmail) / 25 collected. 22 dropped.**

The CSV import dialog has the same problem: `company-import-dialog.tsx:110–121` builds a full `CreateCompanyInput` (name, website, industry, country, owner name/email, plan, workspace) → same 2-field wire payload.

---

## 4. What the Review step promises vs what is stored

The Review panel renders all of it as if it will be saved (`company-create-wizard.tsx:888–921`): Legal name, Website, Industry, Country, Contact, Plan, Billing cycle, Price, Trial, Limit override, Timezone, Currency, Language, Region, Initial client.

Then `SuccessView` says (`:931–933`):

> "Company created in **demo workspace** … **No real tenant was provisioned and no email was sent.**"

In live mode this copy is **factually wrong**: a real Company row is created and a real OWNER invitation is queued (`ownerOnboarding.emailQueued`). Same wrong copy in the import toast ("imported into the demo workspace", `:129`).

---

## 5. Why the extra fields cannot simply be appended to the payload

1. **400 from the pipe** — `forbidNonWhitelisted` rejects anything outside `name`/`ownerEmail`.
2. **No super-admin bypass on the profile route** — `PATCH /settings/organization` is `@CompanyContextRoute`; `tenant-context.guard.ts:68–84` requires a real `companyMembership` row for `x-company-id`, and the controller comment states *"a platform Super Admin has no bypass here"*. The platform super admin who just created the company **is not a member of it**, so they cannot persist profile fields on the new tenant either.
3. **Same for `POST /clients`** (initial client) and for `PUT/POST/DELETE` branding of a company they don't belong to (the logo route works only because `super-admin/companies/:id/logo` is platform-scoped).
4. **No backend at all** for: `companySize`, `language`, `region`, plan/subscription/trial/override, internal notes, owner name/phone/existing-user link at create time.

---

## 6. Response-side mismatches (payload is only half the problem)

`toCompanySummary()` (`api-provider.ts:114–164`) fabricates what the backend does not return:

| Shown in UI after create | Actual source |
|---|---|
| `profile.legalName/website = null`, `industry = ""`, `country = ""`, `timezone = "Asia/Kolkata"`, `currency = "INR"`, `language = "English"`, `region = ""` | hardcoded defaults — the values the user just typed are **not** in the response (and never saved) |
| `plan: { tier: "starter", name: "Starter", billingCycle: "monthly" }` | hardcoded → user picked **Growth** in step 3, list/detail shows **Starter** |
| `subscriptionStatus: "active"`, `billingStatus: "no_payment_method"`, `mrrMinor: 0` | hardcoded |
| `usage: { level: "not_metered" }`, `health: "not_assessed"`, `lastActiveAt = createdAt` | hardcoded (documented as deliberate) |

Also: `createApiCompaniesProvider` spreads `...fallback` (`api-provider.ts:189`), so **`updateCompany`, `changePlan`, archive, notes, and every other company mutation still run against the mock dataset in live mode** — the company edit drawer (`company-edit-drawer.tsx:165`) saves nothing real either.

---

## 7. Actions

### For the backend engineer (decide / build)

| # | Item | Why |
|---|---|---|
| B1 | Decide the company-create contract: either (a) extend `CreateSuperAdminCompanyDto` with the org-profile fields the wizard already collects (`legalName`, `industry`, `website`, `contactEmail`, `contactPhone`, `timezone`, `currency`, `address.country`) and persist them in the same transaction, or (b) document explicitly that only `name`+`ownerEmail` are create-time and give the platform super admin an organization write path. | Today there is **no path at all**: `PATCH /settings/organization` denies super admins. |
| B2 | Add `language`, `region`/`companySize` to the organization contract **or** confirm they are dropped product-wide so the frontend can remove the fields. | Two wizard fields have no home in the schema. |
| B3 | Decide the fate of the Subscription step (plan/trial/limit-override/notes): TASK-12/13. | 7 fields, zero backend. |
| B4 | Decide `initialClient` at create: either allow the creating super admin to seed a client, or drop the field. | `POST /clients` is membership-gated. |
| B5 | Owner name/phone/existing-user link: confirm they stay post-acceptance (B3 `PATCH /team/members/:id/profile`). | Currently 400 if sent at create. |

### For the frontend engineer (no backend needed)

| # | Item |
|---|---|
| F1 | Stop advertising what isn't saved: mark the Subscription/Workspace steps as "not persisted yet" or hide them until B2/B3 land; fix the Review list accordingly. |
| F2 | Fix `SuccessView` + import toast copy (`company-create-wizard.tsx:858, 931–933`, `company-import-dialog.tsx:129`) — in API mode a real tenant **is** provisioned and an invitation email **is** queued. |
| F3 | Stop hardcoding `plan: starter` and the profile defaults in `toCompanySummary` — surface them as "not set" instead of wrong values. |
| F4 | Country: convert to ISO alpha-2 before any org payload; language: send a code (`en`), not the label `English`. |
| F5 | Make `company-import-dialog` honest about which CSV columns survive (only `name` + `owneremail` do today). |

---

## 8. Verification

Static code review only — no request was executed. Payload shape read from `api-provider.ts:272–275`; DTO whitelist from `create-super-admin-company.dto.ts` + `configure-app.ts:38`; membership gate from `tenant-context.guard.ts:68–84`.

---

## 9. Architectural Decision & Frontend Implementation (2026-09-26)

**Decision Confirmed by Owner:**
1. **Company Creation DTO:** Backend contract intentionally remains `{ name, ownerEmail }`. It will **not** be expanded with organization-profile fields.
2. **Follow Option B:**
   - **Step 1:** `POST /api/v1/super-admin/companies` with `{ name, ownerEmail }` + `Idempotency-Key`.
   - **Step 2:** In the returned real Company context, use `GET` and `PATCH /api/v1/settings/organization` to populate `legalName`, `industry`, `website`, `contactPhone`, `taxId`, `address`, etc.
3. **Other Gaps Status:**
   - Team invitation list/resend/revoke → Backend follow-up task.
   - Global User mutations → Intentionally deferred until after TASK-17 / lifecycle rules.
   - Forgot/reset password → Backend auth follow-up task.
   - Notifications → Separate backend module.
   - Client channel overview → Integrations follow-up endpoint.
   - Campaign live metrics/performance → Later analytics/provider-sync phase.
   - TASK-17 Audit Logs is currently in release pipeline.
   - Existing integrated contracts must not be changed; missing routes keep mocks/fallbacks cleanly isolated.
