# TokTickIT Zen Green UI Specification & Visual Inspection Checklist

## 1. Purpose & Scope

This document defines the visual design tokens, component states, accessibility standards, responsive rules, screen state behaviors (initial, loading, validation, submitting, success, failure, retry, empty, no-results), and visual inspection criteria for the TokTickIT Requester MVP in Lab 2.

Lab 2 does not implement real authentication. The selected Development Requester is a temporary testing context and must be clearly labeled as a testing mechanism.

---

## 2. Zen Green Color Tokens & Typography

| Token / Element | Color Value / Style | Usage / Description |
|---|---|---|
| **Primary Green** | `#006B3C` | App header background, primary buttons (`Create Ticket`, `Submit`, `Continue`), brand emphasis. |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, focus accents, links, hover states. |
| **Pale Green** | `#EAF6EF` | Selected item highlights, success callout background, subtle section emphasis. |
| **Page Background** | `#F5F7F6` | Quiet, near-white page background across all screens. |
| **Surface / Cards** | `#FFFFFF` | White background for cards, forms, tables with subtle border (`#D5DDD8`) and restrained shadow. |
| **Text Primary** | `#24272A` | Dark charcoal-green for readable high-contrast main body text. |
| **Text Secondary** | `#5F6863` | Muted charcoal-green for labels, helper text, and secondary details. |
| **Editable Field** | `#FFFFFF` | White background with clear neutral border (`#D5DDD8`). |
| **Read-Only Field** | `#F0F4F2` | Distinct soft gray-green shading indicating non-editable state. |
| **Error State** | `#B42318` | Dark red text and field borders; message appears directly below the invalid input. |
| **Warning State** | `#F59E0B` | Amber callout container or badge for non-blocking warnings (e.g. upload retry). |
| **Success State** | `#006B3C` | Green confirmation callout with readable text and non-color icon indicators. |

---

## 3. Global Application Shell & Navigation

### 3.1 Application Shell Elements & Header Layout
The Application Shell is persistent across all screens and contains:
1. **TokTickIT Application Identity**: Brand logo and application title (`TokTickIT`).
2. **Navigation Tabs**:
   - `My Tickets` navigation link/tab (route: `/tickets`).
   - `Create Ticket` navigation link/tab (route: `/tickets/create`).
3. **Clear Active-Page Indication**: The current active page navigation tab is visually distinguished using:
   - Background highlight in `#0B7A46` (or bottom accent border).
   - Bold text font weight (`font-weight: 600`).
   - Accessible ARIA attribute: `aria-current="page"`.
4. **Current Development Requester Identity Display**:
   - Prominently displays the active testing identity (e.g. `Requester: Alice Smith`).
   - Accompanied by a badge: `Development Mode - Testing Context Only`.
5. **Change Requester Action**:
   - Button or link (`[Change Requester]`) located adjacent to identity display.
   - Clicking `[Change Requester]` re-opens the Requester Selection modal/screen and reloads requester-specific ticket data upon selection change.
6. **Responsive Mobile Navigation (<768px)**:
   - On screens smaller than 768px, navigation links collapse into a touch-friendly mobile navigation bar or accessible hamburger menu.
   - All navigation controls fit within viewport width with **0 horizontal page scrolling**.
7. **Keyboard Accessibility & Focus Indicators**:
   - All links, buttons, and navigation items are reachable via `Tab` key.
   - Active focus state displays a high-contrast `#0B7A46` focus indicator ring (min 2px width).

### 3.2 Button Hierarchy
- **Primary Action**: `#006B3C` background, white text (`Submit Ticket`, `Continue`, `Create Ticket`).
- **Secondary Action**: Outlined neutral border, transparent background (`Cancel`, `Back to My Tickets`, `Clear Filters`).
- **Destructive Action**: `#B42318` background, white text (`Remove Attachment`).
- **Disabled Control**: Muted gray `#C4CDC7` background, text opacity 60%, cursor `not-allowed`.
- **Busy State**: Button shows inline loading spinner + text (e.g. `Submitting...`), disabled to prevent duplicate submissions.

---

## 4. Screen-by-Screen State Behavior

### 4.1 Development Requester Selection Screen
1. **Initial / Loading State**: Displays `Loading active requesters...` spinner while fetching `GET /api/requesters/active`.
2. **Success / Selectable State**: Populates dropdown with active Development Requesters. Displays explanatory callout: *"Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication will be introduced in Lab 3."*
3. **Empty State**: If zero active requesters are returned, displays: `No active Development Requesters available.` with a `[Retry]` button.
4. **Failure State**: If API fetch fails (500/network error), displays safe error banner: `Unable to load Development Requesters. Please check server connection.` with a `[Retry]` button.
5. **Selection & Confirmation**: Selecting a requester enables `[Continue]` button. Clicking `[Continue]` saves `selectedRequesterId` to LocalStorage, sets header context, and redirects to My Tickets.

---

### 4.2 Create Ticket Screen
1. **Initial / Reference Data Loading**: Displays loading indicator while fetching Category (`GET /api/categories`) and Related System (`GET /api/related-systems`) options.
2. **Form Render & Field States**:
   - **Ticket Number**: Read-only (`Auto-generated after submission`), shaded `#F0F4F2`.
   - **Created Date**: Read-only (`Current Timestamp`), shaded `#F0F4F2`.
   - **Requester**: Read-only (`Selected Requester Name`), shaded `#F0F4F2`.
   - **Category (* Required)**: Select dropdown.
   - **Related System (* Required)**: Select dropdown.
   - **Requested Priority (* Required)**: Radio or badge options `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
   - **Summary (* Required)**: Text input with character counter `0 / 120` (10–120 chars required).
   - **Description (* Required)**: Resizable textarea with character counter `0 / 2000` (20–2,000 chars required).
   - **Attachment Selection Dropzone**: File picker accepting `JPG`, `JPEG`, `PNG`, `WEBP`, `PDF` up to `5,000,000 bytes` (5 MB).
3. **Field Validation Failure State**: If Summary < 10, Description < 20, or invalid attachment is selected, red error message appears directly below the invalid input and Submit is blocked.
4. **Invalid Attachment Error State**: If user selects a file $> 5,000,000$ bytes or unpermitted type (e.g. `.exe`), dropzone displays error: `File "setup.exe" is invalid. Allowed types: JPG, PNG, WEBP, PDF under 5 MB.` (AC-04).
5. **Submitting Busy State**: Clicking `[Submit Ticket]` disables Submit button, displays spinner `Submitting ticket...`, and prevents duplicate click submission.
6. **Success State**: After successful creation (`201 Created`), displays success banner: `Ticket TKT-2026-000001 created successfully!` with options `[View Ticket Detail]` or `[Create Another Ticket]`.
7. **Server Failure State**: If server returns 500 error, displays safe error banner `Failed to create ticket. Please try again.` without disclosing internal stack/DB traces. All entered form inputs and selected files are preserved (AC-15).
8. **Attachment Upload Failure Retry State**: If ticket is created (`201`) but attachment upload fails, displays warning banner: `Ticket TKT-2026-000001 saved, but attachment upload failed.` Form values and file selections are retained so user can retry uploading on Ticket Detail (AC-15, BR-18).

---

### 4.3 My Tickets Screen
1. **Initial / Loading State**: Displays table skeleton loader or spinner while fetching `GET /api/tickets`.
2. **Loaded List State**: Displays paginated ticket list for current Requester context. Desktop (>=992px) table columns: `Ticket No | Created Date | Summary | Category | Related System | Requested Priority | Status | Actions`. Mobile (<768px): Vertical stacked card layout.
3. **Search & Filter State**: Real-time filtering by search keyword (`ticketNumber`, summary, description), Category, Related System, Requested Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and Status.
4. **Sorting State**: Sort dropdown options (`createdAt DESC` default, `updatedAt`, `ticketNumber`, `requestedPriority` severity). Secondary sort is `id DESC`.
5. **Pagination State**: Displays `Page X of Y`, `Page Size` (10/20/50), `[Previous]` and `[Next]` controls. Changing search/filter/sort resets page to 1.
6. **Empty State (Zero Tickets)**: If Requester has 0 tickets, displays empty card: `You have not created any IT support tickets yet.` with a `[Create Ticket]` button.
7. **No-Results State (Search/Filter Match 0)**: If search/filter criteria match 0 tickets, displays: `No tickets match your filter criteria.` with a `[Clear Filters]` button.
8. **Failure State**: If API fails, displays safe error message with a `[Reload]` button.

---

### 4.4 Ticket Detail Screen
1. **Initial / Loading State**: Displays loading spinner while fetching `GET /api/tickets/:id`.
2. **Read-Only Ticket Details**: All ticket fields (`ticketNumber`, `requester`, `category`, `relatedSystem`, `requestedPriority`, `currentStatus`, `createdAt`, `updatedAt`, `summary`, `description`) are read-only with `#F0F4F2` shading.
3. **Active Attachments Section**:
   - Lists active files with filename, size, upload date, mimeType.
   - Provides `[Download]` and `[Remove]` actions.
4. **Soft Removal Modal State**:
   - Clicking `[Remove]` opens confirmation modal requiring `Removal Reason` (5–200 characters).
   - If reason < 5 chars, displays validation message: `Removal reason must be at least 5 characters.`
5. **Soft-Removed Attachment State**:
   - Soft-removed files render in attachment list with badge `Removed`, removal date, and `removalReason`.
   - `[Download]` and `[Preview]` buttons are disabled.
6. **Non-Owner Access State (404)**: Accessing a non-owned ticket ID displays error page: `Ticket not found.` (`404 Not Found`).

---

## 5. Visual Inspection Checklist

This checklist must be executed during manual visual testing and Playwright screenshot verification:

- [ ] **Application Shell & Nav**: `TokTickIT` branding visible; `My Tickets` and `Create Ticket` tabs present; active page indicates `#0B7A46` highlight and `aria-current="page"`; current Requester name displayed; `[Change Requester]` action available.
- [ ] **Color Tokens**: App header uses `#006B3C`, active accents use `#0B7A46`, pale section emphasis uses `#EAF6EF`, page background uses `#F5F7F6`.
- [ ] **Field Styling**: Editable input fields have white background `#FFFFFF` and border `#D5DDD8`. Read-only fields have distinct shading `#F0F4F2`.
- [ ] **Validation Placement**: Required field labels show red asterisk `*`. Validation error messages appear directly below the associated input field in dark red `#B42318`.
- [ ] **Button Hierarchy**: Primary actions use `#006B3C`, secondary actions use outlined neutral, destructive actions use `#B42318`. Busy buttons display inline loading spinner and disabled state.
- [ ] **Text & Layout Clipping**: Labels, badges, and long attachment filenames wrap cleanly without text truncation or clipping across all viewports.
- [ ] **Element Overlap**: Input fields, dropdown options, dropzones, and buttons maintain proper margin/padding without overlapping.
- [ ] **Horizontal Page Scroll**: Mobile viewport (<768px) layout vertical stacks cleanly with 0 horizontal page overflow scroll.
- [ ] **Responsive Viewports**:
  - Desktop (>=992px): Multi-column layout, centered workspace (max-width 1280px), full data table on My Tickets.
  - Tablet (768-991px): 2-column stacked form layout.
  - Mobile (<768px): Single-column vertical card layout with collapsible mobile navigation.
- [ ] **Badges**: Requested Priority badges (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) and Status badge (`NEW`) use distinct readable visual styling.
- [ ] **Attachment Controls**: Dropzone accepts drag-and-drop or file select; active attachments display download/remove buttons; soft-removed attachments display disabled controls with removal metadata.
- [ ] **Missing / Feedback States**: Loading skeletons, empty ticket list, no-results filter state, and safe 500 server error banners render correctly.

---

## 6. Screenshot Artifact Paths

Playwright visual inspection screenshots must be stored under:
`artifacts/lab-02/screenshots/`
- `requester-selection/`
- `create-ticket/`
- `my-tickets/`
- `ticket-detail/`
