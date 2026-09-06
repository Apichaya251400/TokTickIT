# AI Use & Reflection — Lab 2

## 1. AI Tool / Platform

- **AI Tool / Platform**: Google Antigravity (Agentic AI Coding Assistant)
- **Underlying Model**: Gemini 3.6 Flash High
- **Usage Context**: Pair programming, specification analysis, test planning, code and documentation auditing, and peer-review feedback analysis during the TokTickIT Lab 2 development cycle.
- **Role & Usage**: Interactive pair-programming assistant, specification analyzer, TDD collaborator, read-only code auditor, peer-review reasoning partner, and documentation traceability reviewer.

In TokTickIT Lab 2, AI was used as an interactive engineering assistant to support human decision-making and rigorous software quality practices. AI was not given independent authority over requirements, architectural boundaries, code acceptance, or Git pull request merging.

---

## 2. How AI Was Used

### 2.1 Specification Analysis
Before implementation decisions were made, AI was instructed to consult the canonical project documentation:
- `docs/lab-02/specification.md`
- `docs/lab-02/api-spec.md`
- `docs/lab-02/ui-spec.md`

AI assisted in mapping requirements into strict lists of Acceptance Criteria (AC-01 through AC-20) and Business Rules (BR-01 through BR-27). This helped ensure that every issue and test plan was anchored in the canonical specification rather than generic assumptions.

### 2.2 Issue and Implementation Planning
For each GitHub Issue, AI helped decompose the work into:
- Impacted files in `server/`, `client/`, or `e2e/`.
- Applicable AC and BR identifiers.
- Necessary API endpoints, UI states, or validation constraints.
- Expected test coverage strategy.

Planning with AI helped keep the implementation scope aligned with the specification before code changes were introduced.

### 2.3 TDD RED/GREEN Workflow

AI actively participated in Test-Driven Development (TDD):

- **RED Phase**: AI helped draft automated test cases matching specific ACs/BRs prior to production implementation, verifying that the tests correctly failed for expected reasons.
- **GREEN Phase**: AI analyzed failure tracebacks and assisted in formulating the smallest compliant change needed in route handlers, UI components, or utilities.
- **Rerun & Verify**: Tests were executed locally via terminal commands (`npm test`, `npx playwright test`) to confirm clean pass results.

Production implementation was progressed only after the focused tests produced the expected GREEN results, followed by code review and additional verification where required.

### 2.4 Read-Only Auditing
A critical pattern in the TokTickIT workflow was instructing AI to perform read-only audits:
- AI inspected implementation against canonical specifications without modifying any files.
- The audit evaluated AC/BR coverage, validation boundaries, ownership behavior, error handling, UI states, and scope compliance.
- AI was used to inspect, report, and support review without independently guaranteeing correctness.

*Why this mattered*: Separating the audit phase from the implementation phase kept the audit process separate from implementation and reduced the risk of self-review.

### 2.5 Peer Review Feedback Analysis
During peer review cycles on GitHub Pull Requests (such as PR #36 and PR #38), AI was used to reason about feedback from the human peer reviewer (`Pilaiwan3492`):
- AI supported analyzing reviewer comments, such as retaining created ticket state during attachment retry, retrying only failed attachment uploads, rendering reference-data loading/error states, resetting retry state on requester change, and triggering active attachment downloads in E2E tests.
- For PR #38, AI helped distinguish a reviewer interpretation from an explicit Lab 2 requirement and supported a specification-based response without introducing unnecessary routing dependencies outside Lab 2 scope.

All peer review changes were verified via regression tests before updating PRs. AI was not the reviewer or approver.

### 2.6 Final Test & Traceability Audit
During final documentation preparation, AI was used to compare:
- Canonical AC-01..20 and BR-01..27 definitions.
- Actual physical test files in the repository (`server/tests/lab-02/*`, `client/tests/lab-02/*`, `e2e/lab-02/*`).
- Verified terminal test execution results (**115/115 PASS** Lab 2 automated tests: 58 server, 55 client, 2 E2E; and **131/131 PASS** total repository tests).
- Acceptance criteria and business rule traceability tables in `docs/lab-02/tests.md`.

*Precision Note*: 115 is the verified Lab 2 automated test count. The 131 total includes 16 broader repository tests (such as standalone unit tests and Lab 1 baselines) and is not described as "131 Lab 2 tests." Physical repository evidence was used to avoid phantom test files or unsupported PASS claims.

### 2.7 Documentation Preparation
AI assisted with structuring and drafting submission documentation:
- `docs/lab-02/tests.md` (Test Strategy, Inventory, AC/BR Traceability, Known Scope Boundaries).
- `docs/lab-02/ai-use.md` (AI Usage, Prompts, Accountability, Reflection).
- `docs/lab-02/reviewer.md` (Peer Review Record, Comments Received, Responses, Approvals).

All documentation claims were cross-checked against actual repository evidence and terminal execution logs before finalizing.

---

## 3. Selected Key Prompts

Exact historical transcripts are summarized into representative prompts where necessary. The examples below preserve the intent and engineering constraints of prompts used during the actual Lab 2 workflow.

### Prompt 1 — Specification-First Analysis

- **Representative Prompt Text:**
> "Read docs/lab-02/specification.md, api-spec.md, and ui-spec.md before making any implementation decision. Identify the applicable AC and BR for this Issue. Do not invent requirements. If anything is ambiguous, stop and ask for clarification before modifying code."

- **Why I used it:** I wanted to ensure that implementation choices were strictly grounded in the approved project contract rather than generic full-stack patterns.
- **What it contributed:** Prevented generic assumptions from becoming project requirements and produced explicit AC/BR checklists for every feature.

---

### Prompt 2 — Issue → Engineering Plan

- **Representative Prompt Text:**
> "Read this Issue against the canonical Lab 2 specification. Identify the required AC/BR, affected files, tests that should exist, and implementation steps. Do not add behavior outside the Issue or Lab 2 scope."

- **Why I used it:** To create a clear, reviewable implementation plan that bound code edits directly to acceptance criteria and issue boundaries.
- **What it contributed:** Maintained tight scope control and ensured all affected backend endpoints and frontend components were mapped before editing files.

---

### Prompt 3 — RED Test First

- **Representative Prompt Text:**
> "Implement the RED phase for this Issue. Add tests for the specified acceptance criteria and business rules, but do not modify production implementation. Run the focused tests and report which expectations fail."

- **Why I used it:** To enforce a strict Test-Driven Development sequence where test cases fail predictably for missing capabilities before any production code is written.
- **What it contributed:** Preserved the TDD sequence and made failures meaningful before implementation, preventing false-positive test passes.

---

### Prompt 4 — Read-Only Audit

- **Representative Prompt Text:**
> "Audit the current implementation against the canonical Lab 2 specification and this Issue. Check AC/BR coverage, validation boundaries, ownership behavior, error codes, and scope compliance. READ-ONLY: do not modify any files. Report findings with file/test evidence."

- **Why I used it:** I needed an objective code inspection that would report discrepancies without silently altering the codebase.
- **What it contributed:** Separated audit from implementation. Helped identify specification gaps and edge cases, including requester-context validation, reference-data loading/error states, and other boundary conditions that required verification during implementation and review.

---

### Prompt 5 — Smallest GREEN Fix

- **Representative Prompt Text:**
> "Based on the failing tests and the canonical specification, implement the smallest change required to make the tests pass. Do not add unrelated features or change behavior outside the specified AC/BR. After implementation, run the focused tests and report the result."

- **Why I used it:** To adhere to minimal implementation principles and keep code changes clean, focused, and easily reviewable during PRs.
- **What it contributed:** Reduced scope creep and produced concise PR diffs that were easy for peer reviewers to inspect and approve.

---

### Prompt 6 — Peer Review Classification

- **Representative Prompt Text:**
> "Review this peer-review comment against docs/lab-02/specification.md and the current implementation. Determine whether it is a required correction, optional improvement, or outside Lab 2 scope. Do not modify code until the classification is justified."

- **Why I used it:** To evaluate peer review feedback critically through specification-based reasoning rather than blindly obeying review comments.
- **What it contributed:** AI helped distinguish a reviewer interpretation from an explicit Lab 2 requirement and supported a specification-based response without introducing unnecessary routing dependencies outside Lab 2 scope.

---

### Prompt 7 — Final Test/Evidence Audit

- **Representative Prompt Text:**
> "Inspect the actual repository test files and compare them with docs/lab-02/tests.md. Verify every referenced test file and test ID exists. Verify test counts and PASS claims against actual execution results. Do not invent missing evidence. Report inconsistencies without modifying implementation."

- **Why I used it:** To eliminate documentation hallucination, ensuring that plausible documentation was not presented as evidence until repository files and execution results were verified.
- **What it contributed:** AI was used to cross-check documentation claims against physical repository files and actual execution results, helping identify unsupported or stale references (verifying strictly the 9 actual Lab 2 test files and the exact 115/115 PASS test result).

---

### Prompt 8 — Final Submission Audit

- **Representative Prompt Text:**
> "Audit the Lab 2 repository against the Lab Sheet Parts 1–9. Identify missing documentation, peer-review evidence, screenshots, test evidence, traceability gaps, or scope violations. Use the actual repository as evidence. READ-ONLY: do not modify files."

- **Why I used it:** To switch AI from a developer role to a rigorous final QA and submission auditor prior to submission.
- **What it contributed:** Completed the transition from AI coding assistant to submission-quality auditor, ensuring all submission artifacts (`tests.md`, `ai-use.md`, `reviewer.md`) were aligned, complete, and specification-compliant.

---

## 4. Human Accountability

> **Central Principle**: *AI was treated as an engineering assistant, not as the authority for requirements, correctness, or acceptance.*

To maintain complete accountability for the TokTickIT codebase, the following principles were strictly enforced:

- The canonical Lab 2 specification remained the source of truth for implementation requirements, while the Lab Sheet defined the submission requirements.
- AI did not define project requirements or architectural boundaries.
- Human decisions were required for ambiguous requirements, scope trade-offs, and technical design.
- All AI suggestions and code edits were manually reviewed before implementation.
- Automated tests were executed locally via terminal commands to verify claims against raw output logs.
- Peer review remained exclusively a human review gate (`Pilaiwan3492`).
- AI was prohibited from approving Pull Requests or self-merging code into `lab2-staging`.
- Final documentation and traceability claims were checked against actual repository evidence.
- Scope exclusions (such as real password login, CSRF protection, and URL-based routing) defined in `specification.md` were respected even when AI could suggest out-of-scope features.
- Human oversight provided the final verification of compliance with project specifications and academic requirements.

---

## 5. Reflection

### 5.1 Better Prompts Produced Better Engineering Results
Prompts that contained explicit source-of-truth instructions, strict scope boundaries, TDD rules, and read-only constraints produced significantly more reliable engineering outputs than generic implementation requests. Specific operational constraints prevented unnecessary code abstractions and kept implementation focused on acceptance criteria.

### 5.2 AI Can Be Confidently Wrong
AI models can generate plausible-sounding documentation or code that contains subtle inaccuracies, such as citing non-existent unit test files or overclaiming automated accessibility contrast testing. Checking generated claims against physical repository files and terminal execution logs was essential to maintain evidence integrity and avoid unsupported claims.

### 5.3 AI Should Not Remove Human Accountability
Engineering responsibility—including requirement interpretation, scope decisions, code acceptance, peer review, and final merge decisions—remained strictly human responsibilities. AI served as a valuable reasoning partner, but human oversight provided the final verification of compliance with project specifications and academic standards.

### 5.4 The Most Useful Role Became Auditing
While AI assisted during initial coding, its most valuable role emerged during **read-only auditing**. Instructing AI to inspect existing code, test suites, and traceability matrices against canonical specifications without permission to modify files provided a structured and repeatable review mechanism that uncovered subtle requirements gaps before final submission.

### 5.5 TDD and Peer Review Improved AI Reliability
Combining Test-Driven Development (TDD) with mandatory human peer review established strong external correctness gates. RED/GREEN automated tests ensured that AI-assisted implementations satisfied concrete verification criteria, while human peer review ensured maintainability, specification alignment, and clean architecture.

---

## 6. Evidence / Usage Summary

| Area | AI Contribution | Human Verification |
|---|---|---|
| Specification | Extracted and structured AC-01..20 and BR-01..27 checklists | Verified completeness against canonical `specification.md` |
| Planning | Mapped GitHub Issues to affected files and test expectations | Confirmed scope boundaries before coding |
| TDD Workflow | Assisted in drafting RED tests and diagnosing failure logs | Executed test suites locally and verified results |
| Implementation | Suggested smallest compliant code fixes | Reviewed code via `git diff` before staging |
| Read-Only Audit | Inspected implementation against specification without modifying files | Validated findings and prioritized corrections |
| Peer Review | Analyzed review comments and helped formulate compliant fixes | Human peer reviewer made approval/merge decisions |
| Traceability | Cross-referenced requirements, test IDs, files, and statuses | Verified physical files and execution logs |
| Documentation | Structured and drafted Lab 2 documentation | Performed final read-through and evidence verification |
