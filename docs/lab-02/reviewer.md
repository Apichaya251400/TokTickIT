# Lab 2 — Peer Review

Repository under review: https://github.com/Apichaya251400/TokTickIT  
Branching: every Issue was built on its own feature/docs branch and merged into `lab2-staging` through a reviewed Pull Request. The author does not self-approve or self-merge — all merges into `lab2-staging` require peer review and approval.

---

## My Reviewer

| Field | Value |
|---|---|
| **Name** | Pilaiwan Churdchu |
| **Student ID** | 67070503492 |
| **GitHub username** | [@Pilaiwan3492](https://github.com/Pilaiwan3492) |
| **Their repository** | https://github.com/Pilaiwan3492/TokTickIT |
| **Association on this repository** | Collaborator / Peer Reviewer |

**Author of this repository**: Aphichaya Klinhual — 67070503447 — [@Apichaya251400](https://github.com/Apichaya251400).

---

## Reviews I Received

Eleven Lab 2 Pull Requests were reviewed by [@Pilaiwan3492](https://github.com/Pilaiwan3492). All eleven were approved and merged into `lab2-staging`. Quotations below are excerpts from the review bodies.

| Pull Request | Review | Comment received | My response |
|---|---|---|---|
| **[#21](https://github.com/Apichaya251400/TokTickIT/pull/21)** — Prisma models, migrations, reference data | Approved 29 Aug | "Prisma schema, migration, seed data, reference APIs, and tests cover requirements." | Merged into `lab2-staging`. |
| **[#24](https://github.com/Apichaya251400/TokTickIT/pull/24)** — Requester context and ticket creation API | Approved 1 Sept (after fix) | Flagged a concurrency risk: `prisma.ticket.count() + 1` could generate duplicate ticket numbers under simultaneous requests; asked for a database-safe unique sequence per BR-01. | Replaced the counter with a PostgreSQL atomic sequence and added an automated concurrency test. All 28 server tests passed; re-reviewed and merged. |
| **[#31](https://github.com/Apichaya251400/TokTickIT/pull/31)** — Ticket detail API and ownership protection | Approved 1 Sept | "Implementation is consistent with Lab 2 requirements and related tests look appropriate." | Merged. |
| **[#32](https://github.com/Apichaya251400/TokTickIT/pull/32)** — Attachment lifecycle API | Approved 2 Sept (after fixes) | Two changes requested: multipart field name was not validated against the file contract; a missing attachment file on disk returned HTTP 200 with zero-filled data instead of an error. | Added strict file form-field validation and a server error for a missing physical file, with 2 regression tests. All 57 server tests passed; re-reviewed and merged. |
| **[#33](https://github.com/Apichaya251400/TokTickIT/pull/33)** — My Tickets API | Approved 3 Sept | "My Tickets API implementation is consistent with Lab 2 requirements and current api-spec.md." | Merged. |
| **[#35](https://github.com/Apichaya251400/TokTickIT/pull/35)** — Requester selection UI | Approved 3 Sept (after fixes) | Two changes requested: `loadTicketsForRequester` wasn't using the explicit requester parameter it received; Application Shell navigation (My Tickets / Create Ticket tabs, active-page indicator) was incomplete. | Made requester context explicit in the reload flow and added the App Shell navigation with active-page state (commit `c0099ec`), plus a regression test for requester-switching. 15/15 client and 71/71 server tests passed; re-reviewed and merged. |
| **[#36](https://github.com/Apichaya251400/TokTickIT/pull/36)** — Create Ticket requester UI | Approved 3 Sept (after 3 rounds) | Seven issues raised across three review rounds: duplicate-ticket risk on attachment-upload retry, a hard-coded ticket-number fallback, re-uploading of already-succeeded attachments on retry, missing reference-data loading/error states, a missing post-success action, retry state not clearing on requester change, and a missing "Development Mode — Testing Context Only" badge. | Fixed across three commits (`06d11ce`, `5b62229`, `77b1005`); each round was re-reviewed before the final approval. |
| **[#37](https://github.com/Apichaya251400/TokTickIT/pull/37)** — My Tickets and Ticket Detail UI | Approved 3 Sept | "My Tickets, Ticket Detail, requester isolation, filtering/sorting/pagination... all look good." | Merged. |
| **[#38](https://github.com/Apichaya251400/TokTickIT/pull/38)** — Requester E2E workflow (Playwright) | Approved 4 Sept (after fixes + spec discussion) | Round 1: AC-06 needed combined-filter coverage, AC-03 non-owner access needed a full detail-page check, and attachment download needed to actually trigger and verify a file. Round 2: the AC-03 UI test relied on React internals (`__reactFiber$`) instead of the real UI flow. | Fixed the round-1 items in commit `23a46ea`. For round 2, clarified that Lab 2's UI is a state-driven SPA with no client-side routing, so the backend's 404 ownership check is the correct evidence; the reviewer agreed adding routing was out of scope and approved. |
| **[#40](https://github.com/Apichaya251400/TokTickIT/pull/40)** — Align global page background with UI spec | Approved 5 Sept | "Scope is clean with no unnecessary changes. Good to go!" | Merged. |
| **[#42](https://github.com/Apichaya251400/TokTickIT/pull/42)** — Final Test Plan and Acceptance Traceability | Approved 5 Sept | "Looks good! Good to go!" | Merged into `lab2-staging`. |

### Changes Made in Response to Review
Five of the eleven Pull Requests ([#24](https://github.com/Apichaya251400/TokTickIT/pull/24), [#32](https://github.com/Apichaya251400/TokTickIT/pull/32), [#35](https://github.com/Apichaya251400/TokTickIT/pull/35), [#36](https://github.com/Apichaya251400/TokTickIT/pull/36), [#38](https://github.com/Apichaya251400/TokTickIT/pull/38)) went through at least one round of requested changes before approval — [#36](https://github.com/Apichaya251400/TokTickIT/pull/36) needed three separate rounds covering seven distinct issues, and [#38](https://github.com/Apichaya251400/TokTickIT/pull/38) included a short specification discussion about SPA routing scope that ended with the reviewer accepting the backend-level ownership check as sufficient evidence rather than requiring new routing infrastructure. The remaining Pull Requests ([#21](https://github.com/Apichaya251400/TokTickIT/pull/21), [#31](https://github.com/Apichaya251400/TokTickIT/pull/31), [#33](https://github.com/Apichaya251400/TokTickIT/pull/33), [#37](https://github.com/Apichaya251400/TokTickIT/pull/37), [#40](https://github.com/Apichaya251400/TokTickIT/pull/40), [#42](https://github.com/Apichaya251400/TokTickIT/pull/42)) were approved without changes. All eleven Pull Requests are approved and merged into `lab2-staging`.

---

## Reviews I Gave

| Field | Value |
|---|---|
| **Partner name** | Pilaiwan Churdchu |
| **Partner student ID** | 67070503492 |
| **Partner GitHub username** | [@Pilaiwan3492](https://github.com/Pilaiwan3492) |
| **Partner repository** | https://github.com/Pilaiwan3492/TokTickIT |

I reviewed fourteen Lab 2 Pull Requests on my partner's repository. Thirteen were approved on first submission; one ([#38](https://github.com/Pilaiwan3492/TokTickIT/pull/38)) required a fix and re-review.

| Pull Request I reviewed | Comment I gave | Their response |
|---|---|---|
| **[#33](https://github.com/Pilaiwan3492/TokTickIT/pull/33)** — Specification with attachment flow and API contracts | Approved, with a technical note to keep the `/api/v1/` route prefix aligned between client and server during implementation. | Author acknowledged the note. |
| **[#34](https://github.com/Pilaiwan3492/TokTickIT/pull/34)** — API specification for requester MVP | Approved; verified the Given-When-Then acceptance criteria and API contracts. | Author thanked reviewer. |
| **[#36](https://github.com/Pilaiwan3492/TokTickIT/pull/36)** — Planned test strategy | Approved; verified test levels, tooling choices, and traceability in `tests.md`. | Author acknowledged. |
| **[#37](https://github.com/Pilaiwan3492/TokTickIT/pull/37)** — Prisma schema and migrations | Approved; verified entity coverage, enums, foreign-key relationships, indexes, and soft-removal fields. | Author acknowledged. |
| **[#38](https://github.com/Pilaiwan3492/TokTickIT/pull/38)** — Seed data for categories, requesters, and systems | Changes requested. Seed data was missing a 4th active requester, 1 inactive requester (`Eve`), and a 6th related system per Labsheet Section 5.3. | Author updated `seed.ts` to add the missing requesters and system; re-reviewed and approved once the counts matched the labsheet. |
| **[#39](https://github.com/Pilaiwan3492/TokTickIT/pull/39)** — Requester selector UI and context persistence | Approved; verified Section 8.1 compliance — `localStorage` persistence, active-only filtering, UX states, and brand colors. | Author acknowledged. |
| **[#40](https://github.com/Pilaiwan3492/TokTickIT/pull/40)** — Backend ticket ownership guard | Initially questioned HTTP 403 vs 404 and query-parameter vs header for requester context. | Author clarified the approved specification defines 403 and a query-parameter (`?requesterId=`); reviewer re-checked the handout, confirmed the original implementation was correct, and approved without requiring changes. |
| **[#41](https://github.com/Pilaiwan3492/TokTickIT/pull/41)** — Create ticket feature with validation | Approved the initial submission; re-reviewed after the author added active categories/systems reference endpoints and integer ID validation. | Author updated routes and validation; re-review approved. |
| **[#42](https://github.com/Pilaiwan3492/TokTickIT/pull/42)** — My Tickets list, search, filter, sort, pagination | Approved; verified list, search, filters, priority sorting, pagination, and Vitest coverage. | Author merged. |
| **[#43](https://github.com/Pilaiwan3492/TokTickIT/pull/43)** — Ticket detail read-only view | Approved; verified detail view, attachment rendering, and UI states. | Author merged. |
| **[#44](https://github.com/Pilaiwan3492/TokTickIT/pull/44)** — Attachment upload and validation | Approved; verified size/count/MIME constraints and form handling. | Author merged. |
| **[#45](https://github.com/Pilaiwan3492/TokTickIT/pull/45)** — Attachment download, soft removal, confirmation modal | Approved; verified the soft-removal reason modal, download handler, and test coverage. | Author merged. |
| **[#46](https://github.com/Pilaiwan3492/TokTickIT/pull/46)** — Test suite restructuring and evidence | Approved; verified Vitest/Playwright structure and execution evidence. | Author merged. |
| **[#47](https://github.com/Pilaiwan3492/TokTickIT/pull/47)** — Peer review and submission package | Approved; verified the final submission documentation and evidence integrity. | Author merged. |

---

## Final Status

All eleven Pull Requests on my repository are approved and merged into `lab2-staging`, including PR [#42](https://github.com/Apichaya251400/TokTickIT/pull/42) (Final Test Plan and Acceptance Traceability). All fourteen Pull Requests reviewed on my partner's repository are approved and merged. No unresolved review items remain on any Pull Request in either repository, completing the Lab 2 peer review workflow.
