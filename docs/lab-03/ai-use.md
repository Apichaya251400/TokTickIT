# Sprint 3 AI Usage Report & Reflection: TokTickIT

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 3 (Sprint 3)
- **Document Status**: Final AI Usage Report & Reflection

---

## 1. AI Usage Philosophy & Approach

Throughout Lab 3 development, AI was utilized primarily as a reasoning, analysis, and verification assistant rather than an unguided code generator. All prompts were designed to require spec-driven gap analysis, security tracing, and evidence verification before proposing any code or configuration changes.

---

## 2. Representative Prompts

### Prompt 1: Requirement to Implementation Analysis
> **"I’m implementing Lab 3 based on the provided specification. Before changing anything, analyze this requirement against my current implementation. Identify which parts are already satisfied, which parts are missing, and what evidence from the code supports your conclusion. Do not propose changes until the gap is clearly identified."**

- **Intent & Purpose**: Conducted systematic gap analysis between the Lab 3 specification requirements and existing codebase prior to writing code.

---

### Prompt 2: Authorization & Security Flow Tracing
> **"Trace the authorization flow for this endpoint from authentication middleware through role checking and the route handler. I want to verify whether the implementation actually enforces the Lab 3 authorization matrix rather than relying on UI restrictions. Point out any path that could allow an unauthorized role to reach the operation."**

- **Intent & Purpose**: Verified that authorization decisions are enforced server-side through authentication and role checks, rather than relying on frontend UI restrictions.

---

### Prompt 3: Database & Migration System Integrity
> **"Review this Prisma schema, SQL migration, and seed logic as one system. Check whether the migration preserves existing Lab 2 data and whether running the seed repeatedly can create duplicates. Explain the reasoning and identify concrete tests that would provide evidence for these properties."**

- **Intent & Purpose**: Investigated schema evolution, pure SQL migration safety, data preservation, and idempotent database seeding, and identified concrete tests needed to provide evidence for these properties.

---

### Prompt 4: Requirement-to-Test Traceability & Coverage Gap Analysis
> **"Compare these acceptance criteria with my existing tests. Build a requirement-to-test gap analysis and identify cases that are only superficially tested. Pay particular attention to negative cases, authorization boundaries, database state, and concurrency. Do not assume that a passing test automatically proves the requirement."**

- **Intent & Purpose**: Identified untested edge cases, negative authorization boundary checks, and gaps beyond passing assertions.

---

### Prompt 5: Concurrent Administrator Safety Guard & Request Lifecycle Trace
> **"Two administrators can attempt to deactivate each other at nearly the same time. My E2E test sometimes observes HTTP 401 instead of the expected 400. Trace the complete request lifecycle, including authentication middleware, database state, transaction timing, and the last-active-admin guard. Determine whether the 401 is a legitimate fail-safe outcome or evidence of a broken safety guard, and explain what the test should actually assert."**

- **Intent & Purpose**: Investigated request lifecycle timing during concurrent administrator deactivation in `AC-ADMIN-05`, differentiating middleware authentication lockout (`401`) from route-level safety guard rejection (`400`).

---

### Prompt 6: UI & Responsive Visual QA Verification
> **"Review this UI implementation against the Lab 3 responsive requirements. Instead of judging the page only from the desktop layout, identify which elements are likely to fail at tablet and mobile widths and explain what evidence should be captured to verify the behavior. Keep the recommendations limited to issues supported by the specification."**

- **Intent & Purpose**: Evaluated responsive component layout, overflow prevention, and element placement across Desktop (`1920x1080`), Tablet (`768x1024`), and Mobile (`375x812`) viewports.

---

### Prompt 7: Regression Risk Analysis
> **"I have merged several Lab 3 features into the staging branch. Analyze the changed areas and identify which existing Lab 2 behaviors are most likely to regress. For each risk, suggest a concrete regression test or verification step rather than making assumptions about the implementation."**

- **Intent & Purpose**: Identified potential Lab 2 regression risks after integrating Lab 3 authentication and navigation changes, then used regression tests to verify the affected workflows.

---

### Prompt 8: Final Verification & Release Checklist
> **"I’m preparing the final Lab 3 release from lab3-staging to main. Based on the specification, test strategy, repository structure, and current test results, create a final verification checklist. Separate automated evidence from manual/documentation checks, and flag anything that cannot be proven from the available test results."**

- **Intent & Purpose**: Built a comprehensive release readiness checklist distinguishing automated test evidence from manual UI/documentation verification.

---

## 3. Reflection

I used AI primarily as a reasoning and verification assistant rather than as a replacement for implementation decisions. I used it to trace request lifecycles, compare implementation details against Lab 3 requirements, identify test coverage gaps, and analyze edge cases such as concurrent administrator deactivation.

One useful lesson was that a test failure does not necessarily mean that the implementation is incorrect. For example, the concurrent administrator test exposed a timing-dependent request outcome: authentication could observe a deactivated account and return `401` before the request reached the administrator safety guard. Instead of changing the backend behavior solely to satisfy the original assertion, I traced the request lifecycle and adjusted the test to verify the underlying safety property: concurrent operations must never leave the system without an active Administrator.

I still reviewed the proposed reasoning against the source code, test results, and Lab 3 requirements before applying changes. When the evidence did not fully support an AI suggestion, I treated it as a hypothesis to investigate rather than as a conclusion. This helped me use AI as an engineering assistant while keeping the final implementation and engineering decisions under my responsibility.
