# Sprint 4 UI Specification: TokTickIT User Interfaces, Dashboards, and Workspaces

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 4 (Sprint 4)
- **Document Status**: Approved UI Specification
- **Repository Branch**: `feature/lab4-spec-dd`

---

## 1. Visual Theme & Application Shell

Lab 4 preserves and extends the **Zen Green Design System** introduced in Labs 2 and 3.

### Design Tokens
- **Primary Brand Color**: Zen Green (`#198754`, `bg-success`, `text-success`)
- **Secondary Accent**: Light Green Tint (`#E8F5E9`, `bg-light`)
- **Status Badges**:
  - `NEW`: Info Blue (`bg-info text-dark`)
  - `OPEN`: Primary Blue (`bg-primary text-white`)
  - `IN_PROGRESS`: Warning Amber (`bg-warning text-dark`)
  - `WAITING_FOR_REQUESTER`: Dark Slate (`bg-dark text-white`)
  - `RESOLVED`: Success Green (`bg-success text-white`)
  - `CLOSED`: Secondary Grey (`bg-secondary text-white`)
  - `REOPENED`: Danger Red (`bg-danger text-white`)
  - `CANCELLED`: Light Muted (`bg-light text-muted border`)
- **Priority Badges**:
  - `URGENT`: Red Badge (`bg-danger text-white`)
  - `HIGH`: Amber Badge (`bg-warning text-dark`)
  - `MEDIUM`: Green Badge (`bg-success text-white`)
  - `LOW`: Grey Badge (`bg-secondary text-white`)

### Application Header Navigation Shell
- Brand Logo: **TokTickIT** with subtitle `IT Service Desk`.
- Role-Appropriate Navigation Links:
  - **Requester**: `Dashboard` (`/requester/dashboard`), `My Tickets` (`/tickets/my-tickets`), `Create Ticket` (`/tickets/new`).
  - **IT Staff**: `Dashboard` (`/staff/dashboard`), `IT Queue` (`/staff/queue`), `Create Ticket` (`/tickets/new`).
  - **Administrator**: `Dashboard` (`/staff/dashboard`), `IT Queue` (`/staff/queue`), `User Management` (`/admin/users`).
- User Identity Capsule: Shows authenticated User Name, Role Badge (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), and `Logout` action button.
- Development Selector is **strictly removed**.

---

## 2. IT Staff Dashboard (`/staff/dashboard`)

### Layout & Component Structure
1. **Welcome Header**: Displays greeting `Welcome back, [Name]!` with current date.
2. **Operational Metric Cards Grid** (4 Metric Cards):
   - **Unassigned Tickets**: Displays count. Subtext: `Click to view unassigned queue`.
   - **My Assigned Tickets**: Displays count. Subtext: `Assigned to you`.
   - **Today's Actions**: Displays count of actions taken today. Subtext: `Recorded today`.
   - **Urgent Workload**: Displays count. Subtext: `Urgent workload`.
3. **Main Content Row**:
   - **Left Column (My Recent Workload)**: List of max 5 recent tickets assigned to current staff with ticket number, summary, priority badge, status badge, and drill-down link (`/staff/tickets/:id`).
   - **Right Column (Quick Actions & Recent Actions Log)**: Direct action buttons (`View Queue`, `Create Ticket`) and recent actions taken feed (max 5 actions with ticket link).

### Drill-Down Navigation Rules
- Clicking **Unassigned Tickets Card** → Navigates to `/staff/queue?owner=unassigned`.
- Clicking **My Assigned Tickets Card** → Navigates to `/staff/queue?owner=my_queue`.
- Clicking **Today's Actions Card** → Navigates to `/staff/queue?view=today_actions`.
- Clicking **Urgent Workload Card** → Navigates to `/staff/queue?itPriority=URGENT`.
- Clicking any ticket row → Navigates directly to `/staff/tickets/:id`.

---

## 3. Requester Dashboard (`/requester/dashboard`)

### Layout & Component Structure
1. **Welcome Header**: Displays greeting `Welcome back, [Name]! Here's the status of your requests.`
2. **Requester Metric Cards Grid** (4 Metric Cards):
   - **My Open Tickets**: Displays count of open tickets owned by user.
   - **Waiting for My Response**: Displays count of tickets in `WAITING_FOR_REQUESTER`.
   - **In Progress**: Displays count of tickets currently being worked on.
   - **Recently Resolved**: Displays count of resolved tickets in past 30 days.
3. **Recent Tickets & Attention-Required Worklists**:
   - **Attention Required Tickets**: Dedicated list of tickets in `WAITING_FOR_REQUESTER` status with ticket number, summary, priority badge, updated date, and direct action link.
   - **Recent Tickets List**: List of max 5 requester's recent tickets with status badge, priority badge, updated date, and direct detail link.
   - **Quick Action Button**: `+ Create Ticket` leading to ticket creation form.

### Dashboard Interaction States
- **Loading State**: Displays skeleton cards or animated loading indicators without triggering page layout shifts.
- **Empty State**: Displays `0` for empty metrics and clear explanatory text for empty lists (e.g. `"No recent tickets"`, `"No tickets require attention"`).
- **Forbidden State**: Displays safe `403 Access Denied` UI feedback if unauthorized access is attempted.
- **Failure State**: Displays generic retryable error alert banner with a `[ Retry ]` button.
- **Not Found State**: Navigates gracefully to fallback list view if a targeted ticket has been removed.

---

## 4. Ticket Detail Actions Taken Workspace

Located inside Ticket Detail (`/staff/tickets/:id` or `/tickets/:id`), positioned below Ticket Information and above Public Comments / Internal Notes.

### Components & Controls
1. **Workspace Header**: Section title `Actions Taken Work Log` with action counter badge (`X actions recorded`).
2. **Create Action Form** (Collapsible / Modal):
   - **Description**: Textarea, 1 to 2000 chars (validated after trimming whitespace), mandatory.
   - **Result**: Textarea, 1 to 2000 chars (validated after trimming whitespace), mandatory.
   - **Assignee Selector**: Dropdown listing active IT Staff and Administrator accounts (`isActive = true AND role IN ('IT_STAFF', 'ADMINISTRATOR')`). The Assignee Selector is optional and provides an explicit `Unassigned` state (`null`). Inactive/Requester users excluded.
   - **Follow-Up Required Switch**: Checkbox (`Follow-up needed`).
   - **Follow-up Note Box**: Appears conditionally when `Follow-up needed` is checked. Required field (1 to 1000 chars, validated after trimming whitespace).
   - **Attachment Notes**: Optional text input for image/log file references.
   - **Action Buttons**: `[ Save Action ]` (creates Action in `PENDING` status) and `[ Cancel ]`.
3. **Actions Taken Feed List**:
   - Each action rendered in a structured card with `Action Date/Time`, `Performed By` badge (showing name + role), `Assignee` tag, status badge (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), description, result, follow-up note (if present with amber warning border), and attachment notes.
   - Actions ordered chronologically by `createdAt ASC`, tie-break `id ASC`.
   - Action controls for authorized IT Staff and Administrators: Status transition controls enforcing permitted next statuses per Section 8.2 (`PENDING` → `[ Start Work ]` / `[ Complete Action ]` / `[ Cancel Action ]`; `IN_PROGRESS` → `[ Complete Action ]` / `[ Cancel Action ]`; terminal states `COMPLETED` and `CANCELLED` render no status transition buttons) and `[ Edit ]`. `COMPLETED` and `CANCELLED` `ActionTaken` records disable status transition buttons, but permit content editing via `[ Edit ]` modal using optimistic concurrency (`expectedUpdatedAt`), unless parent Ticket is `CANCELLED`.
   - On `CANCELLED` tickets, all Action Taken creation, editing, and status controls are hidden and disabled.

### Action Submission Reliability
- The client MUST generate one unique `Idempotency-Key` for each intended Action submission.
- The same key MUST be reused when the same submission is retried after a recoverable network failure.
- A new key MUST be generated only for a new user-intended submission.
- The Save Action control SHOULD be disabled/debounced while the initial submission is in flight.
- Backend idempotency remains the authoritative duplicate-submission protection.

### Requester Read-Only View
- Requesters can view Actions Taken for Tickets they are authorized to access (owned tickets).
- Requesters see Actions Taken in read-only mode.
- Create Action Form, Edit Action, Assignee Selector, Complete Action, Cancel Action, and Status Transition controls are strictly NOT rendered for Requesters.

---

## 5. Ticket Workflow & Resolution UI

### Status Controls
- Render only permitted next-status controls according to Section 8.1 Ticket Status Transition Matrix.
- Disabled or hidden UI controls MUST NOT be treated as the security boundary; server-side validation strictly enforces authorization and transitions.
- `RESOLVED` status transition button requires satisfying the server-side Resolution Gate (>= 1 COMPLETED ActionTaken or non-empty staff `resolutionNote`).
- Resolution Gate failures display a clear inline error message (`"Cannot resolve ticket without at least one completed Action Taken or formal resolution note."`).
- `CANCELLED` renders as a terminal state and exposes no further status controls.
- `409 Conflict` (`STALE_UPDATE`) displays a stale-update alert banner with a `[ Refresh / Reload ]` button to fetch latest ticket state.

### Resolution Note Input Contract
- When an IT Staff member or Administrator selects the `RESOLVED` status transition, the UI renders a **Resolution Note** text area (1 to 2000 characters).
- If the Ticket already has at least 1 completed `ActionTaken` record, the `resolutionNote` input is optional.
- If the Ticket has 0 completed `ActionTaken` records, the `resolutionNote` input is MANDATORY (validated with trimmed whitespace).
- If submitted without a completed `ActionTaken` and with an empty `resolutionNote`, the UI displays an inline validation error (`"Cannot resolve ticket without at least one completed Action Taken or formal resolution note."`) and blocks request submission.

### Requester Indicators
- Requester "Problem Appears Resolved" indication (`POST /api/tickets/:id/resolve-indicator`) is advisory and MUST NOT change the Ticket status to `RESOLVED`.
- The indicator records `requesterResolvedIndicatedAt` and allows IT Staff or Administrators to review the Requester's indication before executing a formal Ticket status transition.

### Role Behavior
- IT Staff and Administrators follow the operation-level authorization matrix and can execute formal status transitions.
- Requesters CANNOT execute formal ticket status transitions; they may post public comments or send the advisory "Problem Appears Resolved" indication.

---

## 6. Responsive Breakpoints & Viewport Rules

The interface MUST render seamlessly across three standard viewports:

| Viewport Name | Target Dimensions | Responsive Adaptations |
|---|---|---|
| **Desktop** | `1920×1080` (16:9) | Full 4-card metric grid, side-by-side dashboard columns, full data tables with sort headers. |
| **Tablet** | `768×1024` (3:4) | 2×2 metric grid, stacked dashboard columns, horizontally scrollable data tables. |
| **Mobile** | `375×812` (9:19.5) | Single-column metric card stack, touch-friendly action buttons, responsive ticket & action cards. |

---

## 7. Visual & Accessibility QA Checklist

- [ ] **No Clipping**: All card text, metrics, badges, and buttons render cleanly without text truncation or container overflow.
- [ ] **No Overlap**: Interactive elements have sufficient spacing to prevent accidental activation and maintain accessible interaction.
- [ ] **No Unintended Horizontal Overflow**: Page body width remains strictly bounded to viewport width without relying on body-level overflow clipping (`overflow-x: hidden`). Data tables MUST use isolated responsive scroll wrappers (`overflow-x: auto`).
- [ ] **Visible Focus States**: Keyboard focus ring (`2px solid #198754`) visible on all buttons, links, inputs, and selectors.
- [ ] **Non-Color Status Cues**: Statuses and priorities use distinct text labels, icons, and badges alongside color coding.
