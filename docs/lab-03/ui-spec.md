# Sprint 3 UI Specification: TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 3 (Sprint 3)
- **Document Status**: Approved UI Specification
- **Design System**: Zen Green Design Language (Reusing Lab 2 Tokens)

---

## 1. Design Tokens & Styling Guide

### 1.1 Color Palette (Zen Green)
- **Primary Brand**: `#15803d` (Zen Green 700), `#16a34a` (Zen Green 600)
- **Surface & Background**: `#f8fafc` (Light Slate), `#ffffff` (Card White)
- **Text Primary**: `#0f172a` (Slate 900)
- **Text Muted**: `#64748b` (Slate 500)
- **Border / Divider**: `#e2e8f0` (Slate 200)

### 1.2 Status & Priority Badges
- **Status Badges**:
  - `NEW`: `#0284c7` (Sky Blue)
  - `OPEN`: `#2563eb` (Blue)
  - `IN_PROGRESS`: `#d97706` (Amber)
  - `WAITING_FOR_REQUESTER`: `#854d0e` (Dark Yellow)
  - `RESOLVED`: `#16a34a` (Zen Green)
  - `CLOSED`: `#475569` (Slate Grey)
  - `REOPENED`: `#c026d3` (Purple)
  - `CANCELLED`: `#dc2626` (Red)
- **Priority Badges**:
  - `LOW`: `#16a34a` (Green)
  - `MEDIUM`: `#d97706` (Amber)
  - `HIGH`: `#ea580c` (Orange)
  - `URGENT`: `#dc2626` (Red)
- **Role Badges**:
  - `REQUESTER`: `#0284c7` (Sky Blue)
  - `IT_STAFF`: `#16a34a` (Zen Green)
  - `ADMINISTRATOR`: `#7c3aed` (Violet)

---

## 2. Application Shell & Role Navigation

### 2.1 Navigation Header
- **Branding**: TokTickIT logo with Zen Green accent.
- **Development Requester Selector**: Completely REMOVED.
- **User Profile Area**:
  - Display Authenticated User Name (e.g. `Michael Brown`).
  - Display Role Badge (`IT Staff`, `Requester`, or `Administrator`).
  - Logout Button: Triggers session invalidation and redirects to `/login`.
- **Role-Based Navigation Links**:
  - **Requester**: `My Tickets`, `Create Ticket`.
  - **IT Staff**: `My Queue`, `Create Ticket`.
  - **Administrator**: `User Management` (primary destination), `Ticket Lookup` (read-only Ticket Detail access by ticket number or direct link).

> Administrators do not see the IT Staff Ticket Queue. Read-only Ticket Detail access exists so Administrators can review Internal Notes and accept Ticket Ownership per Handout §4.5, and is reached through `Ticket Lookup` or a direct URL, not through the IT Staff queue.

---

## 3. Screen Specs, Modes & Required Feedback (Handout §8.6)

### 3.1 Screen Modes & State Matrix

| Screen Name | Supported Modes | Processing / Loading | Validation Error | Success Feedback | Empty / No Results | Forbidden (403) | Not Found (404) | Conflict (409) / Failure (500) |
|---|---|---|---|---|---|---|---|---|
| **Login (`/login`)** | View, Edit | Spinner on Submit button | Red text under email/password | Redirect to home/password-change | N/A | Generic safe error banner | N/A | Safe error banner |
| **Password Change (`/change-password`)** | View, Edit | Spinner on Submit button | Password strength & confirm password alerts | Success banner + redirect to home | N/A | Mandatory change block message | N/A | Validation alert banner |
| **IT Queue (`/staff/queue`)** | View | Skeleton table rows | Alert banner for invalid query params | Refresh toast on claim/assign | "No tickets match your filters" banner | "Access Denied" page | N/A | Alert banner |
| **Requester Ticket Detail (`/tickets/:id`)** | View, Edit (own comments) | Inline spinner on comment post | Inline validation under comment box | Success toast on comment post / resolve indicator | "No comments yet" placeholder | "Forbidden Access" page | "Ticket Not Found" page | Alert banner |
| **Staff Ticket Detail (`/staff/tickets/:id`)** | View, Edit (IT Staff) / View Read-Only (Admin) | Inline spinner on status/claim buttons | Field inline validation | Success toast on status/priority/owner update | "No notes yet" placeholder | "Forbidden Access" page | "Ticket Not Found" page | Alert banner |
| **Admin Users (`/admin/users`)** | View, Create, Edit | Modal submit spinner | Inline modal validation | Success toast & user list refresh | "No users found" list state | "Access Denied" page | N/A | Alert modal for duplicate email / self-deactivation |

---

### 3.2 Login & Mandatory Password Change
- **Login View (`/login`)**:
  - Centered Zen Green card with Email and Password inputs.
  - Client-side validation: Required fields, valid email format.
  - Safe error feedback for invalid credentials or inactive accounts.
- **Mandatory Change Password View (`/change-password`)**:
  - Displayed automatically if logged-in user has `requiresPasswordChange = true`.
  - Inputs: Current Password, New Password, Confirm New Password.
  - Password strength validation: Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (matching Handout mockup).

### 3.3 IT Staff Ticket Queue (`/staff/queue`)
- **Search & Filter Toolbar**:
  - Search box: Matches ticket number (`TKT-2026-XXXXXX`), summary, description.
  - Status Filter: Dropdown with all 8 statuses.
  - Requested Priority Filter: Dropdown (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - IT Priority Filter: Dropdown (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - Ownership Tabs: `All Tickets`, `My Queue`, `Unassigned`.
- **Desktop View**: Zen Green table with sortable columns (`Ticket No`, `Created Date`, `Summary`, `Category`, `Req Priority`, `IT Priority`, `Status`, `Owner`).
- **Mobile Responsive View**: Responsive cards displaying key summary, status badge, priority badge, and owner.
- **Pagination Controls**: Page numbers, `Previous`, `Next` buttons, page size limit indicator.

### 3.4 Ticket Detail Screens

#### 3.4.1 Requester Ticket Detail (`/tickets/:id`)
- Read-only ticket information (ticket number, category, related system, requested priority, current status, summary, description).
- Attachments section carried over from Lab 2 (upload and download preserved).
- **Public Comments Tab**: Green border/badge (`Shared with IT Staff`). Input rejects empty/whitespace content with inline alert.
- **"Problem Appears Resolved" Button**: Enabled only when status is `IN_PROGRESS` or `WAITING_FOR_REQUESTER`. Shows a confirmation dialog, then a success toast. The status badge does NOT change (BR-05).
- **"Request Reopen" Button**: Enabled only when status is `RESOLVED` or `CLOSED`. Same confirmation and toast behaviour; status badge does NOT change.
- Internal Notes tab is NOT rendered for Requesters.

#### 3.4.2 Staff Ticket Detail (`/staff/tickets/:id`)
- **Grouped Information Layout**: Read-only problem description grouped cleanly.
- **Editable Operational Fields (IT Staff only)**:
  - Ticket Owner Dropdown (`Unassigned`, or list of active IT Staff and Administrator users per Handout §4.5) + `Claim` button.
  - IT Priority Dropdown (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - Status Action Buttons (only permitted transitions enabled according to Status Transition Matrix).
- **Read-Only View for Administrator**:
  - Administrators view ticket data, Public Comments, and Internal Notes, may post comments and notes, and may be assigned Ticket Owner. IT Priority dropdown and Status Action Buttons are rendered disabled, and the corresponding endpoints reject Administrator requests with `403 Forbidden` (authorization is enforced server-side, not by the disabled control).
- **Requester Signal Indicators**: When `requesterResolvedIndicatedAt` or `requesterReopenRequestedAt` is set, an informational banner shows the signal and its timestamp so IT Staff can act.
- **Communication Tabs**:
  - **Public Comments Tab**: Green border/badge (`Shared with Requester`). Rejects empty/whitespace content with inline alert.
  - **Internal Notes Tab**: Amber warning background with lock icon (`Private — Visible ONLY to IT Staff & Admin`). Rejects empty/whitespace content.
  - **Attachments Tab**: Shows attached files from Lab 2.

### 3.5 Administrator User Management (`/admin/users`)
- **User List Table**: Displays `Name`, `Email`, `Role Badge`, `Status Badge` (`Active`/`Inactive`), and `Edit` action.
- **Search & Filter Bar**: Search by name or email, role filter dropdown (`All`, `Requester`, `IT Staff`, `Administrator`).
- **Create User Modal**: Modal with inputs for `Full Name`, `Email Address`, `Role Dropdown`, `Active Toggle`, and `Initial Password`.
- **Edit User Modal**: Modal to edit name, email, role, and toggle active status.
- **Reset Initial Password Action**: Modal allowing Admin to set a new initial password (automatically sets `requiresPasswordChange = true`).

---

## 4. Visual Inspection Checklist

- [x] **Design System Consistency**: Colors, typography, spacing, and buttons match Zen Green design tokens.
- [x] **Role-Based Navigation**: Authenticated user sees ONLY permitted navigation destinations.
- [x] **Badge Styling**: Status, Priority, and Role badges use correct colors and contrast.
- [x] **Editable vs Read-only Fields**: Clear visual distinction between editable dropdowns/inputs and read-only text fields.
- [x] **Comment & Note Distinction**: Public Comments and Internal Notes are visually distinct (Green vs Amber warning style).
- [x] **Responsive Behavior**: All major screens tested and readable on Desktop (1920x1080), Tablet (768x1024), and Mobile (375x812) viewports without horizontal overflow.
- [x] **Form Validation Placement**: Error messages appear directly under corresponding inputs with red text and accessible ARIA attributes.
- [x] **Focus & Accessibility**: Form inputs show visible focus outlines and support keyboard navigation (`Tab`, `Enter`, `Escape`).
