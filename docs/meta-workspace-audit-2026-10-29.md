# Meta / Ads Workspace Audit — 29 October 2026

Scope: all 17 supplied `/admin/meta` routes. This is an implementation and operational-data audit, not an authenticated visual browser audit. No campaigns, budgets, ads, permissions, connections or mappings were changed. No Meta publishing or spending action was attempted.

Evidence: frontend/backend source; local database metadata; the backend's existing Redis response cache; HTTP route checks; existing focused tests. Cached provider responses are observations from the most recent successful fetch, not fresh provider calls made by this audit. Access-tier approval in the Meta App Dashboard was not available.

## 1. Current access and actual data

The local frontend configuration selects `NEXT_PUBLIC_DATA_SOURCE=api`; these Ads pages use the live API data provider. Live loading failures do not fall back to the demo dataset.

One active Meta connection exists for Encodency Pvt. Ltd. Stored token expiry: 28 December 2026. A provider profile cached on 29 October at approximately 14:04 IST reports a valid token. This does not prove the token will remain valid until its nominal expiry.

Granted scopes in both stored connection metadata and cached Meta permission results:

- `ads_read`, `ads_management`
- `leads_retrieval`, `pages_manage_ads`
- `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- `instagram_basic`, `instagram_content_publish`
- `business_management`, `public_profile`

No declined or expired scopes were recorded. These are permissions granted to this connection, not proof of Advanced Access/App Review approval for arbitrary customers.

### Ad accounts

| Account | Cached status | What is confirmed |
|---|---|---|
| `act_654829923522750` | ACTIVE | Main account with campaigns, ad sets and ads |
| Vruum Rides (`act_2165554370493574`) | ACTIVE | No campaigns in cached overview |
| `act_311589866` | CLOSED | Historical data readable; backend rejects writes to unusable accounts |

Cached main-account 30-day snapshot at approximately 14:05 IST:

| Dataset | Count | Backend state |
|---|---:|---|
| Campaigns | 190 | live |
| Ad sets | 208 | live |
| Ads | 411 | live |
| Creatives | 200 | live; exactly at the configured library cap |
| Audiences | 36 | live |
| Instant forms | 2 | live |
| Pixels | 3 | live |
| Facebook Pages/assets | 2 | live |
| Daily trend | 0 | empty |
| Account activity | 0 | empty |

The snapshot has zero spend/impressions/clicks/leads for the selected last-30-days reporting period. The cached lifetime overview across accounts has INR 848,991.40 spend and 1,478 attributed leads. Lifetime attributed leads are not the same dataset as downloadable lead contact records. The cached leads endpoint returned zero records; both visible forms report zero submissions.

The newest campaign creation/edit dates in the main snapshot are 2 April 2026. An empty recent reporting period is therefore plausible, but zero totals alone cannot distinguish absent delivery from an insights failure because of finding F4.

The lifetime overview reports 26 configured-active campaigns; the snapshot maps those to completed because their end dates have passed. The remaining 164 campaigns are paused. UI should distinguish configured status from actual delivery status rather than present the counts as equivalent.

### Social assets

Cached Facebook Pages: **Vruum Partner**, **Vruum Cab**. Linked Instagram usernames: **@vruumpartner**, **@vruum.cab**.

Both Pages report `MANAGE`, `CREATE_CONTENT`, `MODERATE`, `MESSAGING`, `ADVERTISE`, `ANALYZE`, `MANAGE_LEADS` tasks. These Page tasks are not equivalent to the app having all messaging/moderation API permissions implemented.

Existing cache contains 25 published posts for Vruum Partner and 17 media entries for @vruumpartner. Those counts describe cached pages, not complete lifetime totals.

**No client-resource mappings exist for the Meta connection.** Reading managed social assets works, but client publishing requires selecting and linking the appropriate Facebook/Instagram resources. No Meta Ads create-idempotency records exist; do not infer successful production writes from the presence of write endpoints.

## 2. Page-by-page coverage

| Route | Currently implemented | Limitation / improvement |
|---|---|---|
| `/admin/meta` | Connection hub, lifetime ad totals, Page/Instagram counts, permissions and attention items | Company-wide totals; distinguish lifetime vs selected-period figures and configured-active vs delivering campaigns |
| `/admin/meta/ads` | Account/range selection, spend, impressions, reach, clicks, leads, campaign overview and trends | Incomplete-data visibility, unique reach and inconsistent create CTA |
| `/admin/meta/ads/campaigns` | Listing, filters, budgets, results, detail links, real pause/activation calls, create/edit navigation | Budget-unit defects; duplicate/archive/export and bulk actions are not implemented end to end |
| `/admin/meta/ads/adsets` | Campaign hierarchy, targeting, locations, budget, status and metrics | Same budget defects; placement metrics are not fetched; demo-style actions remain |
| `/admin/meta/ads/ads` | Ads, creative/identity details, metrics, status changes and editing names | Existing-creative create path only; duplicate/archive/export are unsupported |
| `/admin/meta/ads/forms` | Page-owned instant forms, questions, privacy URL and submissions | Forms are discovered across managed Pages, not filtered to selected ad account; create/duplicate/archive/export unavailable; completion/qualification unavailable |
| `/admin/meta/ads/leads` | Retrieved form contact records and campaign/ad/form associations | Account scope, fixed date, missing load/error/partial states; assignment/stage/score need CRM persistence |
| `/admin/meta/ads/audiences` | Saved/custom/lookalike audiences, approximate sizes, ad-set usage | Audience builder/edit/duplicate/archive/resync actions do not call a backend mutation |
| `/admin/meta/ads/creative` | Existing creative library, previews, usage and derived performance | 200-row cap without a completion indicator; upload/edit/duplicate/archive/download are not wired |
| `/admin/meta/ads/analytics` | Period totals, top campaigns, objective mix, daily trends and measured funnel steps | Hardcoded breakdown distributions, filter inconsistencies, missing placement/quality data |
| `/admin/meta/ads/issues` | Derived delivery/policy/account/permission/pixel issues and links to Meta | Derived current checks, not a persistent incident/resolution history |
| `/admin/meta/ads/activity` | Meta ad-account activities with filters and entity links | Bounded latest feed, not complete application audit history; export unavailable; date range not applied to activity retrieval |
| `/admin/meta/ads/assets` | Ad account, Pages, Instagram assets, pixels and scope visibility | Asset linking and company/client ownership need clearer separation |
| `/admin/meta/ads/help` | Static help articles, category search and locally remembered reading history | Contact Support does not create a support ticket; unsupported-action toast is used |
| `/admin/meta/facebook` | Managed Page switcher, profile/followers, published posts and engagement, scheduled posts, client linking | No full inbox/comment-management workflow; current connection has no linked client resources |
| `/admin/meta/instagram` | Professional profile, followers, posts/reels, media engagement, scheduled posts and client linking | No account insights API integration, inbox or comment moderation; current connection has no linked client resources |
| `/admin/meta/settings` | Connection identity/health, permissions, reconnect/disconnect, resource linking | Separate scope granted, Page/account role, client mapping and App Review status |

## 3. Findings, ordered by priority

### F1 — HIGH: Editing can multiply a budget by 100

Evidence: `src/features/admin/meta-ads/live/meta-ads-mappers.ts:35` converts API budgets into minor units. `components/live-write-editor.tsx:41–43` loads that minor-unit value into an input labelled account-currency units. Line 61 multiplies it by 100 again on submit.

Example: a real INR 500 budget becomes view-model `50000`; the edit input shows `50000`; saving sends `5000000` minor units, equivalent to INR 50,000. An unchanged budget can therefore become 100 times larger. For existing active entities, budget updates are real writes.

Repair: explicitly name and type minor/major units; divide by 100 when populating the input; only convert once on submit; show old/new account-currency budget and confirm increases; add create/edit round-trip tests. Also distinguish campaign-owned aggregate display budgets from editable campaign budget fields.

### F2 — HIGH: Activation confirmation also multiplies minor units again

Evidence: list/detail callers pass view-model budgets into `live/meta-ads-writes.ts`; line 30 displays them as major units, and line 38 multiplies by 100. Backend `meta-ads-write.service.ts:203` compares the resulting confirmation against the real daily budget in minor units and rejects mismatches.

Impact: activation can fail with `daily_budget_confirmation_mismatch`; displayed confirmation is incorrect. The server comparison is a useful protection and should remain.

Repair: pass a clearly typed `dailyBudgetMinor`, format it for display, send it unchanged, and derive budget ownership from the actual campaign/ad-set hierarchy. Lifetime-budget entities should not be presented as daily-budget activation paths.

### F3 — HIGH: Analytics shows synthetic breakdowns in live mode

Evidence: `src/app/admin/meta/ads/analytics/page.tsx:89` defines fixed shares for platform, placement, device, age, gender and location. Lines 565–566 multiply real totals by those shares. This path is not guarded by `!LIVE`. No corresponding breakdown query exists in the backend snapshot.

Impact: with nonzero delivery, users can see fabricated segment spend/leads and CPL presented as reporting. It does not appear on the current zero-delivery snapshot, but the live-mode branch permits it.

Repair: remove live distributions until real Insights breakdown endpoints exist. Never distribute totals by assumed percentages; use unavailable-state copy instead.

### F4 — HIGH: Failed insights can be displayed as real zero performance

Evidence: backend `meta-ads.service.ts:342–364` loads entity rows and performance insights as separate datasets. Campaign/ad-set/ad dataset state is built from the entity-list state, while failed insight lookups become `ZERO_METRICS` through `metricsOf`. The insight failure state is not propagated into the returned metrics state. Frontend dataset and lead states are largely not consumed by the list pages.

Impact: a permissions/rate-limit failure may look like successful loading with no delivery. Do not interpret every zero as a confirmed business result.

Repair: expose entity availability and performance availability separately; preserve `unknown` metrics; show per-section failure/retry states; do not overwrite the last complete snapshot with silently incomplete insight results.

### F5 — HIGH for client-isolated workspaces: Current Meta reads are company-wide

Evidence: Ads controller uses optional client context; Ads context queries only company/provider/status. Ads frontend query keys use company/account/period, not client. Social context also reads all Pages this company connection manages. Current-client mapping is used for publishing selection, not to restrict these managed-asset lists. Schema has Facebook/Instagram mappings but no ad-account mapping resource type.

Impact: selecting Bharat Organic as a client does not itself restrict Ads results to Bharat Organic. Company-wide browsing may be intentional for agency owners, but the scope must be explicit. This audit did not authenticate as a restricted user and does not claim a demonstrated cross-company breach.

Repair: decide which roles may browse company assets; label that mode; add client-to-ad-account assignment and enforce it in backend reads/writes for restricted roles. Test unauthorized account IDs and client switches.

### F6 — MEDIUM: Lead/form scope, date and completeness are misleading

Evidence: `data-source.tsx` changes the leads query key with `accountId`, but API `leads()` sends no account ID. Backend `loadLeads()` iterates forms across all managed Pages; at most 25 forms and one page of up to 100 leads per form are read. Frontend ignores returned `partial`, and the Leads page does not consume `leadsState`. `leads/page.tsx:156` counts New Today using hardcoded `2026-09-14`.

Impact: account switches may display unrelated leads/forms; failed/loading reads can look empty; recent-lead counts are wrong; older records can be omitted without disclosure. Date-range selection does not scope the raw lead retrieval.

Repair: scope form/lead queries by selected account and authorized client; persist paginated lead sync; show partial/loaded counts and failures; use the selected account timezone for Today; connect assignment/stages/notes to CRM before exposing operational CRM controls.

### F7 — MEDIUM: Analytics filters do not consistently scope every visualization

Evidence: campaign/platform filters choose whole campaigns; totals are still campaign totals. An ad-set filter affects placement rows, not headline totals. `<PerformanceTrend height={250} />` receives no filtered data and uses account-wide `trendSeries`. Objective dropdown values such as `Lead Generation` do not match normalized Meta values such as `Outcome Leads`. Placement rows have zero spend/leads in the mapper because no placement insights were fetched.

Repair: one explicit reporting query scope; fetch actual campaign/ad-set/platform insight breakdowns; bind chart and KPI requests to that same scope; normalize objective identifiers independently of display labels.

### F8 — MEDIUM: Unique reach is incorrectly summed

Evidence: backend `sumMetrics()` adds reach across campaigns, and snapshot totals use campaign sums. The frontend repeats sums for campaign groups and creative rollups.

Impact: one person reached by multiple campaigns/ads can be counted repeatedly; the resulting value is not account-level deduplicated reach. Frequency derived from it is also affected.

Repair: request account-level reach and aggregate-period insights at the correct reporting grain; do not sum a unique audience metric across overlapping groups.

### F9 — MEDIUM: Write capabilities and UI messages disagree

Real backend writes exist for creating paused campaigns/ad sets/ads, editing names/daily budgets and changing status. The live create route mounts `LiveMetaAdsWriteEditor`. However, `components/workspace.tsx:422` still tells users campaign creation is unavailable. `ReadOnlyNotice` broadly says changing items is not connected, and Ads `toast.ts` converts demo-style success/warning actions into an unsupported notice.

Impact: users cannot reliably tell supported operations from placeholders. Duplicate/archive/export, audience creation, creative upload and support contact remain clickable but do not complete the advertised action. The wrapper prevents most of these from falsely claiming live success; this is an unfinished workflow, not necessarily a successful mutation with missing persistence.

Repair: use explicit per-action capabilities and reasons; wire working create links; hide or disable unsupported actions; remove the generic toast interception as real features replace placeholders.

### F10 — MEDIUM: Dataset limits are not disclosed

Creatives stop at four 50-row pages; ad sets and ads at ten 50-row pages; general collections are bounded; activity reads one 100-row page. Current creative count is exactly 200. This does not prove additional creatives exist, but completeness is not established.

Repair: return `hasMore`, cursor and loaded/total indicators; load on demand; use separate datasets per tab rather than loading the entire expensive snapshot everywhere. UI pagination over downloaded arrays is not provider pagination.

### F11 — MEDIUM: CRM quality, insight and operational promises exceed implementation

Lead mapper sets all live leads to `New`, no owner, score zero, empty notes/tasks. Live mode hides several unavailable KPIs, which is good; Analytics still renders Lead Quality based on nonexistent form-qualified values. Social pages show Page-task labels but do not implement a full inbox/moderation workflow. Instagram account insights permissions/endpoints are not present in the reviewed scope catalogue/social controller.

Repair: clearly distinguish reported data, derived metrics and unavailable CRM/insight fields; persist CRM states before showing quality or conversion outcomes; add genuinely supported Page/Instagram insights as a separate phase.

### F12 — LOW/MEDIUM: Operational status needs more precise language

Configured-active vs completed-by-schedule campaign counts differ between hub and list. Activity rows are normalized with source `Ads Manager`, so the UI cannot establish that every action originated there. A stale snapshot banner attributes old data to rate limits even though the cache can also reuse a prior complete copy for degraded reads. Some fallback labels still use demo business names.

Repair: expose configured/effective/delivery status separately; label activity origin only when known; provide actual stale reasons; remove customer-specific fallback names.

## 4. What to improve next

1. **Correctness first:** fix F1/F2, remove fabricated live breakdowns, add unknown/partial metric states. Preserve server-side budget checks. Add focused integration tests before enabling general spend-changing workflows.
2. **Client/account ownership:** link the two existing Pages and Instagram accounts to the correct client; add account assignment and role-enforced client isolation. Show selected company/client/ad account/timezone prominently.
3. **Useful daily workflows:** working create/edit links, honest disabled-action reasons, real CSV download, persisted lead assignment/notes/stages and full form/lead pagination.
4. **Reporting:** custom/historical dates, real prior-period comparison, account-level unique reach, consistent filters and genuine demographic/platform/placement breakdowns. Last 7/30/90 days alone is poor for the current older campaign history.
5. **Efficiency:** fetch tab-specific datasets, maintain cache freshness/completeness metadata and rate-limit backoff, show exactly what is stale or unavailable. The existing cache and request sharing are useful foundations.
6. **Expansion:** production App Review/Advanced Access verification, then social insights, inbox/moderation and richer creative/audience operations as genuinely implemented capabilities.

For managing external customers' ad accounts, validate Advanced Access for `ads_read`/`ads_management` in the Meta App Dashboard. Current granted scopes do not establish this. Meta's published Marketing API collection describes the Standard vs Advanced distinction: https://www.postman.com/meta/facebook-marketing-api/collection/0zr4mes/facebook-marketing-api-mapi

## 5. Verification and limits

- All 17 supplied local routes returned HTTP 200. This establishes routing/response availability, not authenticated browser interaction or visual correctness.
- Existing backend suites: `meta-ads.spec.ts`, `meta-ads-write.spec.ts`, `meta-social.spec.ts`, `meta-read-cache.spec.ts`: **52 passed**.
- Existing frontend mapper suite: **11 passed**.
- A read-only arithmetic reproduction confirmed the 100x edit and activation-confirmation conversion defects. No provider mutation was performed.
- Existing tests passing does not cover the identified end-to-end UI unit, filter and completeness defects.
- Database and Redis reads selected metadata/aggregates only; no credentials, raw tokens or customer lead contact records are included in this report.
- Production App Review status, restricted-user authorization behavior, actual creation/publishing success and authenticated visual interaction remain unverified.

Application source was not changed by this audit; this report is the deliverable.
