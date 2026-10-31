# EVD-E2E-06: Final Product Hardening & Quality Assurance Checklist

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 4 (Sprint 4)
- **Increment Goal**: Prove final end-to-end business flows and harden the application for final release integration.
- **Verification Timestamp**: `2026-10-31T03:45:00+07:00`
- **Target Branch**: `feature/lab4-e2e-hardening`
- **Target Base**: `lab4-staging` (`d47446d`)

---

## 1. Executive Quality Assurance Summary

Prior to final release integration into `lab4-staging` and preparation for Sprint 4 evaluation, the TokTickIT application underwent comprehensive product hardening. Every checklist requirement below is verified by automated, reproducible test suites rather than unverified self-assertions.

| Hardening Requirement | Automated Test ID | Verification Method | Outcome | Status |
|---|---|---|---|---|
| **Zero Browser Console Errors** | `TEST-HARDEN-01` | Playwright `console` and `pageerror` event listener across all 8 major views | `0` errors detected | **VERIFIED PASS** |
| **Zero Broken Links / Dead Routes** | `TEST-HARDEN-02` | Automated traversal and navigation of all navigation links and views | All 8 SPA routes valid, 0 404s | **VERIFIED PASS** |
| **Zero UI Placeholders / TODOs** | `TEST-HARDEN-03` | Automated DOM tree regex scan for `TODO`, `TBD`, `Lorem ipsum`, `Under construction` | `0` placeholder strings | **VERIFIED PASS** |
| **Interactive Controls & Accessible Labels** | `TEST-HARDEN-04` | Behavior verification on representative buttons & audit of all `<button>` elements for non-empty text/aria-label | Representative buttons functional, all buttons have valid accessible labels | **VERIFIED PASS** |
| **Responsive Layout Integrity** | `TEST-RESP-01`, `TEST-RESP-E2E` | Geometry checks across Desktop (`1920x1080`), Tablet (`768x1024`), and Mobile (`375x812`) | Zero page-level horizontal overflow | **VERIFIED PASS** |
| **Touch Targets $\ge$ 44&times;44px** | `TEST-RESP-01-MOBILE`, `TEST-RESP-E2E` | Bounding box height/width assertions on mobile navigation and action buttons | Minimum touch target $\ge 44\text{px}$ enforced | **VERIFIED PASS** |
| **Visible Focus Ring Accessibility** | `TEST-A11Y-01`, `TEST-QA-06` | Computed style evaluation on keyboard Tab navigation | Exact `2px solid #198754` with `2px` offset | **VERIFIED PASS** |
| **Recoverable Form Data Preservation** | `TEST-FAIL-01` | Validation error & transient network drop retry verification | Form fields preserved in DOM | **VERIFIED PASS** |
| **Idempotency Deduplication** | `TEST-IDEM` | Double-submission with identical `Idempotency-Key` header | DB contains exactly 1 ActionTaken | **VERIFIED PASS** |
| **Optimistic Concurrency Protection** | `TEST-CONC-01` | Mid-flight update collision verification | Returns `409 Conflict (STALE_UPDATE)` with safe refresh | **VERIFIED PASS** |

---

## 2. Detailed Verification Criteria & Reproducible Evidence

### 2.1 Zero Browser Console Errors (`TEST-HARDEN-01`)
- **Reproducible Command**:
  ```bash
  npx playwright test e2e/lab-04/final-product-hardening.spec.ts -g "TEST-HARDEN-01"
  ```
- **Verification Logic**: Attaches `page.on("console")` and `page.on("pageerror")` handlers. Logs into each role (`john.staff@toktick.it`, `alice@example.com`, `admin@toktick.it`) and visits:
  1. Login Page (`/`)
  2. IT Staff Dashboard (`staff-dashboard`)
  3. IT Staff Ticket Queue (`staff-queue`)
  4. Ticket Detail View (`staff-ticket-detail`)
  5. Requester Dashboard (`requester-dashboard`)
  6. My Tickets List (`my-tickets`)
  7. Create Ticket View (`create-ticket`)
  8. Administrator User Management (`user-management`)
- **Result**: `0` console errors and `0` unhandled page exceptions logged.

### 2.2 Zero Broken Links / Dead Routes (`TEST-HARDEN-02`)
- **Reproducible Command**:
  ```bash
  npx playwright test e2e/lab-04/final-product-hardening.spec.ts -g "TEST-HARDEN-02"
  ```
- **Verification Logic**: Clicks all `<a href>` elements and SPA navigation buttons across all views. Confirms each destination lands on an authoritative heading/container with HTTP status $< 400$ and zero broken references.
- **Result**: All internal navigation links resolve to valid, active application states.

### 2.3 Zero Unfinished Placeholders (`TEST-HARDEN-03`)
- **Reproducible Command**:
  ```bash
  npx playwright test e2e/lab-04/final-product-hardening.spec.ts -g "TEST-HARDEN-03"
  ```
- **Verification Logic**: Scans `document.body.innerText` against regex pattern `/(?:\b(?:TODO|TBD|FIXME)\b|Lorem\s+Ipsum|Under\s+Construction|Coming\s+Soon)/i`.
- **Result**: `0` matching placeholder strings found across all authenticated role states.

### 2.4 Representative Interactive Buttons Functional & All Buttons Accessible (`TEST-HARDEN-04`)
- **Reproducible Command**:
  ```bash
  npx playwright test e2e/lab-04/final-product-hardening.spec.ts -g "TEST-HARDEN-04"
  ```
- **Verification Logic**: Audits all `<button>` elements in the DOM:
  - Actively executes representative interactive flows (Dashboard metric card, Queue -> Detail, Back buttons, Create Ticket navigation, User Management, Logout).
  - Asserts accessible name is non-empty (`innerText` or `aria-label`) on all rendered buttons.
  - Verifies that disabled buttons are disabled due to explicit business rules (e.g. empty mandatory resolution note, self-deactivation guard).
  - Asserts no unhandled click exceptions occur.
- **Result**: Representative interactive buttons are functional and all rendered buttons have valid accessible labels.

### 2.5 Responsive Integrity & Zero Horizontal Overflow (`TEST-RESP-01`, `TEST-RESP-E2E`)
- **Reproducible Command**:
  ```bash
  npx playwright test e2e/lab-04/responsive-a11y.spec.ts
  ```
- **Verification Logic**: Tests three standard viewports:
  - **Desktop (1920&times;1080)**: 4-card metric grid side-by-side (`b0.y === b1.y`).
  - **Tablet (768&times;1024)**: Responsive 2&times;2 grid, table horizontal scroll wrapper.
  - **Mobile (375&times;812)**: Single-column vertical card stack.
  - Checks `document.documentElement.scrollWidth <= window.innerWidth + 1`.
- **Result**: `scrollWidth <= innerWidth + 1` evaluates to `true` across all viewports.

### 2.6 Touch Targets $\ge$ 44&times;44px (`TEST-RESP-01-MOBILE`, `TEST-RESP-E2E`)
- **Reproducible Command**:
  ```bash
  npx playwright test e2e/lab-04/responsive-a11y.spec.ts -g "TEST-RESP-01-MOBILE"
  ```
- **Verification Logic**: Computes bounding box dimensions on touch targets in mobile viewport (`375x812`), verifying `box.height >= 44` and `box.width >= 44` on form buttons and navigation triggers.
- **Result**: All primary mobile interactive controls satisfy touch target accessibility standards.

### 2.7 Safe Failure, Idempotency & Concurrency Hardening (`TEST-FAIL-01`, `TEST-IDEM`, `TEST-CONC-01`)
- **Reproducible Command**:
  ```bash
  npx playwright test e2e/lab-04/regression-hardening.spec.ts
  ```
- **Verification Logic**:
  - `TEST-FAIL-01`: Diagnostic description and result inputs remain in DOM upon validation failure and network drop.
  - `TEST-IDEM`: Sending two requests with identical `Idempotency-Key` header returns cached `201 Created` with identical body and verifies `prisma.actionTaken.count(...) === 1` in PostgreSQL.
  - `TEST-CONC-01`: Mid-flight DB mutation causes subsequent transition with stale `expectedUpdatedAt` to fail with `409 Conflict (STALE_UPDATE)`, rendering warning banner and recovering cleanly upon clicking "Refresh Ticket".
- **Result**: All safe-failure, idempotency deduplication, and concurrency protection tests pass.

---

## 3. Checklist Sign-off

- [x] **Zero browser console errors** across all authenticated views
- [x] **Zero broken links or dead routes**
- [x] **Zero unfinished UI placeholders** (`TODO`, `TBD`, `Lorem ipsum`, `Under construction`)
- [x] **Representative interactive buttons have functional behavior, and all rendered buttons have valid accessible labels**
- [x] **Responsive layout integrity** (zero page-level horizontal overflow on Desktop, Tablet, Mobile)
- [x] **Touch targets $\ge$ 44&times;44px** enforced on mobile viewport
- [x] **Visible focus rings (`2px solid #198754`)** on keyboard Tab navigation
- [x] **Safe-failure form data preservation**
- [x] **Backend idempotency deduplication** verified directly against database records
- [x] **Optimistic concurrency control (`409 Conflict`)** with safe recovery

---

## 4. Verification Execution & Evidence Lifecycle (`EVD-E2E-01`)

To satisfy rigorous release assurance and prevent unintegrated feature-branch artifacts from posing as final release verification, TokTickIT follows a strict two-stage verification lifecycle for `EVD-E2E-01`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Feature Branch Hardening & PR Review (PR #95)                      │
│ - Branch: feature/lab4-e2e-hardening                                       │
│ - Automated assertions: Assignee DB state, IT_STAFF metadata, Isolation     │
│ - Verified: 72/72 E2E, 282/282 Server, 129/129 Client tests (483 total)    │
│ - CI Pipeline: Green checkmarks on GitHub Actions                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Peer Review Approval & Merge
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Post-Merge Integrated Release Baseline (lab4-staging)              │
│ - Branch: lab4-staging (Target Base d47446d + PR #95 integrated)            │
│ - Re-seed: npm --prefix server run prisma:seed                              │
│ - Final Execution: npx playwright test                                      │
│ - Authoritative Deliverable: artifacts/lab-04/screenshots/e2e-hardening/    │
│   EVD-E2E-01.txt (Final integrated Playwright execution log)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Pre-Merge Hardening Verification (PR #95)**:
   - Verified that all business flows pass locally and on CI.
   - Verified all dynamic state mutations (`E2E-ACT-07`, `E2E-FLOW-08`, `TEST-CONC-01`, `TEST-IDEM`) restore database integrity via `finally` blocks.
   - Regenerated test screenshot and JSON artifacts (`EVD-E2E-02..05`, `EVD-E2E-07`).

2. **Post-Merge Staging Baseline Capture (`EVD-E2E-01.txt`)**:
   - Following peer review sign-off and PR #95 merge into `lab4-staging`, pull latest `lab4-staging`.
   - Execute clean database seed and full Playwright test suite to generate the final integrated `EVD-E2E-01.txt` artifact directly on `lab4-staging`.

