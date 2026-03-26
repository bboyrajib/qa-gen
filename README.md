# QGenie 2.0 — Enterprise QA Intelligence Platform

> AI-powered test automation platform for **TD Bank Technology Centre of Excellence (TCoE)**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?logo=mongodb)](https://mongodb.com)
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
- AI chatbot panel with context-aware QA knowledge
- Project-scoped job history and notification system
- Admin panel for user/project/module management
- Real-time SSE job progress streaming

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Azure / Cloud                        │
│                                                           │
│  ┌─────────────────────┐    ┌─────────────────────────┐  │
│  │  React 18 SPA       │    │  FastAPI Backend         │  │
│  │  (Azure Static Web  │───▶│  (Azure App Service /   │  │
│  │   Apps / CDN)       │    │   Container Apps)        │  │
│  │                     │    │                           │  │
│  │  - Tailwind CSS     │    │  - JWT Auth (OAuth2)     │  │
│  │  - Zustand (state)  │    │  - SSE Job Streaming     │  │
│  │  - React Query      │    │  - AI Module Endpoints   │  │
│  │  - TanStack Table   │    │  - MongoDB ODM           │  │
│  │  - Recharts         │    │  - OpenAI / Azure AI     │  │
│  │  - Monaco Editor    │    │  - Datadog / Splunk      │  │
│  │  - Radix UI         │    │  - Jira Cloud API        │  │
│  └─────────────────────┘    └──────────┬────────────────┘  │
│                                         │                   │
│                              ┌──────────▼────────────────┐  │
│                              │  Azure Cosmos DB           │  │
│                              │  (MongoDB API)             │  │
│                              └───────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
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
- **AI Chatbot** — context-aware QA assistant (RAG-backed)
- **Dark / Light mode** — persisted per user
- **Monaco Editor** — syntax-highlighted code viewer for generated test files

### Admin Features
- **User Management** — create/edit users, assign roles (Admin / Member)
- **Project Access Control** — grant/revoke per-project access per user
- **Module Management** — enable/disable individual AI modules per project
- **Demo Mode** — toggle between live and demo data (admin-only; hidden from non-admins)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 18 | Use `nvm use 18` |
| Yarn | >= 1.22 | `npm install -g yarn` |
| Python | >= 3.11 | For FastAPI backend |
| MongoDB | >= 6.0 | Or Azure Cosmos DB (MongoDB API) |
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
cp .env.example .env            # Edit with your values
uvicorn server:app --reload --port 8001
```

### 3. Frontend setup
```bash
cd frontend
yarn install
cp .env.example .env            # Set REACT_APP_BACKEND_URL
yarn start                      # Runs on http://localhost:3000
```

### 4. Demo mode (no backend required)
Log in as **Admin** (`admin@tdbank.com` / `admin123`) and ensure **Demo Mode is ON** (visible in the TopBar for admin accounts only). Non-admin accounts (`user@tdbank.com` / `test123`) always use real data.

---

## Environment Variables

### Backend (`backend/.env`)
```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=qgenie

# Authentication
JWT_SECRET=change-me-to-a-256-bit-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# AI Services
OPENAI_API_KEY=sk-...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Jira Integration
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_TOKEN=...
JIRA_EMAIL=your-service-account@tdbank.com

# Log Aggregators
DATADOG_API_KEY=...
DATADOG_APP_KEY=...
SPLUNK_URL=https://splunk.tdbank.internal
SPLUNK_TOKEN=...

# JTMF (Test Management Framework)
JTMF_API_BASE_URL=https://jtmf.tdbank.internal/api
JTMF_API_TOKEN=...

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://qgenie.tdbank.com
```

### Frontend (`frontend/.env`)
```env
# Points to the backend (with /api prefix routing)
REACT_APP_BACKEND_URL=http://localhost:3000
```
> In production, set to your Azure App Service / Container App URL or API Gateway URL.

---

## API Reference

All endpoints require `Authorization: Bearer <JWT_TOKEN>` unless marked **Public**.

---

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/login` | Public | OAuth2 password flow |
| `POST` | `/api/v1/auth/logout` | Required | Invalidates current session |
| `GET` | `/api/v1/auth/me` | Required | Returns current user profile |
| `POST` | `/api/v1/auth/refresh` | Required | Refreshes expired JWT token |

**Login Request:**
```
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin%40tdbank.com&password=admin123
```

**Login Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "usr-001",
    "email": "admin@tdbank.com",
    "name": "Admin User",
    "is_admin": true,
    "project_access": null
  }
}
```

---

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects` | Required | List accessible projects for current user |
| `POST` | `/api/v1/projects` | Admin | Create a new project |
| `GET` | `/api/v1/projects/{project_id}` | Required | Get project details |
| `PUT` | `/api/v1/projects/{project_id}` | Admin | Update project metadata |
| `DELETE` | `/api/v1/projects/{project_id}` | Admin | Delete project |

**Project Object:**
```json
{
  "id": "proj-001",
  "name": "TD Retail Banking",
  "jira_project_key": "TRB",
  "domain_tag": "Payments",
  "created_at": "2026-01-15T10:00:00Z",
  "members": ["usr-001", "usr-002"]
}
```

---

### Jobs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/jobs` | Required | All jobs for the current user |
| `GET` | `/api/v1/jobs?project_id=proj-001&limit=5` | Required | Recent jobs per project |
| `GET` | `/api/v1/jobs/{job_id}` | Required | Job status + result |
| `DELETE` | `/api/v1/jobs/{job_id}` | Required | Cancel or delete a job |
| `GET` | `/api/v1/jobs/{job_id}/stream?token=<JWT>` | Required | **SSE** real-time step progress |

**Job Object:**
```json
{
  "id": "job-abc123",
  "type": "tosca-convert",
  "status": "COMPLETE",
  "project_id": "proj-001",
  "user": "Alex Johnson",
  "submitted": "2026-02-01T14:30:00Z",
  "completed": "2026-02-01T14:31:45Z",
  "steps": [
    { "name": "Validating", "status": "complete" },
    { "name": "Generating", "status": "complete" }
  ],
  "result": {}
}
```

**SSE Stream Format** (`GET /api/v1/jobs/{id}/stream?token=JWT`):
```
data: {"type": "step", "step": "Parsing", "status": "running"}

data: {"type": "step", "step": "Parsing", "status": "complete"}

data: {"type": "done", "job_id": "job-abc123", "status": "COMPLETE"}

data: {"type": "error", "message": "Connection to Datadog timed out"}
```

---

### Tosca Conversion

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/tosca/convert` | Required | Submit Tosca XML for Playwright conversion |

**Request (multipart/form-data):**
```
file: <Tosca .xml or .zip file>     (OR use git_path below)
git_path: "tests/tosca/checkout.xml" (optional, if no file upload)
framework: "TypeScript" | "JavaScript"
browser: "Chromium" | "Firefox" | "WebKit"
base_url: "https://myapp.example.com"
jira_id: "TRB-1482"               (optional — enriches locators via Jira ACs)
project_id: "proj-001"
```

**Response:**
```json
{ "job_id": "job-tosca-001", "status": "QUEUED", "estimated_seconds": 45 }
```

**Result** (from `GET /api/v1/jobs/{job_id}`):
```json
{
  "generated_code": "import { test, expect } from '@playwright/test';\n\ntest('Bill Payment Happy Path', async ({ page }) => {\n  ...\n});",
  "original_xml": "<TestCase name=\"BillPayment\">...</TestCase>",
  "quality_report": {
    "total_steps": 24,
    "high_confidence": 20,
    "medium_confidence": 3,
    "low_confidence": 1,
    "locator_warnings": [
      { "step": 14, "message": "XPath locator detected — consider data-testid" }
    ]
  }
}
```

---

### Test Generation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/jira/story/{issue_key}` | Required | Fetch Jira story + acceptance criteria |
| `POST` | `/api/v1/testgen/generate` | Required | Generate Gherkin BDD from ACs |
| `POST` | `/api/v1/testgen/jira-subtasks` | Required | Push generated test IDs as Jira sub-tasks |

**Generate Request:**
```json
{
  "jira_id": "TRB-1482",
  "acceptance_criteria": [
    "AC1: User can pay bill via saved payee",
    "AC2: System shows confirmation number"
  ],
  "domain": "Payments",
  "jtmf_suite_id": "suite-payments-001",
  "project_id": "proj-001"
}
```

**Result:**
```json
{
  "feature_file": "Feature: TD Bill Payment\n\n  @smoke @payments\n  Scenario: Happy path bill payment\n    Given I am logged in as a retail banking customer\n    When I navigate to Bill Payment\n    ...",
  "test_data": [
    {
      "id": "tc-001",
      "scenario": "Happy path bill payment",
      "tags": ["@smoke", "@payments"],
      "steps": ["Given I am on the bill payment page", "When I select saved payee 'Rogers'", "..."]
    }
  ],
  "jtmf_upload_url": "https://jtmf.tdbank.internal/upload/suite-payments-001"
}
```

---

### Failure RCA

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/rca/analyse` | Required | Submit pipeline run ID for root cause analysis |

**Request:**
```json
{
  "run_id": "GH-RUN-99182",
  "service": "payments-service",
  "time_window": "last_1h",
  "project_id": "proj-001"
}
```

**Result:**
```json
{
  "classification": "CODE_DEFECT",
  "confidence": 91,
  "root_cause": "NullPointerException in PaymentProcessor.java:142 — missing null check on transaction reference",
  "fix_suggestion": "Add null guard: `if (txRef == null) throw new InvalidTransactionException(...)`",
  "evidence": [
    {
      "source": "Datadog",
      "level": "ERROR",
      "message": "NullPointerException at PaymentProcessor.java:142",
      "timestamp": "2026-02-01T14:28:33Z"
    },
    {
      "source": "Splunk",
      "level": "WARN",
      "message": "Transaction reference null for request ID tx-88421",
      "timestamp": "2026-02-01T14:28:31Z"
    }
  ],
  "similar_incidents": [
    {
      "id": "INC-2891",
      "similarity": 94,
      "resolution": "Added null check in PR #4421",
      "date": "2025-10-15"
    }
  ],
  "jira_created": "TRB-9921",
  "flakiness_score": 0.08
}
```

---

### Impact Analysis

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/impact/analyse` | Required | Analyse test impact of a commit or PR |

**Request:**
```json
{
  "commit_sha": "a3f8c1d9e2b7f4a1c8d3e9f2b5a6c7d4",
  "repository": "td-bank/payments-service",
  "pr_id": "PR-412",
  "project_id": "proj-001"
}
```

**Result:**
```json
{
  "commit_sha": "a3f8c1d9",
  "repository": "td-bank/payments-service",
  "risk_level": "HIGH",
  "risk_score": 87,
  "total_tests": 1247,
  "total_recommended": 89,
  "blast_radius": { "direct": 23, "indirect": 58, "module": 8 },
  "changed_files": [
    "src/payments/PaymentProcessor.java",
    "src/payments/TransactionValidator.java"
  ],
  "test_plan": [
    {
      "test_id": "TC-001",
      "name": "Bill Payment Happy Path",
      "reason": "DIRECT",
      "risk": "HIGH",
      "suite": "suite-payments-001",
      "estimated_duration_s": 45
    },
    {
      "test_id": "TC-087",
      "name": "Transfer Between Accounts",
      "reason": "INDIRECT",
      "risk": "MEDIUM",
      "suite": "suite-core-banking-001",
      "estimated_duration_s": 30
    }
  ]
}
```

---

### Regression Optimizer

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/jtmf/suites` | Required | List available JTMF test suites |
| `POST` | `/api/v1/regression/optimise` | Required | Optimise a test suite for a run |
| `POST` | `/api/v1/regression/inject` | Required | Inject optimised plan into CI/CD |

**Optimise Request:**
```json
{
  "suite_id": "suite-retail-banking-001",
  "risk_profile": "BALANCED",
  "project_id": "proj-001"
}
```

**Risk Profiles:** `AGGRESSIVE` (max reduction) | `BALANCED` | `CONSERVATIVE` (max safety)

**Result:**
```json
{
  "suite": "TD Retail Banking Suite",
  "original_count": 445,
  "optimized_count": 142,
  "reduction_percent": 68.1,
  "time_saved_hours": 6.2,
  "estimated_run_time_hours": 2.9,
  "decisions": [
    {
      "test_id": "TC-001",
      "name": "Login Happy Path",
      "decision": "INCLUDE",
      "reason": "High-risk coverage area, recent failure",
      "flakiness_score": 0.02,
      "last_failed": "2026-01-28T09:15:00Z",
      "tags": ["@smoke", "@auth"]
    },
    {
      "test_id": "TC-099",
      "name": "Profile Photo Upload",
      "decision": "EXCLUDE",
      "reason": "No code change overlap, no recent failures, low risk",
      "flakiness_score": 0.0,
      "last_failed": null,
      "tags": ["@profile"]
    }
  ]
}
```

---

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/admin/users` | Admin | List all platform users |
| `POST` | `/api/v1/admin/users` | Admin | Create a user |
| `PUT` | `/api/v1/admin/users/{user_id}` | Admin | Update user (name, role, project_access) |
| `DELETE` | `/api/v1/admin/users/{user_id}` | Admin | Delete user |
| `GET` | `/api/v1/admin/stats` | Admin | Platform usage metrics |

**Create User Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@tdbank.com",
  "password": "TempPass123!",
  "is_admin": false,
  "project_access": ["proj-001", "proj-003"]
}
```

---

### AI Chat Assistant

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/chat/` | Required | Send a message; returns session ID for SSE |
| `GET` | `/api/v1/chat/stream/{session_id}?token=<JWT>` | Required | **SSE** streaming AI response |

**Chat Request:**
```json
{
  "message": "Why did the Tosca locator for step 14 fail?",
  "context_job_id": "job-tosca-001"
}
```

**Chat Response:**
```json
{ "session_id": "chat-sess-abc123" }
```

**SSE Stream** (`GET /api/v1/chat/stream/{session_id}?token=JWT`):
```
data: {"type": "token", "token": "The"}

data: {"type": "token", "token": " XPath"}

data: {"type": "done", "citations": [{"title": "TD QA Knowledge Base — Locator Guide", "url": "#"}]}
```

---

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/notifications?project_id=proj-001` | Required | List notifications for a project |
| `PUT` | `/api/v1/notifications/{id}/read` | Required | Mark notification as read |
| `PUT` | `/api/v1/notifications/read-all` | Required | Mark all notifications as read |
| `DELETE` | `/api/v1/notifications` | Required | Clear all notifications |

**Notification Object:**
```json
{
  "id": "notif-001",
  "job_id": "job-abc123",
  "type": "tosca-convert",
  "status": "COMPLETE",
  "project_id": "proj-001",
  "triggered_by": "Alex Johnson",
  "timestamp": "2026-02-01T14:31:45Z",
  "read": false
}
```

---

## Azure Deployment

### Option A — Recommended: Azure Container Apps

Fully managed, auto-scaling, production-grade deployment.

#### Step 1: Set up Azure resources

```bash
# Variables
RG="rg-qgenie-prod"
LOCATION="canadacentral"
ACR="acrqgenieprod"
COSMOS="cosmos-qgenie-prod"
CAE="env-qgenie-prod"

# Resource group
az group create --name $RG --location $LOCATION

# Azure Container Registry
az acr create --name $ACR --resource-group $RG --sku Standard --admin-enabled true

# Azure Cosmos DB (MongoDB API — Serverless)
az cosmosdb create --name $COSMOS --resource-group $RG \
  --kind MongoDB --server-version 6.0 \
  --capabilities EnableServerless

# Get Cosmos connection string
COSMOS_CONN=$(az cosmosdb keys list --name $COSMOS --resource-group $RG \
  --type connection-strings --query "connectionStrings[0].connectionString" -o tsv)

# Container Apps Environment
az containerapp env create --name $CAE --resource-group $RG --location $LOCATION
```

#### Step 2: Build and push Docker images

```bash
# Build backend image in ACR (no local Docker needed)
az acr build --registry $ACR \
  --image qgenie-backend:latest ./backend

# Build frontend image in ACR
az acr build --registry $ACR \
  --image qgenie-frontend:latest ./frontend
```

#### Step 3: Deploy backend Container App

```bash
ACR_PASSWORD=$(az acr credential show --name $ACR --query "passwords[0].value" -o tsv)

az containerapp create \
  --name qgenie-backend \
  --resource-group $RG \
  --environment $CAE \
  --image $ACR.azurecr.io/qgenie-backend:latest \
  --registry-server $ACR.azurecr.io \
  --registry-username $ACR \
  --registry-password $ACR_PASSWORD \
  --target-port 8001 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 1.0 --memory 2.0Gi \
  --env-vars \
    MONGO_URL="$COSMOS_CONN" \
    DB_NAME="qgenie" \
    JWT_SECRET="$(openssl rand -hex 32)" \
    OPENAI_API_KEY="sk-..." \
    ALLOWED_ORIGINS="https://qgenie.tdbank.com"

# Get the backend URL
BACKEND_URL=$(az containerapp show --name qgenie-backend --resource-group $RG \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "Backend: https://$BACKEND_URL"
```

#### Step 4: Deploy frontend to Azure Static Web Apps

```bash
# Create Static Web App linked to your GitHub repo
az staticwebapp create \
  --name qgenie-frontend \
  --resource-group $RG \
  --source https://github.com/td-bank/qgenie-2.0 \
  --branch main \
  --app-location "/frontend" \
  --output-location "build" \
  --login-with-github

# Set the backend URL environment variable
az staticwebapp appsettings set \
  --name qgenie-frontend \
  --resource-group $RG \
  --setting-names \
    REACT_APP_BACKEND_URL="https://$BACKEND_URL"

echo "Frontend deployed. Configure custom domain in Azure Portal."
```

---

### Option B — Simple: Azure App Service

For dev/staging or non-containerised deployment.

```bash
RG="rg-qgenie-dev"
LOCATION="canadacentral"

az group create --name $RG --location $LOCATION

# App Service Plan (Linux B2)
az appservice plan create \
  --name plan-qgenie \
  --resource-group $RG \
  --is-linux --sku B2

# Backend Web App
az webapp create \
  --name qgenie-api-dev \
  --resource-group $RG \
  --plan plan-qgenie \
  --runtime "PYTHON|3.11"

az webapp config set \
  --name qgenie-api-dev \
  --resource-group $RG \
  --startup-file "uvicorn server:app --host 0.0.0.0 --port 8000"

az webapp config appsettings set \
  --name qgenie-api-dev \
  --resource-group $RG \
  --settings \
    MONGO_URL="<cosmos-or-atlas-connection-string>" \
    DB_NAME="qgenie" \
    JWT_SECRET="<secret>" \
    OPENAI_API_KEY="<key>" \
    ALLOWED_ORIGINS="https://qgenie-dev.tdbank.com"

# Deploy backend code
cd backend && zip -r ../backend.zip . && cd ..
az webapp deploy \
  --name qgenie-api-dev \
  --resource-group $RG \
  --src-path backend.zip

# Frontend — build and deploy to Azure Blob Static Site
cd frontend
REACT_APP_BACKEND_URL=https://qgenie-api-dev.azurewebsites.net yarn build
az storage blob upload-batch \
  --account-name <storage-account-name> \
  --destination '$web' \
  --source build/ \
  --overwrite
```

---

### CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy QGenie 2.0

on:
  push:
    branches: [main]

env:
  ACR_NAME: acrqgenieprod
  RG: rg-qgenie-prod

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Build and push backend image
        run: |
          az acr build \
            --registry $ACR_NAME \
            --image qgenie-backend:${{ github.sha }} \
            ./backend
      - name: Update Container App
        run: |
          az containerapp update \
            --name qgenie-backend \
            --resource-group $RG \
            --image $ACR_NAME.azurecr.io/qgenie-backend:${{ github.sha }}

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v4
      - name: Install and build frontend
        working-directory: ./frontend
        env:
          REACT_APP_BACKEND_URL: ${{ secrets.BACKEND_URL }}
        run: yarn install && yarn build
      - name: Deploy to Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: /frontend
          output_location: build
          skip_app_build: true
```

---

## Admin Guide

### Demo Mode (Admin-only)
- The **Demo Mode** toggle is visible only to admin users in the TopBar
- **Demo ON**: All 5 modules, projects list, and job history use pre-seeded sample data — no backend calls are made
- **Demo OFF**: All data comes from the live backend. If the backend is unreachable, empty states will be shown
- Non-admin users always operate in live mode (demo is force-disabled on their login)

### Module Management
1. Log in as admin → **Admin Panel** (user menu, top-right)
2. Go to the **Projects** tab
3. Click the **Modules** button on any project
4. Toggle each AI module ON/OFF using the switches
5. Disabled modules are immediately hidden from that project's Sidebar for all users

### User Management
1. Admin Panel → **Users** tab → **Add User**
2. Set role: **Admin** (full platform access) or **Member** (project-scoped)
3. For Members: check the specific projects they can access
4. Use **Manage Access** button on the Projects tab to grant/revoke project access to existing users

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Login fails — "Authentication failed" | Backend not running, or wrong credentials | Start backend; use demo credentials (`admin@tdbank.com / admin123`) in demo mode |
| Modules show no data / empty state | Demo OFF and backend unreachable | Enable Demo Mode (admin), or start backend |
| SSE streaming does not work | CORS misconfiguration | Add backend URL to `ALLOWED_ORIGINS` in `.env`; check `/api` prefix routing |
| Demo Mode toggle not visible | Logged in as non-admin | Log in with `admin@tdbank.com` — only admins see the toggle |
| Sidebar stays white in dark mode | Stale CSS cache | Hard refresh: `Ctrl+Shift+R` / `Cmd+Shift+R` |
| Notifications missing | No project selected | Select a project from the TopBar dropdown |
| Browser push notifications not firing | Browser permission not granted | Click the Bell icon once — browser will prompt for permission |
| "My Jobs" page is empty | No jobs run in current session + Demo OFF | Run any module, or enable Demo Mode |

---

## Security Notes

- JWT tokens expire after 8 hours (configure via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- All secrets must be environment variables — **never commit `.env` to Git**
- Demo credentials (`admin123`, `test123`) must be **disabled in production** — add an `ALLOW_DEMO_AUTH=false` flag to your backend
- For TD Bank production: integrate with **Azure Entra ID (AD)** SSO via OIDC — contact TCoE Security
- Use **Azure Key Vault** for all secrets in production Container Apps (reference via `secretRef`)
- Enable **Azure DDoS Protection** and **WAF** on your API ingress in production

---

*QGenie 2.0 — TD Bank Technology Centre of Excellence | Confidential and Proprietary*
