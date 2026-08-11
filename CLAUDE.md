# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file, high-fidelity **interactive prototype** of an "Agent Management Portal" (AMP) — the entire app is `Agent Management Portal.dc.html`. It models an Australian college's compliance workflow for recruiting, verifying, onboarding, and monitoring overseas education agents (ESOS Act / National Code / CRICOS / QEAC-PIER / MARN / PRISMS / ASQAnet). All agent data is hard-coded mock data; nothing persists and there is no backend.

There is **no build system, package manager, linter, or test suite** — do not look for `npm`/`make`/CI. The repo is just the one `.dc.html` file (this is a prototyping-tool export, not an app project).

## Running / previewing

The file is **not runnable standalone**. It depends on two external assets that are *not* checked in:
- `./support.js` — the "DC" declarative-component runtime (defines `DCLogic`, `<x-dc>`, `<sc-if>`, `<sc-for>`, and `{{ }}` binding).
- `_ds/organic-.../styles.css` + `_ds_bundle.js` — the design-system bundle providing all CSS variables (`--color-accent`, `--font-heading`, `.card`, `.btn`, `.tag`, etc.).

To preview it you must open it inside the prototyping tool that produced it (which supplies those runtime assets and reads the `data-props` config). Opening the raw file in a browser will not render it.

## Architecture

The file has two layers, and understanding the split is the key to editing it productively:

1. **Template markup** (top of `<x-dc>`, ~lines 20–782): pure declarative view. Uses `<sc-if value="{{ flag }}">` for conditional screens/dialogs and `<sc-for list="{{ arr }}" as="x">` for loops. Every `{{ name }}` is a binding, resolved against the object returned by `renderVals()`. Styling is entirely inline styles + design-system CSS variables — there is no separate stylesheet to edit.

2. **Logic** (bottom `<script type="text/x-dc" data-dc-script>`, ~lines 785–1162): a `class Component extends DCLogic` (React under the hood — `this.state` / `this.setState`, `React.createElement` for dynamically-built SVG icons).

**The single most important function is `renderVals()`** (~line 920). It runs every render and returns one flat object of display values *and* handler callbacks; that object is the entire binding namespace for the template. So:
- To change **wiring/behavior/computed values** → edit `renderVals()`.
- To change **layout/structure** → edit the markup.
- A `{{ foo }}` in the markup with no matching key in the `renderVals()` return will simply be blank.

### Data flow
- `raw` array (constructor, ~line 788) is the source of truth: one object per agent.
- `build(r, i)` normalizes each raw agent into the canonical shape stored in `state.agents` (adds `appId`, docs list, defaults, workflow fields like `stage`/`ackSent`/`onboard`).
- Per render, `enrich(a)` and the larger `curV` block decorate agents with computed display fields (status/rating tag classes) and click handlers. `cur` = the currently selected agent (`state.currentId`).

### Navigation & screens
- `state.view`: `login` → `mfa` → `app` (auth flow is cosmetic; any code / SSO advances it).
- `state.nav` within the app: `dashboard | applications | review | agents | profile | collateral | compliance | reports`, with a `navStack` powering the back button (`navTo` / `navBack`).
- Each screen is a top-level `<sc-if>` gated by a `show*` flag from `renderVals()`.
- `collateral`, `compliance`, and `reports` are intentional **stubs** (see `stubMap`, ~line 1060) — placeholder copy, not built out.

### Dialogs
All modals share one `state.dialog` string (e.g. `'approve'`, `'reject'`, `'invite'`, `'terminate'`, `'upload'`, `'viewdoc'`). Each `show*D` flag is just `s.dialog === '<name>'`. Add a dialog by adding a markup block + a `show*D` flag + open/confirm handlers.

### The review workflow (the domain core)
The Review screen is a **4-stage gated pipeline**: Business Registration → Certification → References → Final Review (`cur.stage` 0–3). Progression is controlled by boolean gates computed in `renderVals()` (`gate0`/`gate1`/`gate2`) — e.g. registration docs must be verified, then QEAC/PIER (plus MARN for dual agents), then the acknowledgement-email reply must be received and references passed. `reach[]` controls which stage tabs are clickable; `gateNotes[]` explains what's blocking. Final approval opens the invite dialog and moves the agent to `Approved`/onboarding. Post-onboarding steps (PRISMS, ASQAnet, collateral, student feedback, re-registration) live in `onboardSteps`.

## Conventions when editing

- Keep the two-layer discipline: don't put logic in markup or markup strings in `renderVals()` beyond the existing style-object pattern.
- New editable knobs go in the `data-props` JSON on the `<script>` tag (line 784) using the same `{editor, default, tsType, section}` shape, and are read via `this.props.*`.
- Reuse existing helpers rather than inlining: `statusClass()`, `ratingInfo()`, `nStyle()`/`filterStyle()` (button styling), `toastMsg()` (transient toast), `genPass()`, `ico()`/`checkIcon()` (SVG builders), `docTemplate()` (mock document contents for the view-doc dialog).
- Colors/spacing/typography must use the design-system CSS variables, never hard-coded hex, to stay theme-consistent.
