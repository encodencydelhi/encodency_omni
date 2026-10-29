# Meta Workspace Upgrade

## Design

- Compact coloured metric cards, about 80px for ordinary cards. Colour reinforces the metric; it does not imply a positive result.
- Five product tiles: Overview, Ads, Facebook, Instagram and Settings, each with its own colour and one-line purpose.
- A contextual page heading and icon for each Ads section, rather than the same generic title everywhere.
- Visible coloured section tabs on desktop; a compact section selector on mobile.
- Light blue/violet section headers, denser tables and consistent rounded controls. Detailed data tables scroll horizontally rather than squeeze metrics into unreadable columns.
- A short explanation on each page, with optional AI help. No persistent Agency/Client view switch in the main workspace.

## Data and actions

- Existing budgets are displayed in account-currency units and converted to minor units once when saving. Activation sends the already-confirmed minor-unit value unchanged. Inherited and lifetime budgets are not silently converted to daily budgets.
- Client reads and writes validate account ownership. Owner/admin setup lives in Meta Settings; Page and Instagram resource checks also run before cached detail responses are returned.
- An account can receive a workspace label while linking it to the selected client. The raw Meta name and full account ID remain available. Numeric provider names use `Ad Account · last four digits` as the display fallback; business names are not guessed.
- The live Analytics page requests a report for the selected account, period, campaign, ad set, platform and breakdown. It does not use the demo's fixed percentage distributions. Unsupported provider combinations show an unavailable state.
- Account-level reach comes from account-level insights instead of summing overlapping campaign reach. The performance state preserves upstream insight failures separately from a valid zero-delivery result.
- Leads are filtered against the selected ad account, Today uses that account's timezone, and loading/error/partial states are shown. Raw leads and attributed advertising conversions remain distinct.
- CSV exports download the loaded, filtered rows. Spreadsheet formula prefixes in text are escaped. Provider fetch caps are disclosed; exports do not claim a complete historical archive.
- Lead follow-up actions hand off to a persistent CRM record. Imports validate the client/account result and use deterministic CRM IDs to reuse an existing record. CRM's audit, automation and webhook transaction is reused; ownership, notes and stages stay in CRM.
- Audience/creative and other unsupported management operations open Meta's editor where wired, with explicit `In Meta` labels, instead of claiming local save success. A complete native audience or creative builder is a separate integration, not something this upgrade claims to implement.

## Useful AI assistance

| Area | Useful assistance | Required boundary |
|---|---|---|
| Overview / Analytics | Explain spend, CTR, CPL and changes; propose checks | Use supplied account/period and availability; do not invent missing metrics |
| Campaigns / Ad sets | Compare results and suggest controlled tests | Suggestions only; no automatic activation or budget changes |
| Ads / Creative | Draft copy variants and test ideas | User reviews claims, copy and brand suitability before publishing |
| Forms | Suggest clear questions and reduce unnecessary fields | Do not claim an unmeasured conversion uplift |
| Leads | Explain follow-up process and summarize an authorized CRM record | No bulk lead contact details are attached to the Meta AI shortcut |
| Issues / Settings | Explain reported errors, missing scopes and linking steps | State what is verified and what still needs provider-side confirmation |
| Facebook / Instagram | Suggest content plans and post/reel ideas | Distinguish content advice from actual account insights |

`AI Help` opens the existing assistant with a reviewable draft question. On Ads pages it can include a small aggregate snapshot and availability metadata. It does not submit the question automatically, publish content or perform a Meta mutation.

## Verification

The visual QA script uses synthetic responses in an isolated Chrome context. It blocks external requests and does not use a real session. Preview images are layout evidence, not live account verification.

Real provider mutation acceptance, customer App Review approval and production permissions require separate verification. No live campaign, budget or account assignment was changed during implementation.
