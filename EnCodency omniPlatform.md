# EnCodency omniPlatform

## Omnichannel Digital Marketing SaaS — Product Requirements Document

---

## 1. Product Vision

**EnCodency omniPlatform** is a proprietary omnichannel digital marketing SaaS platform designed for agencies, organizations, and multi-brand companies.

The platform will allow a company to manage multiple Clients or brands from one centralized dashboard.

The product will have its own:

- SaaS dashboard
- Multi-organization system
- Multi-project management
- CRM
- SEO crawler
- SEO rules engine
- Content scheduler
- Omnichannel publisher
- Automation engine
- Analytics layer
- Reporting system
- AI insights layer
- Team and permission system
- Subscription and billing system

External platforms such as Meta, LinkedIn, Google, WhatsApp, and YouTube will be connected through their official authorized APIs.

The core product experience, data model, workflows, reporting, scoring logic, CRM, SEO engine, and dashboards will remain proprietary to EnCodency.

---

# 2. Core Objective

The main objective is to create a platform where a user can manage all major digital marketing activities from one place.

A company should be able to:

- Create multiple organizations or business units
- Create multiple Clients or brands
- Connect marketing channels to each project
- Publish content to multiple channels from one screen
- Schedule posts
- Manage social content
- Manage Google Business Profile
- Manage LinkedIn
- Manage WhatsApp campaigns
- Manage YouTube
- Monitor websites
- Run SEO audits
- Track leads
- Manage campaigns
- View combined analytics
- Generate reports
- Create automated workflows
- Receive AI-powered recommendations

---

# 3. SaaS Hierarchy

The system should follow this hierarchy:

```text
EnCodency omniPlatform
        ↓
Organization / Company
        ↓
Clients / Brands
        ↓
Connected Channels
        ↓
Campaigns / Content / Leads / Analytics
```

### Example

```text
Namo Gange Trust
│
└── Moksha Sewa
    ├── Meta
    ├── Instagram
    ├── LinkedIn
    ├── Google Business Profile
    ├── WhatsApp
    ├── YouTube
    ├── Website
    └── SEO
```

Another project can be added independently, for example:

```text
Bharat Organic
├── Meta
├── Instagram
├── LinkedIn
├── Google Business Profile
├── WhatsApp
├── YouTube
├── Website
└── SEO
```

The ownership relationship between organizations and Clients must be configurable.

No project should be hard-coded to any organization.

---

# 4. Multi-Tenant SaaS Architecture

The system should be built as a true multi-tenant SaaS.

Each organization must have isolated data.

```text
Organization A
├── Project A1
├── Project A2
└── Project A3

Organization B
├── Project B1
└── Project B2
```

Users from Organization A must never access Organization B data unless explicitly authorized.

Tenant isolation must exist at:

- Organization level
- Project level
- Channel level
- CRM level
- Analytics level
- Reporting level

---

# 5. Main Modules

The platform should contain the following primary modules.

## 5.1 Dashboard

The main dashboard should provide a high-level overview.

Example metrics:

```text
Total Clients
Total Leads
Total Campaigns
Total Ad Spend
Total Website Traffic
Social Reach
SEO Score
Google Reviews
WhatsApp Leads
YouTube Views
Conversions
```

The dashboard should support:

- Organization-level view
- Project-level view
- Channel-level view
- Date filters
- Comparison with previous periods
- Alerts
- Recommended actions

---

# 6. Omnichannel Publisher

This is one of the core features of the platform.

A user should be able to create content once and publish it across multiple supported channels.

```text
Create Content
      ↓
Select Clients
      ↓
Select Channels
      ↓
Customize Per Channel
      ↓
Preview
      ↓
Publish Now / Schedule
```

Supported targets should include:

- Facebook
- Instagram
- LinkedIn
- Google Business Profile
- WhatsApp
- YouTube
- Website

Possible content fields:

- Caption
- Title
- Description
- Images
- Video
- CTA
- Link
- Hashtags
- Location
- Campaign
- Publish date
- Publish time

The user should be able to:

- Use same content everywhere
- Customize content per platform
- Save as draft
- Schedule
- Publish immediately
- Duplicate
- Bulk publish
- Retry failed posts
- View publish logs

---

# 7. Channel Adapter Architecture

Every external channel should have its own adapter.

```text
Master Content
     ↓
Channel Formatter
     ↓
Platform Adapter
     ↓
Official Platform API
```

Example adapter interface:

```text
publishPost()
schedulePost()
deletePost()
getPosts()
getAnalytics()
getComments()
replyComment()
getLeads()
getCampaigns()
```

Adapters:

```text
MetaAdapter
LinkedInAdapter
GoogleBusinessAdapter
WhatsAppAdapter
YouTubeAdapter
WebsiteAdapter
```

This architecture will make it easy to add more platforms later.

---

# 8. Meta & Instagram Module

The platform should support authorized Meta integration.

Features may include, subject to API permissions:

- Facebook Page connection
- Instagram professional account connection
- Page details
- Posts
- Reels
- Media publishing
- Scheduling
- Comments
- Reactions
- Insights
- Lead Ads
- Campaign analytics
- Ad account connection
- Campaign monitoring
- Lead synchronization

### Lead Flow

```text
Meta Lead
   ↓
Webhook
   ↓
EnCodency CRM
   ↓
Automation
   ↓
WhatsApp / Assignment / Follow-up
```

---

# 9. LinkedIn Module

LinkedIn must be treated as a core channel.

Company users should be able to connect an authorized LinkedIn account using OAuth.

Supported features should be implemented according to the permissions granted by LinkedIn.

Possible capabilities include:

- Company Page connection
- Page information
- Company posts
- Content publishing
- Post scheduling
- Image/video publishing
- Comments
- Reactions
- Followers
- Page analytics
- Post analytics
- Campaign analytics
- Ad account integration
- Lead-related features where approved
- Admin role validation

The platform must not request LinkedIn passwords.

OAuth authorization should be used.

---

# 10. Google Business Profile Module

Features should include:

- Location connection
- Business information
- Posts
- Photos
- Reviews
- Review replies
- Performance metrics
- Profile health
- Location management
- Search keyword impressions where available

Example:

```text
Google Business Profile

Rating               4.7
Reviews               428
Unanswered Reviews     12
Calls                  184
Website Clicks         321
Direction Requests      84
```

AI-generated review replies can be supported, but publishing should still respect the user's permissions and approval rules.

---

# 11. WhatsApp Module

The platform should have its own WhatsApp management experience.

Features:

- Contacts
- Team inbox
- Templates
- Campaigns
- Broadcasts
- Automations
- Lead conversations
- Message status
- Assignment
- Analytics

Example workflow:

```text
New Lead
   ↓
Send WhatsApp Template
   ↓
Wait
   ↓
No Reply?
   ↓
Send Follow-up
   ↓
Assign Agent
```

The platform should connect to WhatsApp using authorized Meta/WhatsApp Business APIs.

---

# 12. YouTube Module

Features may include:

- Channel connection
- Channel information
- Video list
- Video upload
- Title
- Description
- Tags
- Playlist selection
- Visibility
- Scheduling
- Comments
- Analytics
- Views
- Watch time
- Subscriber metrics

The platform should also provide YouTube content optimization tools such as:

- AI title suggestions
- Description suggestions
- Hashtag suggestions
- Keyword suggestions
- Thumbnail ideas

---

# 13. Website Management

Each project should be able to add one or more websites.

Features:

- Website overview
- Page analytics
- Forms
- Leads
- SEO
- Performance
- Errors
- Conversions
- UTM tracking

If deeper editing is required, the website should connect using:

- CMS API
- Custom connector
- Plugin
- Secure API integration

---

# 14. Own Website Analytics

The platform may include its own website tracking system.

Example tracker:

```html
<script src="https://analytics.encodency.com/tracker.js"></script>
```

Possible events:

- Page views
- Sessions
- Referrer
- Device
- Browser
- Country
- UTM parameters
- Button clicks
- Form submissions
- Conversions

Architecture:

```text
Website Tracker
      ↓
Analytics API
      ↓
Event Queue
      ↓
Storage
      ↓
Analytics Dashboard
```

---

# 15. SEO Engine

The SEO system should be proprietary.

No SEMrush dependency is required.

## 15.1 SEO Crawler

The crawler should inspect websites and collect:

- URLs
- Status codes
- Meta titles
- Meta descriptions
- H1-H6
- Canonicals
- Robots directives
- Images
- Alt attributes
- Internal links
- External links
- Schema
- Open Graph tags
- Twitter cards
- Redirects
- Page size
- Response time
- Sitemap
- robots.txt

Suggested stack:

```text
HTTP Fetch
+
Cheerio
+
Playwright for JS-heavy pages
```

---

# 16. SEO Rules Engine

The system should maintain a configurable SEO rules database.

Example:

```text
RULE_001
Title Missing
Severity: Critical

RULE_002
Title Too Long
Severity: Warning

RULE_003
Meta Description Missing
Severity: High

RULE_004
Multiple H1
Severity: Warning

RULE_005
Broken Internal Link
Severity: Critical

RULE_006
Missing Canonical
Severity: High
```

The rules engine should produce:

- SEO Score
- Critical issues
- Warnings
- Passed checks
- Recommendations

---

# 17. Keyword Tracking

The platform should provide its own keyword tracking database.

Example:

```text
Keyword                 Position   Change
SEO Services Delhi          8        +6
Digital Marketing Agency    4        +2
Website Development        17        -3
```

Store historical records:

```text
keyword
project_id
date
position
url
country
device
```

Rank data collection must use a compliant data source.

---

# 18. CRM & Lead Management

The platform should include its own CRM.

Lead stages:

```text
New
Contacted
Qualified
Proposal
Won
Lost
```

Lead sources:

- Facebook
- Instagram
- LinkedIn
- Google
- Website
- WhatsApp
- YouTube
- Organic Search
- Manual

Each lead should include:

- Name
- Phone
- Email
- Source
- Campaign
- Project
- Assigned user
- Status
- Notes
- Activity timeline
- Tags
- Follow-up date

---

# 19. Unified Campaign Manager

A campaign should be able to contain multiple channels.

Example:

```text
Campaign: Festival Campaign

├── Meta Post
├── Instagram Post
├── LinkedIn Post
├── Google Business Post
├── WhatsApp Broadcast
├── YouTube Video
├── Website Banner
└── Blog
```

Combined performance should be displayed at campaign level.

Metrics may include:

- Spend
- Reach
- Impressions
- Clicks
- Leads
- Conversions
- Revenue
- CPL
- CPA
- ROAS

---

# 20. Automation Engine

The platform should provide a visual or rule-based workflow engine.

Example:

```text
Trigger:
New Facebook Lead

        ↓

Condition:
City = Delhi

        ↓

Action:
Send WhatsApp Template

        ↓

Wait:
2 Hours

        ↓

Condition:
No Reply

        ↓

Action:
Send Follow-up

        ↓

Action:
Create Task

        ↓

Action:
Assign Salesperson
```

Potential triggers:

- New lead
- New review
- New form submission
- New WhatsApp message
- Campaign threshold reached
- SEO issue detected
- Scheduled time
- Post published
- Post failed

Potential actions:

- Send message
- Create task
- Assign lead
- Change pipeline stage
- Send email
- Trigger webhook
- Publish content
- Notify user
- Generate report

---

# 21. AI Marketing Assistant

The AI layer should use the platform's own data and logic.

The AI should not make recommendations purely from raw prompts.

Flow:

```text
Platform Data
      ↓
Rules / Analytics Engine
      ↓
Structured Context
      ↓
AI Service
      ↓
Recommendation
```

AI use cases:

- Caption generation
- Hashtag generation
- Blog drafting
- Meta title generation
- Meta description generation
- Review reply generation
- Campaign summaries
- Marketing recommendations
- SEO issue explanations
- Monthly report summaries
- Content ideas
- Channel-specific content variants

---

# 22. Marketing Intelligence Score

Each project should have a marketing health score.

Example:

```text
Overall Marketing Score: 82 / 100

SEO                  76
Website              91
Google Business      84
Meta                 79
LinkedIn             62
YouTube              88
WhatsApp             92
```

The platform should also generate priority actions.

Example:

```text
HIGH
8 pages missing meta descriptions

HIGH
11 Google reviews unanswered

MEDIUM
LinkedIn inactive for 10 days

MEDIUM
Meta CPL increased 24%
```

---

# 23. User Roles & Permissions

Suggested roles:

- SaaS Super Admin
- Organization Owner
- Organization Admin
- Project Admin
- Marketing Manager
- SEO Manager
- Social Media Manager
- Ads Manager
- Sales Agent
- Content Writer
- Analyst
- Viewer

Permissions should be granular.

Examples:

```text
Can View Analytics
Can Publish Posts
Can Manage Ads
Can Reply Reviews
Can Export Reports
Can Manage Team
Can Manage Integrations
Can Access CRM
Can Configure Automation
```

RBAC must be enforced on every sensitive API route.

---

# 24. Company Onboarding

A company should not have to share passwords.

The onboarding flow should be:

```text
Create Organization
      ↓
Create Project
      ↓
Add Website
      ↓
Connect Channels
      ↓
Invite Team
      ↓
Configure Permissions
      ↓
Start Managing Marketing
```

Company information to collect:

- Company name
- Brand/project name
- Logo
- Website
- Timezone
- Primary contact
- Target locations
- Services/products
- Default contact number
- Default CTA
- Team members

---

# 25. Integration Screen

Example:

```text
Project: Moksha Sewa

Meta                  Connected
Instagram             Connected
LinkedIn              Connected
Google Business       Connected
WhatsApp              Connected
YouTube               Connected
Website               Connected
Search Console        Connected
Analytics             Connected
```

For each connection, show:

- Connection status
- Connected account
- Last sync
- Permissions
- Token expiry state
- Reconnect action

---

# 26. Authentication & OAuth

External platform passwords should never be stored.

Use:

```text
User
 ↓
Official OAuth
 ↓
Consent Screen
 ↓
Authorized Token
 ↓
Encrypted Storage
```

Tokens must be encrypted at rest.

Secrets must never be exposed to the frontend.

---

# 27. Core Technology Stack

## Frontend

```text
Next.js
TypeScript
Tailwind CSS
Shadcn UI
```

## Backend

```text
NestJS
Node.js
TypeScript
```

## Database

```text
PostgreSQL
```

## Queue & Background Jobs

```text
Redis
BullMQ
```

## Storage

```text
S3 / Cloudflare R2 / Cloudinary
```

## Optional Infrastructure

```text
Nginx
Docker
PM2 / Container Runtime
CDN
Object Storage
Monitoring
```

---

# 28. High-Level Architecture

```text
                    Next.js Frontend
                           │
                           ▼
                      NestJS API
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
      Auth            Marketing            CRM
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    PostgreSQL
                           │
                     Redis + BullMQ
                           │
          ┌────────────────┼────────────────┐
          │                │                │
        Meta            Google          LinkedIn
        Worker           Worker           Worker
          │                │                │
      WhatsApp          YouTube          Website
       Worker            Worker           Worker
```

Start as a modular monolith.

Move to microservices only when scale requires it.

---

# 29. Core Backend Modules

Suggested backend modules:

```text
auth
users
organizations
Clients
members
permissions
integrations
social
meta
linkedin
google-business
whatsapp
youtube
website
analytics
seo
crawler
keywords
crm
leads
campaigns
automation
reports
ai
billing
audit
notifications
```

---

# 30. Database Entities

Suggested entities:

```text
users
organizations
organization_members

Clients
project_members

integrations
oauth_accounts
integration_tokens

social_accounts
social_posts
social_post_targets
social_comments

campaigns
campaign_channels

contacts
leads
pipelines
pipeline_stages
lead_activities

whatsapp_contacts
whatsapp_messages
whatsapp_campaigns

websites
web_pages
crawl_jobs
seo_rules
seo_issues

keywords
keyword_rankings

analytics_events
analytics_sessions

youtube_channels
youtube_videos

gmb_locations
gmb_reviews

automations
automation_nodes
automation_runs

ai_generations

subscriptions
usage_records

audit_logs
notifications
```

---

# 31. Security Requirements

Security is mandatory.

Requirements:

- Strong authentication
- Secure password hashing
- OAuth token encryption
- Tenant isolation
- Project-level access checks
- RBAC
- Rate limiting
- Input validation
- API validation
- Audit logs
- Secret management
- Refresh token rotation
- Session management
- CSRF protection where applicable
- Secure cookies
- CORS restrictions
- Webhook signature verification
- File upload validation
- Retry-safe background jobs

---

# 32. Audit Logging

Important actions must create audit records.

Examples:

- User login
- User invited
- Role changed
- Post published
- Post deleted
- Campaign updated
- Integration connected
- Integration disconnected
- Lead exported
- Report downloaded
- Automation edited

Store:

```text
user_id
organization_id
project_id
action
resource
timestamp
ip_address
metadata
```

---

# 33. Queue & Retry System

Publishing and sync operations must use background jobs.

Example:

```text
Scheduled Post
      ↓
BullMQ Queue
      ↓
Channel Worker
      ↓
External API
      ↓
Success / Retry / Failure
```

Features:

- Retry
- Backoff
- Rate-limit handling
- Job logs
- Dead-letter queue
- Idempotency
- Duplicate protection

---

# 34. Notifications

Users should receive notifications for:

- Failed post
- Integration disconnected
- Token expired
- New lead
- New review
- Automation failure
- SEO critical issue
- Campaign threshold
- Monthly report ready

Notification channels may include:

- In-app
- Email
- WhatsApp
- Push

---

# 35. Reports

Users should be able to generate reports by:

- Organization
- Project
- Channel
- Campaign
- Date range

Report sections may include:

- Executive summary
- SEO
- Meta
- LinkedIn
- Google Business
- YouTube
- WhatsApp
- Website
- Leads
- Campaigns
- Recommendations

Supported formats:

- PDF
- CSV
- Excel

---

# 36. Billing & SaaS Plans

The SaaS should support subscription plans.

Limits may be based on:

- Organizations
- Clients
- Team members
- Connected channels
- AI credits
- SEO crawls
- Keyword tracking
- Automation runs
- Storage
- Reports
- WhatsApp usage

Example plans:

```text
Starter
Growth
Agency
Enterprise
```

---

# 37. Agency Mode

The product should support agency use cases.

Agency dashboard should provide:

- Multiple organizations
- Multiple clients
- Multiple Clients
- Client-level permissions
- White-label support in later phases
- Combined alerts
- Combined reporting
- Multi-client overview

Example:

```text
Needs Attention

Client A
SEO Score Down

Client B
Meta CPL Increased

Client C
Unanswered Reviews

Client D
WhatsApp Campaign Failed
```

---

# 38. Main Navigation

Suggested navigation:

```text
Overview

MARKETING
├── Campaigns
├── Content Studio
├── Calendar
├── Media Library
└── AI Studio

CHANNELS
├── Meta
├── LinkedIn
├── Google Business
├── WhatsApp
├── YouTube
└── Website

SEO
├── SEO Dashboard
├── Site Audit
├── Pages
├── Keywords
├── Search Console
└── Reports

CRM
├── Leads
├── Contacts
├── Pipeline
├── Conversations
└── Tasks

AUTOMATION
├── Workflows
├── Triggers
└── Logs

ANALYTICS
├── Overview
├── Attribution
├── Conversion
└── Reports

MANAGEMENT
├── Organizations
├── Clients
├── Team
├── Integrations
├── Billing
└── Settings
```

---

# 39. Critical User Flows

## Flow 1 — Organization Setup

```text
Register
  ↓
Create Organization
  ↓
Create Project
  ↓
Connect Channels
  ↓
Invite Team
```

## Flow 2 — Omnichannel Publish

```text
Create Post
  ↓
Select Channels
  ↓
Customize Versions
  ↓
Preview
  ↓
Publish / Schedule
  ↓
Track Results
```

## Flow 3 — Lead Management

```text
Lead Arrives
  ↓
CRM Entry
  ↓
Assign User
  ↓
Automation
  ↓
Follow-up
  ↓
Conversion
```

## Flow 4 — SEO Audit

```text
Add Website
  ↓
Start Crawl
  ↓
Parse Pages
  ↓
Apply SEO Rules
  ↓
Generate Issues
  ↓
SEO Score
  ↓
Recommendations
```

---

# 40. Delivery Roadmap

## Phase 0 — Product Foundation

- Final PRD
- Database design
- System architecture
- Design system
- API contracts
- Security model

## Phase 1 — SaaS Core

- Authentication
- Organizations
- Clients
- Team
- Roles
- Permissions
- Integrations framework
- Dashboard base

## Phase 2 — Website + SEO

- Website onboarding
- Own analytics tracker
- SEO crawler
- SEO rules engine
- SEO score
- Google Business
- Content calendar

## Phase 3 — Core Channels

- Meta
- Instagram
- LinkedIn
- YouTube
- WhatsApp
- Omnichannel Publisher
- CRM

## Phase 4 — Campaigns & Automation

- Unified campaigns
- Workflow engine
- Notifications
- Lead automations
- Scheduling
- Retry engine

## Phase 5 — Intelligence

- AI content tools
- Marketing score
- Recommendations
- Advanced analytics
- Campaign attribution

## Phase 6 — Reporting & Billing

- PDF reports
- Exports
- Subscription plans
- Usage limits
- Billing

## Phase 7 — Agency & Scale

- Multi-client agency dashboard
- White-label
- Advanced permissions
- Large-scale workers
- Performance optimization
- Enterprise controls

---

# 41. Product Acceptance Criteria

The product should be considered successful when:

- One user can manage multiple organizations
- One organization can manage multiple Clients
- Clients have isolated data
- Users can connect supported channels securely
- LinkedIn can be connected and managed through authorized APIs
- One master post can target multiple supported channels
- Channel-specific content variants can be created
- Scheduled content publishes through background jobs
- Failed publishes are retried and logged
- Leads enter the central CRM
- Website crawl generates SEO issues
- SEO scores are generated by our own rules engine
- Project dashboards show combined metrics
- Team permissions are enforced
- Reports can be generated
- Automations can be configured
- Audit logs exist for sensitive actions
- No external-platform passwords are stored

---

# 42. Final Product Model

```text
                    EnCodency omniPlatform

                             AI
                              │
              ┌───────────────┼───────────────┐
              │               │               │
          Publishing       Analytics       Automation
              │               │               │
      ┌───────┼────────┐      │       ┌───────┼────────┐
      │       │        │      │       │       │        │
    Meta   LinkedIn   GMB   Website   CRM   WhatsApp  SEO
      │       │        │      │       │       │        │
      └───────┴────────┴──────┴───────┴───────┴────────┘
                              │
                              ▼
                    Campaign Intelligence
                              │
                              ▼
                    Reports & Recommendations
```

---

# 43. Product Principle

> **Create once. Connect every channel. Manage every project. Measure everything. Automate intelligently.**

EnCodency omniPlatform should become the central operating system for an organization's digital marketing activities.
