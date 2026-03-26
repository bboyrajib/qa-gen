# QGenie 2.0 — Enterprise QA Intelligence Platform

> AI-powered test automation platform for **TD Bank Technology Centre of Excellence (TCoE)**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Azure SQL](https://img.shields.io/badge/Azure_SQL-SQLAlchemy_2.0-0078D4?logo=microsoftazure)](https://azure.microsoft.com/en-us/products/azure-sql)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.x-38BDF8?logo=tailwindcss)](https://tailwindcss.com)

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Prerequisites](#prerequisites)
5. [Local Development Setup](#local-development-setup)
6. [Environment Variables](#environment-variables)
7. [API Reference](#api-reference)
8. [Azure Deployment](#azure-deployment)
9. [Admin Guide](#admin-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

QGenie 2.0 is a full-stack enterprise QA automation platform offering five AI-powered modules:

| Module | Description |
|--------|-------------|
| **Tosca Conversion** | Converts Tosca XML test cases to Playwright TypeScript with RAG enrichment |
| **Test Generation** | Generates Gherkin BDD scenarios from Jira acceptance criteria |
| **Failure RCA** | AI root cause analysis from Datadog/Splunk pipeline logs |
| **Impact Analysis** | Commit-level test impact scoring and blast-radius detection |
| **Regression Optimizer** | Smart regression suite reduction with flakiness-aware prioritization |

Additional capabilities:
- AI chatbot panel with context-aware QA knowledge (RAG-backed)
- Project-scoped job history and notification system
- Admin panel for user/project/module management
- Real-time SSE job progress streaming via Redis pub/sub

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Azure / Cloud                            │
│                                                                   │
│  ┌─────────────────────┐    ┌───────────────────────────────┐    │
│  │  React 19 SPA       │    │  FastAPI Backend               │    │
│  │  (Azure Static Web  │───▶│  (Azure Container Apps)       │    │
│  │   Apps / CDN)       │    │                               │    │
│  │                     │    │  - Email/password JWT (HS256) │    │
│  │  - Tailwind CSS     │    │  - SSE via Redis pub/sub      │    │
│  │  - Zustand (state)  │    │  - 5 AI agent pipelines       │    │
│  │  - React Query      │    │  - Azure OpenAI GPT-4o        │    │
│  │  - TanStack Table   │    │  - Azure AI Search (RAG)      │    │
│  │  - Recharts         │    │  - Datadog / Splunk           │    │
│  │  - Monaco Editor    │    │  - Jira / JTMF / Confluence   │    │
│  │  - Radix UI         │    └──────────┬────────────────────┘    │
│  └─────────────────────┘               │                         │
│                              ┌─────────▼──────────────────────┐  │
│                              │  Azure SQL Database             │  │
│                              │  (SQLAlchemy 2.0 + pyodbc)     │  │
│                              └────────────────────────────────┘  │
│                              ┌─────────────────────────────────┐  │
│                              │  Azure Redis Enterprise          │  │
│                              │  (SSE job stream pub/sub)        │  │
│                              └─────────────────────────────────┘  │
│                              ┌─────────────────────────────────┐  │
│                              │  Azure Blob Storage (ent14)      │  │
│                              │  + Azure AI Search (ent14_index) │  │
│                              └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Backend Directory Structure
```
backend/
├── app/
│   ├── main.py                    # App factory, router mounts, startup bootstrap
│   ├── core/                      # config.py, db.py, auth.py
│   ├── models/                    # SQLAlchemy ORM — all tables prefixed qg_
│   ├── schemas/                   # Pydantic request/response schemas
│   ├── api/                       # FastAPI routers (auth, admin, jobs, projects, …)
│   ├── agents/                    # 5 AI agent pipelines
│   ├── connectors/                # Jira, JTMF, Datadog, Splunk, Confluence
│   ├── rag/                       # Azure AI Search pipeline
│   ├── chatbot/                   # Streaming LLM + chat history
│   └── services/                  # Redis SSE dispatcher, Azure Blob storage
├── tests/
├── Dockerfile
├── requirements.txt
└── .env.example
```

### Frontend Directory Structure
```
frontend/src/
├── App.js                    # Router + QueryClient provider
├── components/
│   ├── layout/               # Sidebar, TopBar, ChatbotPanel, ProjectLayout
│   ├── modules/              # 5 AI module pages
│   └── shared/               # CenteredDialog, StepProgress, JobStatusBadge
├── hooks/                    # useAuth, useJobs, useProjects, useSSE
├── lib/                      # api.js, auth.js, demo-data.js, utils.js
├── pages/                    # LoginPage, AdminPage, ProjectDashboard, MyJobsPage
└── store/                    # Zustand stores (App, Job, Chat, Notification)
```

---

## Features

### User Features
- **5 AI Modules** with step-by-step progress (SSE streaming)
- **My Jobs** — per-project job history; click to open result, re-run with one click
- **Notification Bell** — real-time job completion alerts + Chrome browser push notifications
- **AI Chatbot** — context-aware QA assistant (RAG-backed, cites sources)
- **Dark / Light mode** — persisted per user
- **Monaco Editor** — syntax-highlighted code viewer for generated test files

### Admin Features

**Super Admin** (`role: super_admin`)
- Full platform visibility — sees all projects, all users
- Create/edit/deactivate any user; assign any role including Super Admin
- Grant/revoke per-project access for any user
- Enable/disable AI modules per project
- Demo Mode toggle (Super Admin only)

**Admin** (`role: admin`)
- Sees only projects they created plus projects explicitly assigned to them
- Manage regular users within their own project scope
- Enable/disable AI modules for their own projects
- Cannot see or manage other Admins or Super Admins

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 18 | Use `nvm use 18` (React 19 / CRA) |
| Yarn | >= 1.22 | `npm install -g yarn` |
| Python | 3.11 | Required for backend |
| ODBC Driver 18 | — | For Azure SQL — installed automatically in Docker |
| Docker | >= 24 | For containerized deployment |

---

## Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/td-bank/qgenie-2.0.git
cd qgenie-2.0
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your Azure credentials (see below)
uvicorn app.main:app --reload --port 8000
```

On first startup the backend will:
- Create all `qg_*` tables in Azure SQL automatically
- Create a `super_admin` account using `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` if no users exist

Swagger UI available at: `http://localhost:8000/docs`

### 3. Frontend setup
```bash
cd frontend
yarn install
cp .env.example .env            # Set REACT_APP_BACKEND_URL=http://localhost:8000
yarn start                      # Runs on http://localhost:3000
```

### 4. Demo mode (no backend required)
Log in as **Super Admin** (`admin@tdbank.com` / your bootstrap password) and ensure **Demo Mode is ON** (visible in the header for Super Admin accounts only).

---

## Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and fill in the values below.

```env
# Azure SQL
AZURE_SQL_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=tcp:<server>,1433;Database=<db>;Uid=...;Pwd=...;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-2024-08-06-tpm
AZURE_OPENAI_API_VERSION=2024-10-21

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://<resource>.search.windows.net
AZURE_SEARCH_INDEX_NAME=ent14_index

# Azure Blob Storage
AZURE_BLOB_ENDPOINT_1=https://<account>.blob.core.windows.net/
AZURE_BLOB_CONTAINER_NAME=ent14

# Azure Identity (service principal — for OpenAI / Search / Blob only, NOT user login)
AZURE_CLIENT_ID=<service-principal-client-id>
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_SECRET=<client-secret>

# Redis Enterprise
REDIS_ENDPOINT=<host>:<port>

# JWT Auth (email/password — no Azure AD)
JWT_SECRET_KEY=<run: openssl rand -hex 32>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480

# Bootstrap super_admin (used once on first startup if qg_users is empty)
ADMIN_BOOTSTRAP_EMAIL=admin@tdbank.com
ADMIN_BOOTSTRAP_PASSWORD=<set a strong password>

# Integrations
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=your-service-account@tdbank.com
JIRA_API_TOKEN=<jira-api-token>

JTMF_BASE_URL=https://jtmf.tdbank.internal/api
JTMF_API_TOKEN=<jtmf-token>

DATADOG_API_KEY=<datadog-api-key>
DATADOG_APP_KEY=<datadog-app-key>

SPLUNK_BASE_URL=https://splunk.tdbank.internal
SPLUNK_TOKEN=<splunk-token>

CONFLUENCE_BASE_URL=https://your-org.atlassian.net
CONFLUENCE_EMAIL=your-service-account@tdbank.com
CONFLUENCE_API_TOKEN=<confluence-token>

# Optional webhook HMAC validation
WEBHOOK_SECRET=<optional>
```

### Frontend (`frontend/.env`)
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```
> In production, set to your Azure Container Apps / App Service URL.

---

## API Reference

All routes are prefixed `/api/v1/`. Protected endpoints require `Authorization: Bearer <token>`.
The frontend axios interceptor injects this header automatically. On 401 response the frontend clears localStorage and redirects to `/login`.

---

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/login` | Public | `application/x-www-form-urlencoded` — returns token + user |
| `GET` | `/api/v1/auth/me` | Required | Returns current user profile |
| `POST` | `/api/v1/auth/logout` | Required | Stateless — returns `{"message": "Logged out successfully"}` |

**Login Request:**
```
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin%40tdbank.com&password=MyPassword
```

**Login Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "admin@tdbank.com",
    "name": "QGenie Admin",
    "role": "super_admin",
    "is_admin": true,
    "project_access": null
  }
}
```

> `project_access` is `null` for `super_admin` (all projects), or a UUID array for `admin` / `user`.

---

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects/` | Required | List accessible projects (filtered by role server-side) |
| `GET` | `/api/v1/projects/{project_id}` | Required | Get a single project |
| `POST` | `/api/v1/projects/` | Required | Create a new project |

**Project Object:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "TD Digital Banking",
  "domain_tag": "Payments",
  "jira_project_key": "TDB",
  "member_count": 12,
  "created_at": "2024-09-01T10:00:00Z",
  "created_by": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

---

### Jobs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/jobs/` | Required | List jobs (`?project_id=&limit=`) |
| `GET` | `/api/v1/jobs/{job_id}/result` | Required | Get job result payload |
| `GET` | `/api/v1/jobs/{job_id}/stream?token=` | Required | SSE real-time step progress |
| `POST` | `/api/v1/jobs/tosca-convert` | Required | Submit Tosca XML → Playwright conversion |
| `POST` | `/api/v1/jobs/test-generation` | Required | Submit Jira AC → Gherkin BDD generation |
| `POST` | `/api/v1/jobs/failure-rca` | Required | Submit pipeline failure for RCA |
| `POST` | `/api/v1/jobs/impact-analysis` | Required | Submit commit diff for test impact scoring |
| `POST` | `/api/v1/jobs/regression-optimize` | Required | Submit suite for regression optimisation |

**Job Object:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "type": "tosca-convert",
  "status": "COMPLETE",
  "submitted": "2024-09-01T10:00:00Z",
  "user": "Alex Johnson",
  "project_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

`type` values: `tosca-convert` | `test-gen` | `rca` | `impact` | `regression`
`status` values: `QUEUED` | `RUNNING` | `COMPLETE` | `FAILED`

**Job SSE Stream** (`GET /api/v1/jobs/{id}/stream?token=<JWT>`):
```
data: {"event": "step", "step": "PARSING", "status": "running", "message": "Extracting steps...", "partial_output": null}

data: {"event": "step", "step": "PARSING", "status": "complete", "message": "Extracted 24 IR steps", "partial_output": null}

data: {"event": "done", "job_id": "...", "result_url": "/api/v1/jobs/.../result"}
```

> The `?token=` query param is required because the browser `EventSource` API cannot send custom headers.

---

### Tosca Conversion

**Request body** (`POST /api/v1/jobs/tosca-convert`):
```json
{
  "file_content": "<base64-encoded Tosca XML>",
  "file_name": "checkout.xml",
  "framework": "typescript",
  "browser": "chromium",
  "base_url": "https://myapp.example.com",
  "jira_story_id": "TDB-1482",
  "project_id": "3fa85f64-..."
}
```

**Result** (from `GET /api/v1/jobs/{id}/result`):
```json
{
  "total_steps": 24,
  "converted_steps": 24,
  "low_confidence_steps": 1,
  "compilation_status": "success",
  "output_blob_path": "tosca-convert/<job-id>/checkout.spec.ts"
}
```

---

### Test Generation

**Request body** (`POST /api/v1/jobs/test-generation`):
```json
{
  "jira_story_id": "TDB-1482",
  "domain_tag": "payments",
  "jtmf_suite_id": "suite-payments-001",
  "project_id": "3fa85f64-..."
}
```

**Result:**
```json
{
  "feature_file_path": "test-gen/<job-id>/TDB-1482.feature",
  "data_file_path": "test-gen/<job-id>/TDB-1482_data.json",
  "scenario_count": 7,
  "coverage_gap_lines": ["AC3: Confirm fee waiver for PLT accounts"]
}
```

---

### Failure RCA

**Request body** (`POST /api/v1/jobs/failure-rca`):
```json
{
  "pipeline_run_id": "GH-RUN-99182",
  "failed_test_ids": ["TC-001", "TC-042"],
  "service_tag": "payments-service",
  "failure_timestamp": "2026-02-01T14:28:33Z",
  "project_id": "3fa85f64-..."
}
```

**Result:**
```json
{
  "classification": "code_defect",
  "confidence": 91,
  "narrative": "NullPointerException in PaymentProcessor.java:142 — missing null check on transaction reference",
  "fix_actions": ["Add null guard before accessing txRef", "Add unit test for null transaction reference"],
  "jira_description": "...",
  "fingerprint": "a3f8c1d9e2b7...",
  "jira_ticket": "TDB-9921"
}
```

Classification values: `code_defect` | `infra_failure` | `data_issue` | `env_misconfiguration` | `flaky_test`

---

### Impact Analysis

**Request body** (`POST /api/v1/jobs/impact-analysis`):
```json
{
  "commit_sha": "a3f8c1d9e2b7f4a1c8d3e9f2b5a6c7d4",
  "repository": "td-bank/payments-service",
  "changed_file_paths": ["src/payments/PaymentProcessor.java"],
  "pr_id": "PR-412",
  "project_id": "3fa85f64-..."
}
```

**Result:**
```json
{
  "recommended_tests": [
    {"test_id": "TC-001", "score": 100, "reason": "direct"},
    {"test_id": "TC-087", "score": 25, "reason": "indirect"}
  ],
  "risk_level": "High",
  "coverage_gaps": [],
  "total_recommended": 89,
  "total_full_suite": 1247
}
```

---

### Regression Optimizer

**Request body** (`POST /api/v1/jobs/regression-optimize`):
```json
{
  "jtmf_suite_id": "suite-retail-banking-001",
  "days_history": 90,
  "release_risk_profile": {"high_risk_domains": ["payments", "auth"]},
  "project_id": "3fa85f64-..."
}
```

**Result:**
```json
{
  "optimized_tests": [
    {"test_id": "TC-001", "score": 97.5, "decision": "include", "rationale": "..."},
    {"test_id": "TC-099", "score": 18.0, "decision": "exclude", "rationale": "No coverage overlap, no recent failures"}
  ],
  "flaky_tests": [{"test_id": "TC-055", "pass_rate": 0.62, "flakiness_score": 0.38, "is_flaky": true}],
  "reduction_percent": 68.1,
  "coverage_preservation": 91.4,
  "executive_summary": "Reduced suite by 68.1% while preserving 91.4% coverage."
}
```

---

### Jira Story

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/jira/story/{story_id}` | Required | Fetch story with parsed acceptance criteria |

**Response:**
```json
{
  "id": "TDB-1482",
  "title": "Interac e-Transfer: Add international transfer fee validation",
  "acceptance_criteria": [
    "AC1: Fee calculation displayed before confirmation for amounts > $100 CAD",
    "AC2: Fee waived for Platinum account holders (account type = PLT)"
  ]
}
```

---

### AI Chat Assistant

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/chat/` | Required | Start chat session — returns `session_id` |
| `GET` | `/api/v1/chat/stream/{session_id}?token=` | Required | SSE streaming AI response |

**Chat Request:**
```json
{"message": "Why did the Tosca locator for step 14 fail?", "project_id": "3fa85f64-..."}
```

**Chat Response:**
```json
{"session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"}
```

**Chat SSE Stream** (`GET /api/v1/chat/stream/{session_id}?token=<JWT>`):
```
data: {"type": "token", "token": "The"}

data: {"type": "token", "token": " XPath"}

data: {"type": "done", "citations": [{"title": "TD QA Knowledge Base — Locator Guide", "url": "#"}]}
```

> **Note:** Chat SSE uses `{"type": "token"/"done"}`. Job SSE uses `{"event": "step"/"done"}`. These are distinct formats.

---

### Feedback

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/feedback/` | Required | Submit module output feedback |

**Request:**
```json
{
  "job_id": "3fa85f64-...",
  "module_type": "tosca",
  "rating": 4,
  "thumbs": "up",
  "correction": "The selector for the submit button was wrong"
}
```

`module_type` values: `tosca` | `test-gen` | `rca` | `impact` | `regression`

---

### Admin

> All `/admin/*` endpoints require `is_admin: true`.

#### User Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/users` | List all users |
| `POST` | `/api/v1/admin/users` | Create a user |
| `PATCH` | `/api/v1/admin/users/{user_id}` | Update role, password, status, access |
| `DELETE` | `/api/v1/admin/users/{user_id}` | Deactivate a user |

#### Project Access

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/admin/users/{user_id}/projects/{project_id}` | Grant project access |
| `DELETE` | `/api/v1/admin/users/{user_id}/projects/{project_id}` | Revoke project access |

#### Module Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/projects/{project_id}/modules` | Get enabled modules |
| `PATCH` | `/api/v1/admin/projects/{project_id}/modules` | Set enabled modules |

**Set modules request:**
```json
{"enabled_modules": ["tosca_convert", "test_generation"]}
```
Pass `null` to re-enable all modules.

Valid backend module keys: `tosca_convert` | `test_generation` | `failure_rca` | `impact_analysis` | `regression_opt`

---

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/webhooks/cicd-failure` | HMAC signature | CI/CD pipeline failure → auto RCA job |
| `POST` | `/api/v1/webhooks/pr-commit` | HMAC signature | PR commit push → auto impact analysis job |

Signature validation uses `X-Webhook-Signature: sha256=<hmac>` header with `WEBHOOK_SECRET`.

---

## Module Key Mapping Reference

The frontend AdminPage uses short keys. The backend stores full keys in `qg_projects.enabled_modules`.

| Frontend key | Backend module key | Job `type` value |
|---|---|---|
| `tosca` | `tosca_convert` | `tosca-convert` |
| `test-gen` | `test_generation` | `test-gen` |
| `rca` | `failure_rca` | `rca` |
| `impact` | `impact_analysis` | `impact` |
| `regression` | `regression_opt` | `regression` |

---

## Azure Deployment

### Option A — Recommended: Azure Container Apps

```bash
RG="rg-qgenie-prod"
LOCATION="canadacentral"
ACR="acrqgenieprod"
CAE="env-qgenie-prod"

# Resource group + ACR
az group create --name $RG --location $LOCATION
az acr create --name $ACR --resource-group $RG --sku Standard --admin-enabled true

# Container Apps Environment
az containerapp env create --name $CAE --resource-group $RG --location $LOCATION
```

```bash
# Build and push backend image
az acr build --registry $ACR --image qgenie-backend:latest ./backend

# Deploy
ACR_PASSWORD=$(az acr credential show --name $ACR --query "passwords[0].value" -o tsv)

az containerapp create \
  --name qgenie-backend \
  --resource-group $RG \
  --environment $CAE \
  --image $ACR.azurecr.io/qgenie-backend:latest \
  --registry-server $ACR.azurecr.io \
  --registry-username $ACR \
  --registry-password $ACR_PASSWORD \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 1.0 --memory 2.0Gi \
  --env-vars \
    AZURE_SQL_CONNECTION_STRING="<connection-string>" \
    JWT_SECRET_KEY="$(openssl rand -hex 32)" \
    ADMIN_BOOTSTRAP_EMAIL="admin@tdbank.com" \
    ADMIN_BOOTSTRAP_PASSWORD="<strong-password>" \
    AZURE_OPENAI_ENDPOINT="<endpoint>" \
    AZURE_CLIENT_ID="<client-id>" \
    AZURE_TENANT_ID="<tenant-id>" \
    AZURE_CLIENT_SECRET="<client-secret>"

BACKEND_URL=$(az containerapp show --name qgenie-backend --resource-group $RG \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "Backend: https://$BACKEND_URL"
```

```bash
# Build and deploy frontend
az acr build --registry $ACR --image qgenie-frontend:latest ./frontend

az containerapp create \
  --name qgenie-frontend \
  --resource-group $RG \
  --environment $CAE \
  --image $ACR.azurecr.io/qgenie-frontend:latest \
  --registry-server $ACR.azurecr.io \
  --registry-username $ACR \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --env-vars REACT_APP_BACKEND_URL="https://$BACKEND_URL"
```

---

## Admin Guide

### First Login

1. Start the backend — it will create the bootstrap `super_admin` on first startup
2. Log in at `/login` with `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`
3. Go to **Admin Panel** → **Users** → create your real admin accounts
4. Go to **Admin Panel** → **Projects** → create projects and assign users

### Role Summary

| Role | `is_admin` | Project access | Module management |
|------|-----------|----------------|-------------------|
| `super_admin` | true | All projects (`project_access: null`) | All projects |
| `admin` | true | Projects in `project_access` array | Own projects only |
| `user` | false | Projects in `project_access` array | None |

### Enabling / Disabling Modules per Project

`PATCH /api/v1/admin/projects/{id}/modules` with `{"enabled_modules": ["tosca_convert", "test_generation"]}`.
Pass `null` to re-enable all five modules. An empty array `[]` disables all modules.

---

## Troubleshooting

**`pyodbc` / SQL connection fails**
Ensure ODBC Driver 18 for SQL Server is installed. On macOS: `brew install msodbcsql18`. In Docker it's installed automatically.

**Redis connection refused**
Check `REDIS_ENDPOINT` includes the port (e.g. `host:10000`). Azure Redis Enterprise uses TLS — the job runner connects with `rediss://`.

**Azure OpenAI 401**
Verify `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET` belong to a service principal with **Cognitive Services OpenAI User** role on the Azure OpenAI resource.

**SSE stream disconnects immediately**
Ensure there is no reverse proxy (nginx, Azure Front Door) buffering the response. Set `X-Accel-Buffering: no` in proxy config.

**Tables not created on startup**
`create_tables()` runs `Base.metadata.create_all()`. All models must be imported before this is called — they are imported via `app/models/__init__.py`. Check that `__init__.py` imports all model classes.

**Bootstrap admin not created**
The bootstrap only runs if `qg_users` table is empty. If you need to reset, truncate `qg_users` in Azure SQL and restart the backend.
