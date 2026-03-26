# QGenie 2.0 — Frontend

React 19 single-page application for QGenie 2.0, built with Create React App + craco.

---

## Stack

| Component | Technology |
|-----------|-----------|
| Framework | React 19 (Create React App + craco) |
| Styling | Tailwind CSS 3 |
| UI Components | Radix UI primitives + shadcn/ui |
| State | Zustand |
| Data fetching | React Query (TanStack Query) |
| HTTP client | axios |
| Code editor | Monaco Editor |
| Charts | Recharts |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |

---

## Project Structure

```
frontend/src/
├── App.js                         # Root router + QueryClientProvider
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx            # Project nav sidebar
│   │   ├── TopBar.jsx             # Header with user menu + notifications
│   │   ├── ChatbotPanel.jsx       # Sliding AI chat panel (SSE stream)
│   │   └── ProjectLayout.jsx      # Per-project layout wrapper
│   ├── modules/
│   │   ├── ToscaModule.jsx        # Tosca XML → Playwright conversion
│   │   ├── TestGenModule.jsx      # Jira AC → Gherkin BDD generation
│   │   ├── RCAModule.jsx          # Failure root cause analysis
│   │   ├── ImpactModule.jsx       # Commit test impact analysis
│   │   └── RegressionModule.jsx   # Regression suite optimisation
│   └── shared/
│       ├── CenteredDialog.jsx
│       ├── StepProgress.jsx       # SSE step progress indicator
│       └── JobStatusBadge.jsx
├── hooks/
│   ├── useAuth.js                 # Login, logout, current user
│   ├── useJobs.js                 # Job list, job result, job SSE stream
│   ├── useProjects.js             # Project list + CRUD
│   └── useSSE.js                  # Generic EventSource hook
├── lib/
│   ├── api.js                     # Axios instance + interceptors
│   ├── auth.js                    # Token storage helpers
│   ├── demo-data.js               # Mock data for Demo Mode
│   └── utils.js                   # cn(), date formatting, etc.
├── pages/
│   ├── LoginPage.jsx
│   ├── ProjectDashboard.jsx
│   ├── MyJobsPage.jsx
│   └── AdminPage.jsx
└── store/                         # Zustand stores
    ├── appStore.js                # Theme, demo mode, sidebar state
    ├── jobStore.js                # Active job + SSE events
    ├── chatStore.js               # Chat session + messages
    └── notificationStore.js      # Notification bell state
```

---

## Quick Start

### Prerequisites
- Node.js >= 18
- Yarn >= 1.22 (`npm install -g yarn`)

### Install and run

```bash
cd frontend
yarn install
cp .env.example .env     # or create .env manually (see below)
yarn start               # http://localhost:3000
```

### Build for production

```bash
yarn build               # output: build/
```

---

## Environment Variables

Create a `frontend/.env` file:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

In production, set this to your deployed backend URL (Azure Container Apps / App Service).

> This is a Create React App project — only `REACT_APP_*` variables are injected at build time. Do **not** use `NEXT_PUBLIC_*` prefixes.

---

## Docker

### Build and run locally

```bash
docker build -t qgenie-frontend .
docker run -p 3000:80 -e REACT_APP_BACKEND_URL=http://localhost:8000 qgenie-frontend
```

The Dockerfile builds the React app and serves it with nginx on port 80.

---

## Auth Flow

1. User submits email + password on `/login`
2. Frontend POSTs to `POST /api/v1/auth/login` as `application/x-www-form-urlencoded`
3. Response `access_token` is stored in `localStorage`
4. All axios requests inject `Authorization: Bearer <token>` via an interceptor
5. On any 401 response the interceptor clears localStorage and redirects to `/login`

---

## SSE Streaming

The frontend opens an `EventSource` connection for both job progress and chat responses. Since `EventSource` cannot send custom headers, the JWT is passed as a query parameter:

```
GET /api/v1/jobs/{job_id}/stream?token=<jwt>
GET /api/v1/chat/stream/{session_id}?token=<jwt>
```

**Job stream events** (parsed from `event.data`):
```json
{"event": "step", "step": "PARSING", "status": "running", "message": "...", "partial_output": null}
{"event": "done", "job_id": "...", "result_url": "/api/v1/jobs/.../result"}
```

**Chat stream events**:
```json
{"type": "token", "token": "Hello"}
{"type": "done", "citations": [{"title": "...", "url": "..."}]}
```

---

## Demo Mode

Demo Mode is available to **Super Admin** accounts only (toggle in the header). When on, API calls are intercepted and return mock data from `src/lib/demo-data.js` — no backend connection required.

---

## Scripts

| Command | Description |
|---------|-------------|
| `yarn start` | Start dev server on port 3000 |
| `yarn build` | Production build to `build/` |
| `yarn test` | Run test suite |
