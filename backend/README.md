# QGenie 2.0 — Backend

FastAPI backend for QGenie 2.0, a workflow-native AI platform for QA automation at TD Bank.

---

## Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Python 3.11 |
| Framework | FastAPI 0.115 |
| Database | Azure SQL (SQLAlchemy 2.0 + pyodbc) |
| Auth | Email/password — bcrypt + JWT (HS256) |
| LLM | Azure OpenAI GPT-4o |
| Search / RAG | Azure AI Search (`ent14_index`) |
| Blob storage | Azure Blob Storage (`ent14` container) |
| Job streaming | Redis Enterprise (pub/sub) + Server-Sent Events |
| Azure identity | `ClientSecretCredential` (for Azure SDK calls only — not user login) |
| Container | Docker + uvicorn |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # App factory, router mounts, startup bootstrap
│   ├── core/
│   │   ├── config.py              # Pydantic Settings (reads .env)
│   │   ├── db.py                  # SQLAlchemy engine, SessionLocal, Base
│   │   └── auth.py                # JWT helpers, get_current_user, require_super_admin, check_project_admin_access
│   ├── models/                    # SQLAlchemy ORM models (all prefixed qg_)
│   ├── schemas/                   # Pydantic request/response schemas
│   ├── api/                       # FastAPI routers
│   │   ├── auth.py                # POST /auth/login, GET /auth/me, POST /auth/logout
│   │   ├── admin.py               # Global user CRUD + module toggles (super_admin only)
│   │   ├── jobs.py                # Job submission + GET /jobs/{id}/stream (SSE)
│   │   ├── projects.py            # Project CRUD + project-member management
│   │   ├── jira.py                # GET /jira/story/{id}
│   │   ├── chatbot.py             # POST /chat/, GET /chat/stream/{id} (SSE)
│   │   ├── feedback.py            # POST /feedback/
│   │   └── webhooks.py            # CI/CD failure + PR commit webhooks
│   ├── agents/
│   │   ├── base.py                # BaseAgent ABC with emit() / emit_done()
│   │   ├── tosca_convert/         # ToscaConvertAgent — XML → Playwright TypeScript
│   │   ├── test_generation/       # TestGenerationAgent — Jira AC → Gherkin BDD
│   │   ├── failure_rca/           # FailureRCAAgent — log analysis → root cause
│   │   ├── impact_analysis/       # TestImpactAgent — commit diff → test selection
│   │   └── regression_opt/        # RegressionOptimizationAgent — suite reduction
│   ├── connectors/                # Async httpx clients (3-retry + backoff)
│   │   ├── jira.py, jtmf.py, datadog.py, splunk.py, confluence.py
│   ├── rag/
│   │   └── pipeline.py            # Azure AI Search keyword + vector search
│   ├── chatbot/
│   │   ├── service.py             # Streaming LLM + RAG injection
│   │   └── context.py             # Chat history load/save
│   └── services/
│       ├── job_runner.py          # Redis pub/sub SSE dispatcher
│       └── blob_storage.py        # Azure Blob upload/download
├── tests/
│   ├── test_tosca.py              # Parser + mapper unit tests
│   ├── test_rca.py                # Fingerprint unit tests
│   └── test_connectors.py        # Connector structure + Jira AC parsing
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## Quick Start

### 1. Copy and fill in environment variables

```bash
cp .env.example .env
# Edit .env — fill in AZURE_*, JWT_SECRET_KEY, ADMIN_BOOTSTRAP_PASSWORD, JIRA_*, etc.
```

Generate a JWT secret:
```bash
openssl rand -hex 32
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On first startup the app will:
- Run `Base.metadata.create_all()` to create all `qg_*` tables in Azure SQL
- Create a `super_admin` user using `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` if the `qg_users` table is empty

### 4. Verify

```
GET http://localhost:8000/health
→ {"status": "ok", "version": "2.0.0"}

GET http://localhost:8000/docs
→ Swagger UI with all endpoints
```

---

## Docker

```bash
docker build -t qgenie-backend .
docker run --env-file .env -p 8000:8000 qgenie-backend
```

The Dockerfile installs ODBC Driver 18 for SQL Server automatically.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AZURE_SQL_CONNECTION_STRING` | Full pyodbc connection string for Azure SQL |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint |
| `AZURE_OPENAI_DEPLOYMENT` | GPT-4o deployment name |
| `AZURE_OPENAI_API_VERSION` | API version (e.g. `2024-10-21`) |
| `AZURE_SEARCH_ENDPOINT` | Azure AI Search endpoint |
| `AZURE_SEARCH_INDEX_NAME` | Search index name (default: `ent14_index`) |
| `AZURE_BLOB_ENDPOINT_1` | Blob service URL |
| `AZURE_BLOB_CONTAINER_NAME` | Container name (default: `ent14`) |
| `AZURE_CLIENT_ID` | Service principal client ID (Azure SDK auth only) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_SECRET` | Service principal secret |
| `REDIS_ENDPOINT` | Redis Enterprise host:port |
| `JWT_SECRET_KEY` | HS256 signing key — generate with `openssl rand -hex 32` |
| `JWT_EXPIRE_MINUTES` | Token TTL in minutes (default: `480`) |
| `ADMIN_BOOTSTRAP_EMAIL` | Email for the initial super_admin account |
| `ADMIN_BOOTSTRAP_PASSWORD` | Password for the initial super_admin account |
| `JIRA_BASE_URL` | Jira Cloud base URL (e.g. `https://org.atlassian.net`) |
| `JIRA_EMAIL` | Jira account email |
| `JIRA_API_TOKEN` | Jira API token |
| `JTMF_BASE_URL` | JTMF API base URL |
| `JTMF_API_TOKEN` | JTMF bearer token |
| `DATADOG_API_KEY` | Datadog API key |
| `DATADOG_APP_KEY` | Datadog application key |
| `SPLUNK_BASE_URL` | Splunk REST API base URL |
| `SPLUNK_TOKEN` | Splunk bearer token |
| `CONFLUENCE_BASE_URL` | Confluence Cloud base URL |
| `CONFLUENCE_EMAIL` | Confluence account email |
| `CONFLUENCE_API_TOKEN` | Confluence API token |
| `WEBHOOK_SECRET` | Optional HMAC secret for webhook signature validation |

---

## API Reference

All routes are prefixed `/api/v1/`. Protected endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | `application/x-www-form-urlencoded` — returns `access_token` + `user` object (includes `must_change_password`) |
| `GET` | `/auth/me` | Returns current user profile |
| `POST` | `/auth/change-password` | Change own password — body: `{ current_password?, new_password }`. `current_password` is optional when `must_change_password=true` (first-login setup). Min 8 chars. |
| `POST` | `/auth/logout` | Stateless logout — returns `{"message": "Logged out successfully"}` |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/projects/` | List projects accessible to the current user |
| `GET` | `/projects/{id}` | Get a single project |
| `POST` | `/projects/` | Create a new project |

### Jobs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/jobs/` | List jobs (`?project_id=&limit=`) |
| `GET` | `/jobs/{id}/result` | Get job result payload |
| `GET` | `/jobs/{id}/stream?token=` | SSE stream for job progress |
| `POST` | `/jobs/tosca-convert` | Submit a Tosca conversion job |
| `POST` | `/jobs/test-generation` | Submit a test generation job |
| `POST` | `/jobs/failure-rca` | Submit a failure RCA job |
| `POST` | `/jobs/impact-analysis` | Submit a test impact analysis job |
| `POST` | `/jobs/regression-optimize` | Submit a regression optimisation job |

### Chat

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat/` | Start a chat session — returns `{"session_id": "..."}` |
| `GET` | `/chat/stream/{session_id}?token=` | SSE stream — yields `{"type":"token"}` / `{"type":"done","citations":[...]}` |

### Other

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/jira/story/{id}` | Fetch simplified Jira story with parsed acceptance criteria |
| `POST` | `/feedback/` | Submit module feedback (rating, thumbs, correction) |
| `POST` | `/webhooks/cicd-failure` | CI/CD pipeline failure webhook → auto-RCA |
| `POST` | `/webhooks/pr-commit` | PR commit webhook → auto-impact analysis |

### Global Admin (requires `super_admin` role)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/users` | List all users system-wide |
| `POST` | `/admin/users` | Create a user — body includes `must_change_password` (default `true`) |
| `PATCH` | `/admin/users/{id}` | Update a user (role, password, project access, etc.) |
| `DELETE` | `/admin/users/{id}` | Deactivate a user |
| `POST` | `/admin/users/{id}/projects/{pid}` | Grant project access to a user |
| `DELETE` | `/admin/users/{id}/projects/{pid}` | Revoke project access from a user |
| `DELETE` | `/admin/projects/{id}` | Soft-delete a project (`is_active=False`) and remove it from all users' `project_access` lists |
| `GET` | `/admin/projects/{id}/modules` | Get enabled modules for a project |
| `PATCH` | `/admin/projects/{id}/modules` | Enable/disable modules for a project |

### Project Member Management (requires project `admin` role or `super_admin`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/projects/{id}/members` | List all members of a project |
| `POST` | `/projects/{id}/members` | Add an existing user to a project with a role (`admin`\|`member`) |
| `PATCH` | `/projects/{id}/members/{email}` | Change a member's project role |
| `DELETE` | `/projects/{id}/members/{email}` | Remove a member from a project |
| `POST` | `/projects/{id}/users` | **Project admin user creation** — create a new user account and immediately add them to the project. New account has `must_change_password=true`. Body: `{ email, display_name, password, project_role }` |

---

## SSE Streaming

Two SSE patterns are used — they are **distinct formats**:

**Job stream** (`/jobs/{id}/stream`) — agent step progress:
```
data: {"event":"step","step":"PARSING","status":"running","message":"...","partial_output":null}
data: {"event":"step","step":"PARSING","status":"complete","message":"...","partial_output":null}
data: {"event":"done","job_id":"...","result_url":"/api/v1/jobs/.../result"}
```

**Chat stream** (`/chat/stream/{id}`) — token-by-token LLM output:
```
data: {"type":"token","token":"Hello"}
data: {"type":"token","token":" world"}
data: {"type":"done","citations":[{"title":"TD Bank QA KB","url":"#"}]}
```

Both endpoints accept `?token=<jwt>` as a query parameter because the browser `EventSource` API cannot send custom headers.

---

## Agent Pipeline Overview

### ToscaConvertAgent
`POST /jobs/tosca-convert` → steps: VALIDATING → PARSING → MAPPING → RAG_ENRICHMENT → GENERATING → COMPILING → OUTPUT

Converts Tosca XML to Playwright TypeScript. The mapper covers 85+ Tosca keywords. Unmapped actions are resolved via RAG. Outputs a `.spec.ts` file validated with `tsc --noEmit`.

### TestGenerationAgent
`POST /jobs/test-generation` → steps: FETCHING_STORY → CHECKING_COVERAGE → RAG_ENRICHMENT → GENERATING_SCENARIOS → SYNTHESIZING_DATA → VALIDATING → OUTPUT

Fetches Jira acceptance criteria, generates BDD Gherkin scenarios, synthesizes boundary/negative test data using `DataConstraintEngine`, and writes `.feature` + data files to Blob.

### FailureRCAAgent
`POST /jobs/failure-rca` or via webhook → steps: FETCHING_LOGS → PRE_PROCESSING → FINGERPRINTING → RAG_ENRICHMENT → ANALYSING → POST_PROCESSING

Pulls logs from Datadog + Splunk + JTMF in parallel, fingerprints the failure with SHA-256, queries runbooks via RAG, and classifies the root cause. Auto-creates a Jira Bug ticket if confidence ≥ 80%.

### TestImpactAgent
`POST /jobs/impact-analysis` or via webhook → steps: FETCHING_DIFF → AST_ANALYSIS → SCORING → RISK_ASSESSMENT

Scores tests by coverage (direct = 100 pts, indirect = 25 pts). Uses Python `ast` for `.py` files and regex extraction for `.ts`/`.java`.

### RegressionOptimizationAgent
`POST /jobs/regression-optimize` → steps: LOADING_HISTORY → SCORING_FLAKINESS → CLUSTERING → RISK_SCORING → LLM_VALIDATION → COVERAGE_CHECK

Flakiness score = `(1 − pass_rate) × 0.6 + std(daily_pass_rates) × 0.4`. Tests with cosine similarity > 0.90 are clustered and deduplicated. Optimised suite must preserve ≥ 85% code coverage (threshold raised automatically if not met).

---

## Role & Access Model

| Role | Description |
|------|-------------|
| `super_admin` | Full access to all projects and system settings. Global user management. `project_access = null`. |
| `admin` | Project-level admin. Can manage members for projects they are an admin of. `is_admin = true`. |
| `user` | Access limited to projects listed in `project_access`. Views and runs jobs only. |

**Project-level roles** (stored in `qg_project_members.role`):

| Project Role | Description |
|------|-------------|
| `admin` | Can add/remove members and change roles within the project. |
| `member` | Can access all enabled modules and view their own jobs. |

**Job visibility:**
- `super_admin` — sees all jobs across all projects
- `admin` — sees all jobs for their accessible projects
- `user` — sees only their own jobs

Module access is controlled per-project via `qg_projects.enabled_modules` (JSON column).
`null` = all modules enabled. `[]` = all modules disabled.

Valid backend module keys: `tosca_convert`, `test_generation`, `failure_rca`, `impact_analysis`, `regression_opt`.

---

## Database Tables

All tables are prefixed `qg_` and use `UNIQUEIDENTIFIER` primary keys.

| Table | Purpose |
|-------|---------|
| `qg_users` | User accounts with hashed passwords, roles, project access lists, and `must_change_password` flag |
| `qg_projects` | Projects with enabled module configuration |
| `qg_project_members` | Project membership records |
| `qg_jobs` | Job execution records with status, type, and result payload |
| `qg_feedback` | User feedback on module outputs |
| `qg_rca_fingerprints` | SHA-256 failure fingerprints with classification history |
| `qg_chat_sessions` | Chat sessions per user |
| `qg_chat_messages` | Chat message history with citations |
| `qg_domain_configs` | Per-project domain constraint configurations |

Tables are created automatically on startup via `Base.metadata.create_all()`. Existing tables are not modified.

---

## Running Tests

```bash
pytest tests/ -v
```

Tests cover:
- `test_tosca.py` — XML parser, IR extraction, 85+ keyword mapper
- `test_rca.py` — SHA-256 fingerprinting, stack trace normalisation, exception class extraction
- `test_connectors.py` — Connector structure, Jira AC parsing logic

---

## Module Key Mapping Reference

The frontend uses short keys; the backend uses full keys stored in the database.

| Frontend key | Backend module key | Job `type` value |
|---|---|---|
| `tosca` | `tosca_convert` | `tosca-convert` |
| `test-gen` | `test_generation` | `test-gen` |
| `rca` | `failure_rca` | `rca` |
| `impact` | `impact_analysis` | `impact` |
| `regression` | `regression_opt` | `regression` |
