# Features To Be Added

Running backlog of features for AMP, captured from prototype screens and review
sessions. Newest first. Each entry: target → current state → what to add → open questions.

---

## 9. Agent-facing portal ✅ DONE (2026-08-11)
**Source:** user request · **PRD:** §07 · **Status:** Built & verified end-to-end — *reverses the earlier "agent portal deferred to Phase 2" decision*

### What it does
Same app, **role-based login**. Robin (ADMIN) → admin app; **Arunima (AGENT)** → a plain agent page. The agent uploads typed documents (Business Registration / ASIC / ID / QEAC-PIER) as **jpeg/png/pdf**, stored in Neon **as base64**. On **Submit**, her application flips DRAFT → **New Request** and appears in Robin's queue; the files flow into the 4-stage review (admin can **open/verify** them).

### What was built
- **Data model:** `AGENT` role, `DRAFT` status (hidden from admin views until submitted), `User.agentId` (agent-user ↔ their application), `Document.fileData` (base64) + `contentType`.
- **Backend:** `requireRole` guard; `/api/agent/*` module (get own application, upload/remove base64 doc, submit) — strictly scoped to the caller's own `agentId`; admin file endpoint now serves base64 or disk; JSON limit raised to 12mb. Admin endpoints (`/agents`, `/dashboard`) locked to staff roles (agents get 403).
- **Frontend:** role-based routing (agent → `/agent`, staff → admin app, cross-access redirected); plain `AgentPortalPage` (upload each doc → base64 → save, then Submit → confirmation); admin review gains an **"Open file"** link to view agent uploads.
- **Seed:** `arunima` / `AgentPortal26` (AGENT) with a DRAFT application to fill.

### Verified
API smoke test: agent login → sees own DRAFT → **403 on admin endpoints** → base64 upload saved → submit → admin sees New Request → opens the decoded file. Typecheck + prod build clean.

### Phase 2 (still deferred)
- Real email delivery (submission/acknowledgement still mock/audit-only).
- Object storage instead of base64-in-DB (base64 is fine for this demo, not for scale).

### Follow-up (2026-08-11): portal chooser entry screen
Login now opens with a **two-option chooser** — **College Admin** and **Agent Portal** — each leading into that portal's sign-in (tailored heading, demo creds prefilled per portal, SSO shown only for admin, "← choose a different portal" to switch). Frontend-only (`LoginPage.tsx` + `styles.css`); role-based redirect after login unchanged.

### Follow-up (2026-08-11): acknowledgement shown on the agent portal
When the admin clicks **Send acknowledgement** (Stage 3), the agent now **sees it on their portal** after login: an "Acknowledgement from the college" card on the submitted screen, with a **"Confirm receipt & respond"** button. Confirming sets `ackReplied` → the admin's Stage 3 shows "reply received" (references become approvable) — so the loop is now driven by the real agent, not the admin mock. New `POST /api/agent/acknowledge`; `MyApplication` exposes `ackSent`/`ackReplied`. Verified end-to-end via API.

### Fix (2026-08-11): agent portal — clear way back to login
Bug: after an agent submitted, the only exit was an obscure ⎋ icon and the "Submitted" screen had no button — a dead-end. Fixed: header now has a labeled **Sign out** button, and the Submitted card has a prominent **"← Back to login"** button. Both return to the login chooser so the user can sign in as College Admin. (`AgentPortalPage.tsx`.)

---

## 8. Sidebar nav — all six sections ✅ DONE (2026-08-11)
**Source:** prototype sidebar · **PRD:** §06/§10/§11 · **Status:** Nav shell built (sections deferred)

Sidebar now matches the prototype: **Dashboard · Applications · Active Agents · Marketing Collateral · Compliance · Reports**, each with an icon. Applications shows a live **count badge** (NEW_REQUEST count).
- The four new sections (Active Agents, Collateral, Compliance, Reports) route to a reusable **`StubPage`** placeholder ("Coming soon · Phase 2/3") — no dead links, demo looks complete.
- Real functionality for those four is still **deferred** (§10 monitoring, §11 modules).
- Files: `components/AppLayout.tsx`, new `components/StubPage.tsx`, `main.tsx`, `styles.css`. Frontend-only.

---

## 7. Demo polish batch ✅ DONE (2026-08-11)
Four items built together:

- **Reject → agent email + audit** (§08) — Reject now captures its reason, records an `AuditEvent` (`action: REJECTED`, `after.recipient = agent.email`, actor). Mirrors Request-info. (Closes the "Reject reason discarded" gap.)
- **Dashboard "My work queue" full columns** (§10 · was backlog **#1**) — now Priority · Agent · Required action · Due · CTA, computed from status/stage/age (Critical/High/Medium pills, urgency colour, per-row CTA link). Seed backdates one agent so priorities vary in the demo.
- **Audit log viewer** (§13) — new `GET /agents/:id/audit`; an **Activity log** timeline card on the review page (action label, who, when, recipient, reason). Makes the "audit-readiness" north star visible.
- **Applications filters/status tabs** (§06) — status chip bar (All + every status) with live counts; client-side filter of the list.

Files: `dashboard.service.ts`, `agents.service.ts` (`rejectAgent`, `listAuditEvents`), `agents.controller.ts`, `agents.routes.ts`, `shared/types.ts`, `DashboardPage.tsx`, `AgentDetailPage.tsx`, `ApplicationsPage.tsx`, `lib/api.ts`, `styles.css`, `seed.ts`.

**Phase 2:** real email dispatch still deferred (reject/request-info remain faithful mocks).

---

## 6. Activation State — signed-agreement step before provisioning ✅ DONE (2026-08-11)
**Source:** "Activation State" spreadsheet · **PRD:** §09 · **Status:** Built & verified

### What it models
The post-approval handoff: Final Review **Approve** → agent **accepts the signed (ESOS) written agreement** → college **creates the portal account & sends login** → agent becomes **Active**. Previously **Approve** jumped straight to mock credentials with no agreement checkpoint.

### What was built (admin side)
- **Approve agent** now only sets status **Approved** (no credentials yet).
- An **Activation panel** appears for Approved agents with two steps:
  1. **Written agreement (ESOS) signed & accepted** → "Mark agreement signed" (`agreementSigned` flag).
  2. **Create portal account & send login** — disabled until the agreement is signed → generates the mock username + temp password (existing provisioning modal) and moves the agent to **Active**.
- **Server-side guard:** provisioning is rejected (400) unless the agent is Approved *and* the agreement is signed.
- **Audit trail:** records `APPROVED → AGREEMENT_SIGNED → ACCOUNT_CREATED` (with the generated username).
- New `agreementSigned` column (migration `add_agreement_signed`). Files: `agents.service.ts`, `agents.controller.ts`, `agents.routes.ts`, `schema.prisma`, `shared/types.ts`, `AgentDetailPage.tsx`, `lib/api.ts`.

### Phase 2 (deferred)
- The **agent actually accepting the agreement & logging in** with the sent credentials — that's the agent-facing portal.
- Real email/SMS/WhatsApp delivery of the login (currently mock, shown in the modal).

---

## 5. "Request more information" → routes to the agent's email ✅ DONE (2026-08-11)
**Source:** review session · **PRD:** §08 · **Status:** Built & verified

### Problem
The **Request more information** dialog had a message box, but the message went **nowhere** — `doDecision` called `requestInfo(id)` and the text was silently discarded; it only flipped the status. No recipient was shown, and the "the agent is emailed" copy was hollow.

### What was built
- Dialog now shows a **"To: {agent.email}"** line (the email from Business & contact), so it's explicit where the request goes.
- The message is now **sent to the backend** and the request is **recorded as an `AuditEvent`** (`action: REQUEST_INFO`, `reason: message`, `after.recipient = agent.email`, actor = signed-in admin) — first real use of the audit trail.
- Status still moves to **Pending Documents**; a green confirmation banner shows **"Information request emailed to {agent.email}"**.
- Files: `agents.service.ts` (`requestInfo`), `agents.controller.ts`, `frontend .../AgentDetailPage.tsx`, `lib/api.ts`, `styles.css`.

### Phase 2 (deferred)
- **Actual email dispatch** (SMTP/provider) — currently a faithful mock (captured + logged + addressed, not sent).
- Give the **Reject** reason the same treatment (also currently discarded).

---

## 4. Applications list — clear "Review" action ✅ DONE (2026-08-10)
**Source:** review session · **PRD:** §06/§08 · **Status:** Built & typecheck-verified

### Problem
The 4-stage review workspace (`/applications/:id`, `AgentDetailPage`) existed, but the only way in from the Applications list was clicking the business-name text link — not discoverable, no button, row not clickable.

### What was built
- **"Review →" button** (primary) in a new right-most Actions column on each row → opens the review.
- **Whole row is clickable** (`.amp-row`, cursor + hover highlight) and navigates to the review, while clicks on interactive elements (Upload button, remove ×, business-name link) are ignored via `e.target.closest('button, a, input, select')`.
- Files: `frontend/src/features/applications/ApplicationsPage.tsx`, `frontend/src/styles.css`. No backend change.

---

## 1. Dashboard — "My work queue" full columns ✅ DONE (see #7)
**Source:** prototype screenshot · **PRD:** §10 (dashboard work queue = prioritised actions) · **Status:** Built (2026-08-11)

### Target (from prototype)
A 5-column table titled "My work queue" / "Prioritised actions assigned to you", with a "View all →" link:

| Priority | Agent | Required action | Due | CTA |
|---|---|---|---|---|
| Critical | Karachi Edu Partners | Agreement expired — suspend new referrals | Today | Open → |
| High | Himalayan Pathways | Verify QEAC / PIER certificate | Tomorrow | Open → |
| High | Kathmandu Connect | Complete annual monitoring review | 12 Aug | Start → |
| Medium | Chennai Global | Re-upload ASIC extract | 15 Aug | Review → |

Column details:
- **Priority** — pill: Critical (solid), High (outline), Medium (neutral).
- **Agent** — business name (bold); row links to the agent.
- **Required action** — plain-language next step.
- **Due** — Today / Tomorrow / date; "Today"/overdue coloured urgent.
- **CTA** — per-row link matching the action verb: Open → / Start → / Review →.

### Current state
- `frontend/src/features/dashboard/DashboardPage.tsx` — work queue shows App ID, Agent, Country, Status.
- `backend/src/modules/dashboard/dashboard.service.ts` — returns `WorkQueueItem { id, appId, business, country, status, submittedAt }`.
- `shared/src/types.ts` — `WorkQueueItem` type.

### What to add
1. **shared** — extend `WorkQueueItem` with `priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'`, `action: string`, `due: string`, `cta: string`.
2. **backend** — in `dashboard.service.ts`, populate these per agent. Source options:
   - Option A (quick): computed rules from status/stage/cert-expiry.
   - Option B (proper): a real task/assignment model (ties to §13 review-state / OnboardingTask) with per-user "assigned to you".
3. **frontend** — render 5 columns with a priority pill, due-urgency colour, and a CTA link to `/applications/:id`.

### Open questions
- Priority/action/due: computed rules (A) or real task model (B)?
- Is "assigned to you" real per-user assignment, or all open items for now?
- Due dates: SLA rules vs stored due dates?

---

## 2. Complete college-admin onboarding pipeline
**Source:** grill session 2026-08-10 · **PRD:** §08–09 · **Status:** In progress (Stage 1 written, unverified)

### Context / scope decision
Target end-state = **stakeholder demo / MVP**. The one flow to complete now is the **college-admin onboarding pipeline** — the "heart of the product". Everything post-approval (active-agent monitoring §10, lifecycle §11, terminate) is **deferred**. Agent portal is deferred (see #3). Document intake assumption for now: **agents email their documents to the college admin, who uploads / mocks them** — no agent-upload dependency.

### Progress at a glance
Legend: ✅ done · 🟡 partial · ❌ not built

| Piece | State | Gap? |
|---|---|---|
| Login | ✅ verified | — |
| Dashboard (stats + queue) | ✅ verified | minor (queue columns = #1) |
| Applications inbox | 🟡 basic list | filters/tabs (nice-to-have) |
| Review Stage 1 (Business + Reg docs) | 🟡 written, unverified | **verify it** |
| Review Stage 2 — Certification | ❌ not built | **YES** |
| Review Stage 3 — References + ack loop | ❌ not built | **YES** (needs referee seed) |
| Review Stage 4 — Final Review + checklist | ❌ not built | **YES** |
| Decision actions (Request info / Reject / Approve) | ❌ not built | **YES** |
| Approval → provisioning (mock creds) | ❌ not built | **YES** (end of flow) |
| Doc intake (agent emails → admin uploads/mocks) | ✅ matches decision | — |

### The flow to complete
New Request → 4-stage gated review → approve → provision (mock). Depth on this one flow.

1. **Stage 1 — Business Registration** *(written, needs verifying)* — Business & contact panel + Registration documents with View / Verify / Upload + onshore/offshore toggle.
2. **Stage 2 — Certification** — verify QEAC/PIER (+ MARN for dual agents); certification register (QEAC/PIER, ICEF/ICF, MARN at a glance).
3. **Stage 3 — References + acknowledgement loop** — admin sends acknowledgement/info-collection email; references can only be approved *after* the agent replies; each referee (+ CRICOS provider) marked Passed individually.
4. **Stage 4 — Final Review** — live compliance checklist rolling up prior stages; when all Met → Approve.

### What to add
- **Gate enforcement** per stage — "Continue" disabled until the gate is met, with an explanatory note. Backend logic already exists: `backend/src/modules/agents/agents.service.ts::isStageGateMet`.
- **Decision actions** (available through review): Request info → `Pending Documents`; Reject → `Rejected`; Approve (Stage 4 only) → `Approved`.
- **Approval → provisioning (§09)** — generate portal username + temp password and **display them as a mock** (channel send is mocked; no real agent login yet — that's #3).
- **Frontend:** extend `frontend/src/features/applications/AgentDetailPage.tsx` (Stage 1 lives here) with Stages 2–4 + decision dialogs (reuse `components/Modal.tsx`).
- **Backend:** extend `agents` module — stage advance endpoint (respecting the gate), decision endpoints, references + ack endpoints, provisioning endpoint.
- **Seed:** add referee names + CRICOS providers per agent (Stage 3 has nothing to show today).

### Open questions / flags
- Provisioning "send via email/SMS/WhatsApp" is **mock-only** for now; real delivery lands with the agent portal (#3).
- Stage 3 needs seed data (referees) before it demos.

---

## 3. Agent-facing portal
**Source:** grill session 2026-08-10 · **PRD:** §07 · **Status:** Deferred — Phase 2 (build AFTER the admin flow is complete)

### Scope
The second portal, to be built once the admin onboarding pipeline (#2) is done. Agent self-service: apply, upload / re-upload documents, track application status, respond to info requests, and — once active — renew certifications / re-sign agreements. Post-approval, the agent logs in with the credentials provisioned on the admin side (turning #2's *mock* provisioning into a real handoff).

### Interim replacement (until built)
Agents **email** their documents to the college admin; the admin **uploads / mocks** them into the review pipeline. So nothing in #2 blocks on this portal existing.

### Open questions
- Agent auth: separately-provisioned credentials (username + temp password, reset on first sign-in) — never SSO (external users). Confirm at build time.
- Which channel actually delivers credentials (email/SMS/WhatsApp)?
