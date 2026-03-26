# QGenie 2.0 — PRD & Implementation Record

## Original Problem Statement
Build QGenie 2.0 — a production-grade enterprise QA automation frontend for TD Bank (TCoE). React SPA with 5 AI-powered modules: Tosca Conversion, Test Generation, Failure RCA, Impact Analysis, Regression Optimization. Full 3-panel layout with fixed left sidebar (240px), fixed top bar (56px), fixed right chatbot panel (380px). Dark/light mode toggle. Demo data toggle for developers. JWT email+password auth.

## Architecture

### Tech Stack
- **Framework**: React 18 (CRA with CRACO) — SPA, NOT Next.js (incompatible with Emergent env)
- **Routing**: React Router DOM v6
- **State**: Zustand v5 (app/job/chat stores) + TanStack Query v5 (server state)
- **UI**: Tailwind CSS + Radix UI primitives (Dialog, Tabs, DropdownMenu, Checkbox)
- **Tables**: TanStack Table v8
- **Charts**: Recharts v3
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **File Upload**: React Dropzone v15
- **Toast**: Sonner
- **Icons**: Lucide React

### Color System (TD Bank)
- Primary: #007A33 (td-green)
- Dark Primary: #005C26 (td-dark-green)
- Sidebar Dark: #0D1F14 (sidebar-bg)
- Card Dark: #1A3626 (card-bg)
- Light Accent: #EEF7F2 (td-light)
- Mid Accent: #C8E6D5 (td-mid)

## What's Been Implemented (2025-03-26)

### Authentication
- JWT token stored in localStorage (TOKEN_KEY, USER_KEY)
- Demo mode: validates against DEMO_USERS array in demo-data.js
- Production mode: posts to /api/v1/auth/login (form-encoded)
- Auto-redirect on 401 via Axios interceptor
- Demo credentials: admin@tdbank.com/admin123, user@tdbank.com/test123

### Pages
- `/login` — Dark green branded login with demo quick-login buttons
- `/projects` — 2-column project card grid
- `/projects/:id` — Project dashboard (5 module cards + recent jobs table + quick actions)
- `/projects/:id/tosca` — Tosca Conversion module
- `/projects/:id/test-gen` — Test Generation module
- `/projects/:id/rca` — Failure RCA module
- `/projects/:id/impact` — Impact Analysis module
- `/projects/:id/regression` — Regression Optimizer module
- `/admin` — Admin panel (Users + Projects tabs, guarded for admin only)

### Layout Components
- **Sidebar**: Fixed 240px, dark green bg, all 5 module nav links, active state with green border, recent jobs at bottom
- **TopBar**: Fixed 56px, project selector dropdown, Demo ON/OFF toggle, dark/light mode toggle, notification bell, user avatar with dropdown (Admin Panel link for admins)
- **ChatbotPanel**: Fixed 380px right, KB/File/Repo context tabs, proactive suggestion chips, SSE streaming chat, message bubbles with citations
- **ProjectLayout**: Outlet-based layout wrapping all project pages

### Module Components (all 5 fully implemented)
1. **ToscaModule**: File dropzone/Git path, framework/browser/URL config, step progress simulation, DiffEditor output (Monaco), quality report accordion, download/commit actions
2. **TestGenModule**: Jira story fetch, AC preview, domain selector, step progress, Gherkin editor output, TanStack Table for test data, coverage gap accordion, Jira sub-tasks dialog
3. **RCAModule**: Pipeline run ID input, step progress, classification badge + confidence meter, root cause narrative, fix actions with P1/P2/P3, evidence tabs (Logs/Metrics/JTMF), Recharts line chart
4. **ImpactModule**: Commit SHA input, step progress, risk banner, donut chart (Recharts), filterable test plan table (TanStack Table), coverage gaps, CI/CD inject dialog
5. **RegressionModule**: JTMF suite selector, risk profile JSON, step progress, summary banner, score distribution bar chart, test scoring table with expandable rows, flaky tests with sparklines, coverage tab chart, executive summary

### Shared Components
- **StepProgress**: Horizontal stepper with pending/running/complete/error states, animated pulse for running step
- **FeedbackWidget**: Star rating, thumbs up/down, suggestion correction textarea, submit
- **JobStatusBadge**: QUEUED/RUNNING/COMPLETE/FAILED with appropriate colors
- **LoadingSpinner**: Animated green spinner

### Demo Data (src/lib/demo-data.js)
- DEMO_USERS (3 users with different roles/access)
- DEMO_PROJECTS (3 TD Bank projects)
- DEMO_RECENT_JOBS (7 jobs across projects)
- DEMO_TOSCA_ORIGINAL + DEMO_TOSCA_GENERATED (realistic Playwright conversion)
- DEMO_JIRA_STORY + DEMO_TESTGEN_FEATURE + DEMO_TESTGEN_DATA (Gherkin + examples table)
- DEMO_RCA_RESULT (full RCA with logs, metrics, JTMF tests)
- DEMO_IMPACT_RESULT (test plan with direct/indirect/excluded)
- DEMO_REGRESSION_RESULT (1358→891 test reduction, flaky tests, sparklines)
- DEMO_CHAT_RESPONSES (6 contextual chatbot responses)

## Prioritized Backlog

### P0 (Must do next)
- Connect to real FastAPI backend when API is available
- Replace demo mode with real OAuth2 login

### P1 (High priority)
- Real SSE streaming for job progress (currently simulated)
- Real chatbot SSE from /api/v1/chat/stream
- File upload to backend for Tosca conversion
- Git repository connection in ChatbotPanel

### P2 (Medium priority)
- Monaco editor syntax highlighting for Gherkin (language mode)
- Low-confidence step highlighting in ToscaModule diff
- Session expiry handling / token refresh
- Print/PDF export for reports

### P3 (Nice to have)
- Keyboard shortcuts (Cmd+K for quick navigation)
- Analytics dashboard for admin
- Notification system with websocket for job completion
- Mobile responsive version
