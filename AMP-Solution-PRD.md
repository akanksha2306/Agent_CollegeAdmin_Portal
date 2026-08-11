# Agent Management Portal — Solution PRD

> **Status:** Draft v0.1 · **Date:** 10 Aug 2026 · **Owner:** Product (PM) · **Audience:** Product · Eng · Compliance

A compliance-first system for a **single Australian college** to recruit, verify, onboard, and monitor its overseas education agents — end to end, audit-ready, under the ESOS Act and National Code 2018.

### Scope decisions locked for this draft
- **Product shape** — single-college internal tool, not multi-tenant SaaS.
- **Integrations** — real integrations wherever a usable API exists (sequenced, not all at once).
- **Portals** — both the college-admin portal and the agent-facing portal are in scope.
- **Document** — balanced PM working doc: problem → solution → scope → phasing → open questions.

---

## 01 · Summary

Recruiting international students through education agents is how the college fills seats — and it is also its largest compliance exposure. Every agent is a legal entity the college is accountable for under the ESOS Act and the National Code 2018: their credentials, marketing, conduct, and student outcomes all reflect back on the college's CRICOS registration.

Today that relationship is managed across email threads, shared drives, and spreadsheets. The Agent Management Portal (AMP) replaces that with one system that runs the full lifecycle: an agent applies and uploads documents through a self-service portal; a college administrator verifies them through a gated, auditable review pipeline; approved agents are provisioned portal access and onboarded into the regulatory registers; and their ongoing performance and compliance are monitored against clear risk signals — with renewals, reviews, and terminations handled in the same place.

The north star is **audit-readiness by default**: at any moment the college can show a regulator exactly which agents are compliant, why, and with what evidence — without a scramble.

## 02 · Problem & context

### What's broken today
- **Fragmented records.** Business registration, QEAC/PIER certificates, MARN, references, and signed agreements live in different inboxes and folders. No single record of truth per agent.
- **Unverifiable, inconsistent onboarding.** Whether a document was actually checked — and by whom — depends on who handled it. No enforced sequence, so agents can slip through with gaps.
- **Blind spots on active agents.** Visa-refusal rates, withdrawal patterns, and expiring certifications are early-warning signs of compliance risk, but aren't tracked in one view.
- **Manual regulatory hygiene.** PRISMS registration and ASQAnet notification (within 30 days of engaging or terminating an agent) are reconciled by hand — the exact kind of gap a regulator flags.
- **No audit trail.** When something is questioned, reconstructing "who approved this agent, on what evidence, when" is archaeology.

### Why now
Agent-related compliance is under increasing regulatory scrutiny, and the cost of a lapse — sanctions, CRICOS conditions, reputational damage — dwarfs the cost of the tooling. The manual process also caps how many agent relationships the college can safely manage. AMP turns a liability-prone manual process into a controlled, scalable one.

## 03 · Goals & non-goals

### Goals
- One auditable record per agent, from first application through termination.
- A verification workflow that *cannot* be completed with mandatory checks skipped.
- Self-service intake and document upload for agents — less admin data-entry, faster cycles.
- A live risk view of active agents, surfacing what needs attention today.
- Automated regulatory hygiene where APIs allow; enforced manual steps where they don't.
- A complete, exportable audit log of every status change, verification, and communication.

### Non-goals (this version)
- **Out** — Multi-tenant SaaS / selling to other colleges (single-college only).
- **Out** — Student CRM / applications processing. AMP manages *agents*, not the students they refer.
- **Out** — Commission accounting & payments (surfaced as flags/holds, but settlement stays in Finance).
- **Out** — The embedded AI assistant shown in the prototype (fast-follow, not v1 scope).

## 04 · Success metrics

| Metric | Baseline (manual) | Target |
|---|---|---|
| Median onboarding cycle time (application → approved) | ~3–4 wks | ≤ 7 days |
| Agents with a complete, verified compliance record | Unknown | 100% |
| Written agreements current (not expired) | ~92%* | ≥ 98% |
| ASQAnet notifications filed within 30 days | Ad hoc | 100% |
| Expiring credentials caught before expiry | Reactive | 100% (30-day lead) |
| Time to produce an agent audit pack | Hours–days | < 5 min export |

\*Illustrative baselines drawn from the prototype's compliance-health panel; to be confirmed against real records during discovery.

## 05 · Users & roles

Single college, so no tenant isolation — but distinct roles matter for accountability and least-privilege on a compliance system.

| Role | Who | Can do |
|---|---|---|
| **College Admin** (e.g. "Robin") | Agent-relations / compliance staff | Full workflow: review, verify, request info, approve, reject, provision access, terminate, run reports. |
| **Reviewer** | Junior compliance staff | Verify documents and advance the pipeline; *cannot* issue final approval, terminate, or export. |
| **Read-only / Auditor** | Leadership, external auditor | View records, dashboards, audit logs; no mutations. |
| **Agent** | External education agent | Agent portal only: submit application, upload documents, respond to info requests, renew credentials, re-sign agreements. |

**Auth:** Admin-side sign-in is via **University SSO with MFA** (as prototyped). Agents use a separately-provisioned credential set (username + temporary password, reset on first sign-in) — never SSO, since they're external.

## 06 · Solution overview

AMP is two connected experiences over one shared agent record:

**A. College-admin portal** *(core of prototype)* — Dashboard and work queue, applications inbox, gated review workspace, active-agent monitoring, and regulatory/lifecycle actions. Where verification and decisions happen.

**B. Agent-facing portal** *(implied by invite flow)* — Where an agent applies, uploads/re-uploads documents, tracks status, responds to information requests, and — once active — renews certifications and re-signs agreements. The prototype's "create account & send portal access" step is the handoff into this portal.

**Design principle:** Every state change an agent triggers (submit, upload, reply) lands as a task on the admin side, and every request the admin makes (more info, renewal) lands as an action in the agent portal. The two sides are one workflow, not two apps that email each other.

## 07 · Agent intake · agent portal

An agent (or the admin, via **+ Invite Agent**) starts an application. The agent then completes intake in their portal:

- **Business & contact details** — business name, ABN/ACN, contact person, email, phone.
- **Agent type** — Education, or **Dual (Migration)**, which additionally requires a MARN and triggers a conflict-of-interest declaration.
- **Recruitment channel** — Onshore (students already in Australia) vs Offshore, which changes what registration evidence is expected.
- **Document upload** — business registration, ASIC extract, identity documents, QEAC/PIER certificate, and MARN registration for dual agents. Accepts PDF/JPG/PNG.

On submit, the application enters the admin queue as **New Request** and the agent sees a live status tracker. When the admin requests more information, the application moves to **Pending Documents** and the specific items reappear as required uploads in the agent portal.

## 08 · Verification pipeline

The heart of the product: a **four-stage gated review**. Each stage has a completion *gate* — the admin cannot advance until the gate's mandatory checks are met. This is what makes onboarding consistent and non-skippable.

| Stage | Name | Gate |
|---|---|---|
| 1 | Business Registration | registration + ASIC + ID verified |
| 2 | Certification | QEAC/PIER (+ MARN for dual) verified |
| 3 | References | ack-reply received + all referees passed |
| 4 | Final Review | compliance checklist met |

### Stage detail
- **Stage 1 — Business Registration.** Each document can be *viewed* (system renders the official record — ASIC certificate, company extract, ID) and *verified*. Missing documents show an Upload action. Gate requires registration, ASIC extract, and identity all verified. Onshore/offshore selection sets the guidance for what "registered" means.
- **Stage 2 — Certification.** Verify the QEAC/PIER counsellor certificate; for dual (migration) agents, the MARN as well. A certification register shows QEAC/PIER state, ICEF/ICF membership, and MARN status at a glance.
- **Stage 3 — References + acknowledgement loop.** A deliberate two-step control: the admin sends an **acknowledgement & information-collection email**; references can only be approved *after* the agent replies. This prevents references being rubber-stamped before the agent has formally engaged. Each referee (with their CRICOS provider) is marked Passed individually.
- **Stage 4 — Final internal review.** A live compliance checklist rolls up the prior stages — legal entity & identity, ASIC registration, QEAC/PIER, MARN (dual only), references. When all are Met, the admin can approve; approval writes the audit-log entry, sends the approval email, and moves the agent into onboarding.

**Gate logic** is computed, not manual toggles: e.g. Stage 1's gate is `reg && asic && id verified`; Stage 3's is `ack-reply-received && all-real-referees-passed`. The "Continue / Approve" button stays disabled with an explanatory note until its gate is satisfied.

### Decision actions (available throughout review)
- **Request info** → status **Pending Documents**, agent emailed the specific items.
- **Reject** → status **Rejected**, rejection email with reason, logged.
- **Approve** (Stage 4 only) → status **Approved** → provisioning.

## 09 · Approval & account provisioning

On approval, the admin provisions the agent's portal access in one step:
- A **portal username** is generated (derived from contact name + college domain).
- A **temporary password** is generated (regenerable), which the agent must reset on first sign-in.
- Access credentials are sent via the admin's chosen channel — **Email, SMS, or WhatsApp**.

This is the bridge between the two portals: approval on the admin side creates the agent's login to the agent side. The action is logged, and the agent moves into the post-onboarding lifecycle.

## 10 · Active-agent monitoring

Once active, an agent is monitored on performance and compliance signals. The dashboard and agent profile surface these so risk reads at a glance.

| Signal | Meaning / why it matters |
|---|---|
| **Enrolments** | Volume delivered this intake — the value side. |
| **Conversion rate** | Applied → enrolled; efficiency and quality of referrals. |
| **Visa refusal rate** *(risk)* | Rolling 12 months. High refusal is a red flag for genuineness / conduct. |
| **Withdrawals before census** | Signals mis-selling or poor student fit. |
| **Compliance rating (A/B/C)** | Roll-up: A Excellent · B Good · C At-risk. |
| **Certification expiry** *(time-based)* | QEAC/PIER validity; drives renewal reminders. |

The **dashboard** aggregates this into a work queue (prioritised actions), a compliance-health panel (agreements current, reviews current, credentials verified, PRISMS reconciled, ASQAnet updated, website references updated), upcoming deadlines, and an **agent risk watchlist**. Agents can be **terminated** from their profile, which triggers offboarding (§11).

## 11 · Post-onboarding lifecycle

Onboarding isn't the finish line — it opens a checklist of recurring obligations tracked per agent:
1. **Onboard into PRISMS** — register the agent in the Commonwealth system.
2. **Onboard into ASQAnet** — regulator notification.
3. **Share marketing collateral** — enablement from the approved-materials library.
4. **Trigger student feedback** — survey the students the agent referred.
5. **Approve student feedback** — add results to the compliance record.
6. **Compliance monitoring** — ongoing review cadence.
7. **Re-registration** — renew QEAC/PIER + re-sign the ESOS written agreement on cycle.

### Termination / offboarding
Terminating an agent runs immediately and visibly: portal access disabled and collateral revoked; removed from the website; PRISMS updated and ASQAnet notified within 30 days; pending student applications handed to Admissions. Reason captured and logged.

**Future modules** — Three areas are placeholders in the prototype and become their own build-outs: **Marketing Collateral** (version-controlled library that auto-notifies active agents and records downloads), **Compliance** (consolidated PRISMS/ASQAnet/expiry register with 30-day reminders), and **Reports** (vendor master, duplicate detection, commission/pricing, risk profiles).

## 12 · Integrations

Per the scope decision, AMP integrates with real external systems wherever a usable API exists. These carry very different effort and risk, so they're **sequenced** (see §14) rather than delivered together.

| System | Use | Feasibility | Phase |
|---|---|---|---|
| **ABN Lookup / ASIC** | Auto-verify ABN/ACN, company status, officeholder against the applicant. | Public API | P2 |
| **PIER / QEAC** | Confirm counsellor certification & expiry. | Partner access | P2 |
| **MARA register** | Validate MARN for dual agents. | Lookup/verify | P2 |
| **PRISMS** | Register/update agent engagement. | Regulated, gated | P3 |
| **ASQAnet** | File notifications within 30 days. | Regulated, gated | P3 |
| **Email / SMS / WhatsApp** | Approval, rejection, info requests, credential delivery, reminders. | Standard providers | P1 |
| **SSO / IdP** | Admin sign-in + MFA. | SAML/OIDC | P1 |

**Risk:** PRISMS and ASQAnet are the long poles — access is permissioned, contracts/approvals are slow, and error handling has regulatory consequences. Every integrated step must degrade gracefully to the manual/attestation flow so a failed API call never blocks onboarding — and never lets an unverified agent through either.

## 13 · Data model (high level)

| Entity | Key fields |
|---|---|
| **Agent** | appId, business, contact, country/city, email/phone, type (education/dual), ABN/ACN, MARN, onshore flag, status, rating, cert expiry. |
| **Document** | agent ref, key (reg/asic/id/pier/marn), file, status (missing/pending/verified), verified-by, verified-at. |
| **Reference** | agent ref, referee name, CRICOS provider, outcome (pending/passed). |
| **Review state** | stage (1–4), ack-sent, ack-replied, gate results. |
| **Onboarding task** | agent ref, task key, done/pending, actor, timestamp. |
| **Performance snapshot** | enrolments, conversion, visa-refusal, withdrawals, per intake. |
| **Audit event** | actor, action, entity, before/after, timestamp, reason — append-only, exportable. |

Statuses: `New Request` · `In Review` · `Pending Documents` · `Approved` · `Active` · `Rejected` · `Terminated`.

## 14 · Release phasing

Real integrations are in scope, but building the regulated ones first would stall the whole product behind slow external approvals. So: ship the workflow value first with manual/attestation on the hard integrations, then automate outward-in.

### P1 — Core workflow & both portals
- Admin portal: dashboard, applications inbox, 4-stage gated review, decisions, active-agent monitoring, audit log.
- Agent portal: application, document upload, status tracking, info-request responses.
- Approval → account provisioning → credential delivery (email/SMS/WhatsApp). SSO + MFA.
- Regulatory steps (PRISMS/ASQAnet/ASIC/PIER) as **enforced manual attestations** with reminders — same control, human-executed.

### P2 — Verification automation
- ABN Lookup / ASIC auto-verification; PIER/QEAC and MARA verification. Auto-flag mismatches for admin review.

### P3 — Regulatory sync & the stubbed modules
- PRISMS + ASQAnet integration (with manual fallback retained).
- Marketing Collateral library, Compliance register, Reports/analytics — built out from placeholders.
- Fast-follow: the embedded AI assistant.

## 15 · Risks & mitigations

| Risk | Mitigation |
|---|---|
| PRISMS/ASQAnet access & contracts slow the roadmap. | Sequence them to P3; ship manual attestation in P1 so compliance is covered from day one. |
| Integration failure blocks onboarding. | Every automated check degrades to manual; failures never auto-approve *or* hard-block. |
| Document authenticity — a verified file could still be forged. | API cross-checks in P2; "view official record" comparison; audit trail of who verified. |
| Agents can't/won't use a self-service portal. | Admin can complete intake on their behalf; multi-channel credential delivery (incl. WhatsApp). |
| Sensitive PII (passports, IDs) at rest. | Encryption, least-privilege roles, access logging, retention policy — surface in security review. |
| Regulatory rules change. | Keep gates/checklists configurable, not hard-coded, so compliance logic can be updated without a release. |

## 16 · Open questions

1. What are the **real baseline numbers** (cycle time, agreement-currency, refusal thresholds) so success metrics are grounded, not illustrative?
2. Which PRISMS/ASQAnet access does the college already hold, and is API access even available to it — or is it web-portal only (which changes P3 from "integrate" to "assisted manual")?
3. Data residency & retention requirements for agent PII under Australian privacy law?
4. Does an existing system (student CRM, finance) already hold some agent data we must sync with rather than duplicate?
5. Who owns the **compliance rating** formula (A/B/C), and what exact thresholds drive it?
6. Are commission holds purely informational in AMP, or do they need a Finance system feed?

**Next step:** Confirm the four open items that gate estimation — real baselines (Q1), PRISMS/ASQAnet access reality (Q2), PII/residency constraints (Q3), and the rating formula owner (Q5) — then this draft can move to a scoped, estimable v1.

---

*Agent Management Portal · Solution PRD · Draft v0.1 · 10 Aug 2026. Reverse-engineered from the `Agent Management Portal.dc.html` prototype. Baselines marked illustrative are placeholders pending discovery.*
