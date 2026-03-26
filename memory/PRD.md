# QGenie 2.0 — Product Requirements Document

## Original Problem Statement
Build the complete QGenie 2.0 frontend — a production-grade enterprise UI for QA automation at TD Bank TCoE.

**Requested Stack:** Next.js 14 with App Router, TypeScript, Tailwind CSS, Radix UI, Zustand, React Query, Monaco Editor, TanStack Table, Recharts.

> **Note:** Previous agent built a React SPA (CRA + react-router-dom) instead of Next.js 14. Architecture divergence is tracked but not blocking feature delivery.

---

## User Personas
- **QA Engineers**: Run AI modules (Tosca, TestGen, RCA, Impact, Regression) on their projects
- **Test Leads**: Monitor jobs, review results, manage test plans
- **Admins**: Manage users, project access, and module availability per project
- **Developers**: Trigger impact/regression analysis against commits and PRs

---

## Core Modules (5 AI Modules)
| Module | Path | Purpose |
|--------|------|---------|
| Tosca Conversion | `/projects/:id/tosca` | Convert Tosca XML to Playwright TypeScript |
| Test Generation | `/projects/:id/test-gen` | Generate Gherkin BDD from Jira stories |
| Failure RCA | `/projects/:id/rca` | AI root cause analysis from pipeline logs |
| Impact Analysis | `/projects/:id/impact` | Commit-level test impact & risk scoring |
| Regression Optimizer | `/projects/:id/regression` | Smart regression suite reduction |

---

## What's Been Implemented

### Session 1 (Initial Build)
- React SPA scaffold with Tailwind, Zustand, React Query, Axios
- Sidebar, TopBar, ChatbotPanel, ProjectLayout
- All 5 AI Module pages (with demo data simulation)
- LoginPage, AdminPage, ProjectDashboard, ProjectsPage
- TD Bank styling: green `#006B3C`, dark sidebar `#0D1F14`
- Light/Dark mode toggle (persisted)
- Demo mode toggle (mocked data)
- JWT auth flow (demo: admin@tdbank.com / admin123, user@tdbank.com / test123)

### Session 2 (Feb 2026 — 7 P0 Fixes)
- ✅ **`timeAgo` utility** — Fixed "421d ago" timestamp display (relative time: 2h ago, 25m ago, etc.)
- ✅ **`CenteredDialog` shared component** — Replaced all bare `Dialog.Root` usage; uses overlay flex-centering to avoid CSS transform traps
- ✅ **My Jobs page** at `/projects/:projectId/jobs` — Shows all jobs for current project with TanStack Table; columns: Job ID, Module, Status, Triggered By, Executed; click row → open that module
- ✅ **Admin: Manage Modules** — "Modules" button in Projects tab opens dialog with 5 `@radix-ui/react-switch` toggles per project; disabled modules hidden from Sidebar nav
- ✅ **Notification Bell** — Radix DropdownMenu showing project-specific job notifications (seeded from DEMO_RECENT_JOBS); unread badge; Mark all read; Clear all; Click notification → navigate to module
- ✅ **Browser (Chrome) push notifications** — `Notification` Web API integration; permission requested on first bell click; fires when job completes/fails
- ✅ **SSE cleanup** — `useChatSSE` hook now exposes `cleanup()` with `timerRef` + `mountedRef`; ChatbotPanel calls cleanup on unmount
- ✅ **Coverage Gap removed** — Deleted the Coverage Analysis accordion from TestGenModule

### Demo data timestamps
- DEMO_RECENT_JOBS now uses dynamic timestamps relative to `Date.now()` so notifications always show realistic "2h ago", "25m ago" etc.

---

## Architecture

```
/app/frontend/src/
├── App.js                     ← Routes including /projects/:id/jobs
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx        ← Module nav + My Jobs link + module enable/disable
│   │   ├── TopBar.jsx         ← Project selector, Notification bell, User menu
│   │   ├── ChatbotPanel.jsx   ← SSE cleanup on unmount
│   │   └── ProjectLayout.jsx
│   ├── shared/
│   │   ├── CenteredDialog.jsx ← Reusable centered Radix Dialog wrapper
│   │   ├── StepProgress.jsx
│   │   ├── JobStatusBadge.jsx
│   │   ├── FeedbackWidget.jsx
│   │   └── LoadingSpinner.jsx
│   └── modules/
│       ├── ToscaModule.jsx
│       ├── TestGenModule.jsx  ← Coverage Gap removed; CenteredDialog for Jira sub-tasks
│       ├── RCAModule.jsx
│       ├── ImpactModule.jsx   ← CenteredDialog for CI/CD inject
│       └── RegressionModule.jsx ← CenteredDialog for export/inject
├── hooks/
│   ├── useAuth.js
│   ├── useJobs.js             ← simulate() dispatches useNotificationStore + browser notification
│   ├── useProjects.js
│   └── useSSE.js              ← cleanup() with timerRef + mountedRef
├── lib/
│   ├── api.js
│   ├── auth.js
│   ├── demo-data.js           ← Dynamic timestamps for DEMO_RECENT_JOBS
│   └── utils.js               ← timeAgo(), requestNotificationPermission(), showBrowserNotification()
├── pages/
│   ├── AdminPage.jsx          ← Manage Modules dialog with Switch toggles
│   ├── LoginPage.jsx
│   ├── ProjectDashboard.jsx
│   ├── ProjectsPage.jsx
│   └── MyJobsPage.jsx         ← NEW: per-project job listing
└── store/
    └── index.js               ← useAppStore (projectModules), useNotificationStore
```

---

## Key Credentials (Demo)
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@tdbank.com | admin123 |
| Member | user@tdbank.com | test123 |

---

## Prioritized Backlog

### P0 — Completed ✅
All 7 fixes from Session 2

### P1 — Next Sprint
- Connect frontend to FastAPI backend (turn Demo mode OFF)
- Real SSE at `/api/v1/jobs/{id}/stream?token=` for live pipeline progress
- Persistent notifications via API (`GET /api/v1/notifications`)
- Real Jira OAuth integration (fetch stories from live Jira)

### P2 — Future
- Mobile responsive layout
- WebSocket for live job updates across tabs
- Export My Jobs data to CSV
- Job re-run from My Jobs page
- Architecture migration: React SPA → Next.js 14 App Router (as originally requested)
- Admin: per-user module access (not just per-project)
- Audit log page in Admin panel
