# Tea Fellas — Pending Updates Log

_Last updated: 2026-09-02_

---

## 1 — Case Briefing / Background missing from landing page
**File:** `index.html`  
**Status:** TODO

The case briefing and background context for Tea Fellas is hidden or absent from the simulation landing page. Participants land directly into the interview simulation without understanding the Tea Fellas business context.

**What to do:**
- Add a visible case background section (or restore a hidden one) to `index.html`
- Should cover: who Tea Fellas is, key characters (Uncle John, Aunty Mary, Salmiah, Darren, Chew), current business situation, workshop objective
- Show before or alongside the persona/team selection, not buried behind a modal

---

## 2 — Section 2.2: Allow additional Problem Statements
**File:** `phase2.html` (section 2.2) + `phase2-problem.html`  
**Status:** DONE

Currently section 2.2 has a single problem statement textarea. Participants should be able to draft multiple candidate problem statements before converging on one.

**What to do:**
- Add a `+` button below the 2.2 textarea in `phase2.html` that appends a new editable problem statement row
- Each additional row should be deletable (× button)
- Save all rows as an array in the `problem_statement` deliverable in D1
- The full editor (`phase2-problem.html`) should also reflect the multi-row approach

---

## 3 — Problem Statement Editor: "Generate my problem statement" button
**File:** `phase2-problem.html`  
**Status:** DONE

The problem statement editor currently requires participants to write the statement manually from structured fields. Add an AI-assisted generation step.

**What to do:**
- Add a "Generate my problem statement →" button in `phase2-problem.html`
- On click: read the structured fields (user role, emotion, situation, goal, barrier, impact) and call the Cloudflare Worker to generate a polished "We need to find a way for…" statement
- Show the generated output in a preview box; participant can accept (copy to textarea) or edit manually
- Worker endpoint: reuse or extend `POST /generate` pattern already in the worker

---

## 4 — Vision Editor: Generate OKRs + editable pillar headers + remove Constraints section
**File:** `phase2-vision.html`  
**Status:** DONE

Three changes in the vision editor:

### 4a — "Generate my recommended OKRs" button
- Add a button after the vision statement field: **"Generate my recommended Objectives and Key Results →"**
- On click: use the saved vision statement + pillar content to generate 2–3 OKRs (Objective + 3 KRs each)
- Display in a styled output area below the button; allow participants to edit inline
- Save OKRs to D1 as part of the `product_vision` deliverable content

### 4b — Editable pillar headers
- The three vision pillars currently have hardcoded labels: "Operational accuracy", "Customer convenience", "Scalable foundation"
- Replace these with editable `<input>` fields so participants can rename pillars to match their team's framing
- Save pillar header names alongside pillar body text in D1

### 4c — Remove the "What this is NOT" / Constraints section
- Remove the `not1` / `not2` / `not3` fields and their surrounding section from `phase2-vision.html`
- Remove corresponding save/load logic in JS and D1 content key cleanup

---

## 5 — (See item 4 above — combined)

---

## 6 — Phase 2 main page: Include OKRs in the 2.3 Vision box
**File:** `phase2.html` (section 2.3)  
**Status:** DONE

The 2.3 Product Vision section in the main Phase 2 hub currently shows only the vision statement textarea. After OKRs are built (item 4a), they should also appear here.

**What to do:**
- Below the vision textarea in section 2.3, add a read-only OKR display panel
- Loads saved OKRs from the `product_vision` deliverable (D1) on page load
- Shows each OKR as: Objective heading + KR bullet list
- Link to `phase2-vision.html` full editor if OKRs are empty

---

## 7 — Phase 3: Add To-Be Process box to deliverables section + artefact templates
**File:** `phase3.html` (deliverables section)  
**Status:** PPTX artefacts DONE · In-app box TODO

The To-Be Process Map exists as artefact 3.2 (PDFs) but is missing from the `phase3.html` UI — only 3 deliverable cards show (3.1 Canvas, 3.2 Roadmap, 3.3 Risk). Adding it makes 4.

**Artefacts built (2026-09-02):**
- `artefacts/Phase3_Ideate/3.2_To-Be_Process_Map_Participant_Template.pptx` — 5-lane swimlane with 10 numbered blank boxes, improvement prompts, legend
- `artefacts/Phase3_Ideate/3.2_To-Be_Process_Map_Model_Answer.pptx` — completed model answer with all step labels, improvement callouts, flow arrows, facilitator note

**In-app (DONE 2026-09-03):**
- Added 3.2 To-Be Process Map card to `phase3.html` (2×2 grid)
- Created `phase3-tobe.html` with 5 swim lane textareas + summary, saves to D1 `d3_2_tobe`
- Renumbered Roadmap → 3.3, Risk → 3.4

---

## Implementation order (suggested)

| # | Item | Complexity | Priority |
|---|------|-----------|----------|
| 1 | Case briefing on landing page | Low | High — first thing participants see |
| 7 | 3.3 To-Be Process box | Low | High — blocks workshop flow |
| 4c | Remove Constraints from vision editor | Low | Medium |
| 4b | Editable pillar headers in vision | Low | Medium |
| 2 | Multi-problem statement rows | Medium | Medium |
| 6 | OKRs in phase2.html 2.3 box | Medium | Medium |
| 3 | Generate problem statement (AI) | Medium | Medium |
| 4a | Generate OKRs (AI) | High | Medium — depends on worker changes |
