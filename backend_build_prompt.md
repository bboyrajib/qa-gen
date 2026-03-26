# QGenie 2.0 — Backend Build Prompt
# Feed this entire prompt to Claude Sonnet to build the FastAPI backend

You are a senior Python/FastAPI engineer. Build the complete QGenie 2.0 backend — a workflow-native AI platform for QA automation at TD Bank. Follow every instruction exactly. Do not skip sections.

---

## STACK
- Python 3.11
- FastAPI (NOT Flask — this is a migration from Flask)
- SQLAlchemy 2.0 (async) with pyodbc for Azure SQL
- LangChain 0.3.x for agent orchestration
- Azure OpenAI (GPT-4o) via openai SDK
- Azure AI Search via azure-search-documents SDK
- Azure Identity (ClientSecretCredential) for Azure SDK calls (OpenAI, Search, Blob)
- Email/password authentication with bcrypt + JWT (python-jose) — NO Azure AD for user login
- Redis for job caching (existing Redis Enterprise instance)
- Server-Sent Events (SSE) for real-time agent step streaming
- Docker + uvicorn

---

## FRONTEND API CONTRACT (source of truth — all endpoints must match exactly)

The React frontend (axios-based) calls these endpoints. Every path, request shape, and response shape below is exact — do not rename fields.

### Base URL
Configured via `REACT_APP_BACKEND_URL` env var. All routes prefixed `/api/v1/`.

### Auth header
All protected endpoints: `Authorization: Bearer <token>` injected automatically by axios interceptor.
On 401 response: frontend clears localStorage and redirects to `/login`.

---

### 1. Auth endpoints

#### POST /api/v1/auth/login
- Content-Type: `application/x-www-form-urlencoded`
- Body fields: `username` (email), `password`
- Uses FastAPI's `OAuth2PasswordRequestForm` — this is already correct
- **Response** (must match exactly):
```json
{
  "access_token": "<jwt>",
  "user": {
    "id": "<uuid-string>",
    "email": "user@tdbank.com",
    "name": "Sarah Chen",
    "role": "user",
    "is_admin": false,
    "project_access": ["proj-uuid-1", "proj-uuid-2"]
  }
}
```
- `role` must be one of: `"super_admin"` | `"admin"` | `"user"`
- `is_admin` is `true` for both `super_admin` and `admin` roles
- `project_access` is `null` for super_admin (access to all), or array of project UUIDs

#### POST /api/v1/auth/logout
- No body. Returns `{"message": "Logged out successfully"}`

---

### 2. Projects endpoints

#### GET /api/v1/projects/
- Returns array of project objects accessible to the current user (filtered server-side by role)
- **Response item shape** (must match exactly):
```json
{
  "id": "uuid-string",
  "name": "TD Digital Banking",
  "domain_tag": "Payments",
  "jira_project_key": "TDB",
  "member_count": 12,
  "created_at": "2024-09-01T10:00:00Z",
  "created_by": "uuid-string"
}
```

#### GET /api/v1/projects/{projectId}
- Returns single project object (same shape as above)

#### POST /api/v1/projects/
- **Request body**:
```json
{
  "name": "TD Digital Banking",
  "jira_project_key": "TDB",
  "domain_tag": "Payments"
}
```
- `jira_project_key` and `domain_tag` are optional
- **Response**: newly created project object (same shape as GET item)

---

### 3. Jobs endpoints

#### GET /api/v1/jobs/
- Query params: `project_id` (optional), `limit` (optional, default 10)
- Examples:
  - `/api/v1/jobs/?project_id=<uuid>&limit=10` — jobs for one project
  - `/api/v1/jobs/?limit=5` — most recent jobs across all accessible projects
- **Response**: array of job objects:
```json
[
  {
    "id": "uuid-string",
    "type": "tosca-convert",
    "status": "COMPLETE",
    "submitted": "2024-09-01T10:00:00Z",
    "user": "Alex Johnson",
    "project_id": "uuid-string"
  }
]
```
- `type` values: `"tosca-convert"` | `"test-gen"` | `"rca"` | `"impact"` | `"regression"`
- `status` values: `"COMPLETE"` | `"FAILED"` | `"RUNNING"` | `"QUEUED"`

---

### 4. Jira story endpoint (new — not in original design)

#### GET /api/v1/jira/story/{storyId}
- Called from both ToscaModule and TestGenModule
- Fetches story from Jira and returns a simplified shape
- **Response**:
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
- `acceptance_criteria` is a string array, parsed from the Jira description body (look for "AC:" or "Acceptance Criteria:" sections and split into lines)
- Add this router to `api/jira.py` and mount at `/api/v1/jira`

---

### 5. Chat endpoints

#### POST /api/v1/chat/
- **Request body**:
```json
{"message": "Why did this test fail?"}
```
- **Response** (NOT the full chat response — just a session ID to open the SSE stream):
```json
{"session_id": "uuid-string"}
```
- Backend should: create/get chat session, queue the LLM work, return session_id immediately

#### GET /api/v1/chat/stream/{sessionId}?token={jwt}
- SSE stream — token passed as query param (EventSource cannot send headers)
- SSE event format (data field, JSON-parsed by frontend):
```
data: {"type": "token", "token": "Hello"}
data: {"type": "token", "token": " world"}
data: {"type": "done", "citations": [{"title": "TD Bank QA KB", "url": "#"}]}
```
- `type: "token"` → streaming response character/word
- `type: "done"` → end of stream, citations array (can be empty array `[]`)
- NOTE: This is DIFFERENT from the agent step SSE format. Chat SSE uses `type` field, agent SSE uses `event` field.

---

### 6. Feedback endpoint

#### POST /api/v1/feedback/
- **Request body**:
```json
{
  "job_id": "uuid-string",
  "module_type": "tosca",
  "rating": 4,
  "thumbs": "up",
  "correction": "The selector for the submit button was wrong"
}
```
- `module_type` values: `"tosca"` | `"test-gen"` | `"rca"` | `"impact"` | `"regression"`
- `rating`: integer 1–5, or `0` if user didn't set a star rating
- `thumbs`: `"up"` | `"down"` | `null`
- `correction`: string | `null`
- Returns 200 with `{"message": "Feedback recorded"}`

---

### Module key name reconciliation

The frontend AdminPage uses short module keys. Map them to backend module keys as follows:

| Frontend key (AdminPage) | Backend module key | Job `type` field |
|--------------------------|-------------------|-----------------|
| `tosca`                  | `tosca_convert`   | `tosca-convert` |
| `test-gen`               | `test_generation` | `test-gen`      |
| `rca`                    | `failure_rca`     | `rca`           |
| `impact`                 | `impact_analysis` | `impact`        |
| `regression`             | `regression_opt`  | `regression`    |

The `enabled_modules` JSON column in `qg_projects` uses the **backend module keys** (`tosca_convert`, etc.).
The `type` field in `qg_jobs` uses the **job type strings** (`tosca-convert`, etc.).

---

## EXISTING ENV VARS (use these exactly — do not create new Azure resources)

```
AZURE_STORAGE_ACCOUNT=kmaie2kmaidev
AZURE_BLOB_CONTAINER_NAME=ent14
AZURE_BLOB_ENDPOINT_1=https://kmaie2kmaidev.blob.core.windows.net/
AZURE_BLOB_ENDPOINT_2=https://kmaie2kmaidev.dfs.core.windows.net/
AZURE_SEARCH_ENDPOINT=https://d4003-eastus2-kmai-search-894.search.windows.net
AZURE_SEARCH_INDEX_NAME=ent14_index
AZURE_OPENAI_ENDPOINT=https://d4003-eastus2-kmai-openai-729.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-2024-08-06-tpm
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_COGNITIVE_SCOPE=https://cognitiveservices.azure.com/.default
AZURE_SQL_SERVER=d4003-eastus2-asql-727.database.windows.net
AZURE_SQL_DB=daas-kmai-kmai-ent14-devdb
AZURE_SQL_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=tcp:d4003-eastus2-asql-727.database.windows.net,1433;Database=daas-kmai-kmai-ent14-devdb;...
REDIS_ENDPOINT=d4003-eastus2-redisEnterprise-727.eastus2.redisenterprise.cache.azure.net:10000
AZURE_CLIENT_ID=1719dea4-9243-4114-af0c-8f72cf16ad29
AZURE_TENANT_ID=<fill in>
AZURE_CLIENT_SECRET=<fill in>
# App Auth (email/password JWT — replaces Azure AD login)
JWT_SECRET_KEY=<generate with: openssl rand -hex 32>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
ADMIN_BOOTSTRAP_EMAIL=admin@tdbank.com
ADMIN_BOOTSTRAP_PASSWORD=<set a strong initial password>
JIRA_BASE_URL=<fill in>
JIRA_API_TOKEN=<fill in>
JIRA_EMAIL=<fill in>
JTMF_BASE_URL=<fill in>
JTMF_API_TOKEN=<fill in>
DATADOG_API_KEY=<fill in>
DATADOG_APP_KEY=<fill in>
SPLUNK_BASE_URL=<fill in>
SPLUNK_TOKEN=<fill in>
CONFLUENCE_BASE_URL=<fill in>
CONFLUENCE_API_TOKEN=<fill in>
CONFLUENCE_EMAIL=<fill in>
```

---

## PROJECT STRUCTURE TO CREATE

```
backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py           # Pydantic Settings — reads from .env
│   │   ├── db.py               # SQLAlchemy engine + session + Base
│   │   └── auth.py             # Email/password JWT auth (NOT Azure AD)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # QgUser (email, hashed_password, role, is_admin, project_access)
│   │   ├── project.py          # QgProject, QgProjectMember
│   │   ├── job.py              # QgJob
│   │   ├── feedback.py         # QgFeedback
│   │   ├── rca.py              # QgRcaFingerprint
│   │   └── chat.py             # QgChatSession, QgChatMessage
│   ├── schemas/
│   │   ├── auth.py             # LoginRequest, TokenResponse, UserCreate, UserUpdate
│   │   ├── jobs.py             # JobCreate, JobStatus, JobResult schemas
│   │   ├── projects.py
│   │   └── chat.py
│   ├── api/
│   │   ├── auth.py             # POST /auth/login, /auth/me, /auth/logout
│   │   ├── admin.py            # Admin-only: user CRUD, project access management
│   │   ├── jobs.py             # Job submission + SSE stream endpoints
│   │   ├── projects.py
│   │   ├── jira.py             # GET /jira/story/{storyId} — NEW
│   │   ├── chatbot.py
│   │   ├── feedback.py
│   │   └── webhooks.py         # CI/CD failure + PR commit webhooks
│   ├── agents/
│   │   ├── base.py             # BaseAgent ABC with emit() helper
│   │   ├── tosca_convert/
│   │   │   ├── agent.py        # ToscaConvertAgent
│   │   │   ├── parser.py       # Tosca XML parser → IR
│   │   │   ├── mapper.py       # 80+ keyword lookup table
│   │   │   ├── llm.py          # LLM code generation call
│   │   │   └── compiler.py     # tsc subprocess validation
│   │   ├── test_generation/
│   │   │   ├── agent.py        # TestGenerationAgent
│   │   │   ├── constraint_engine.py  # DataConstraintEngine
│   │   │   └── llm.py
│   │   ├── failure_rca/
│   │   │   ├── agent.py        # FailureRCAAgent
│   │   │   ├── fingerprint.py  # SHA-256 fingerprint logic
│   │   │   └── llm.py
│   │   ├── impact_analysis/
│   │   │   ├── agent.py        # TestImpactAgent
│   │   │   ├── ast_parser.py   # AST function boundary extraction
│   │   │   └── scorer.py       # Test scoring formula
│   │   └── regression_opt/
│   │       ├── agent.py        # RegressionOptimizationAgent
│   │       ├── flakiness.py    # Flakiness score computation
│   │       └── clustering.py   # Cosine similarity clustering
│   ├── connectors/
│   │   ├── jira.py
│   │   ├── jtmf.py
│   │   ├── datadog.py
│   │   ├── splunk.py
│   │   └── confluence.py
│   ├── rag/
│   │   └── pipeline.py         # Azure AI Search + OpenAI embeddings
│   ├── chatbot/
│   │   ├── service.py          # Chat orchestration + RAG injection
│   │   └── context.py          # Session index management
│   └── services/
│       ├── job_runner.py       # Async job runner + SSE event dispatch
│       └── blob_storage.py     # Azure Blob upload/download
├── tests/
│   ├── test_tosca.py
│   ├── test_rca.py
│   └── test_connectors.py
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## DATABASE RULES
1. Use SQLAlchemy with pyodbc connection string from AZURE_SQL_CONNECTION_STRING
2. Call Base.metadata.create_all(bind=engine) on startup — creates ALL new tables
3. Do NOT modify any existing tables
4. All new tables are prefixed with "qg_" to avoid collisions
5. Use UNIQUEIDENTIFIER (UUID) primary keys, not auto-increment integers
6. All tables have project_id foreign key for multi-project isolation

Tables to create (full DDL in design doc):
- qg_users, qg_projects (with enabled_modules JSON column), qg_project_members, qg_jobs, qg_feedback, qg_rca_fingerprints, qg_chat_sessions, qg_chat_messages, qg_domain_configs

---

## SSE TOKEN HANDLING (IMPORTANT)
EventSource in browsers cannot send custom Authorization headers. For the SSE stream endpoint only, accept the JWT as a `?token=` query parameter:

```python
# In api/jobs.py — SSE endpoint accepts token via query param
from fastapi import Query
from jose import jwt, JWTError
from app.core.config import settings

@router.get('/{job_id}/stream')
async def stream_job(job_id: str, token: str = Query(...)):
    # Validate token from query param (SSE cannot send headers)
    try:
        payload = jwt.decode(token, settings.jwt_secret_key,
                             algorithms=[settings.jwt_algorithm])
        user_email = payload.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    async def event_generator():
        async for event in run_job_stream(job_id, user_email):
            yield f'data: {json.dumps(event)}\n\n'
            await asyncio.sleep(0)
        yield 'data: {"event": "done"}\n\n'

    return StreamingResponse(event_generator(),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
```

The chat SSE endpoint (`/api/v1/chat/stream/{sessionId}`) uses the same `?token=` query param pattern.

All other endpoints use the standard `Depends(get_current_user)` Bearer token validation.

---

## AGENT IMPLEMENTATION RULES

### All agents must:
1. Inherit from BaseAgent (backend/app/agents/base.py)
2. Implement async run(input_data: dict) -> AsyncGenerator[dict, None]
3. Yield SSE events using self.emit(step_name, status, message, partial_output)
4. Persist job updates to Azure SQL at each step (status, step_current)
5. Store final result as JSON in qg_jobs.result_payload
6. Upload any output files to Azure Blob Storage (container: ent14)

### Agent SSE Event format (for job streaming — distinct from chat SSE):
```json
{"event": "step", "step": "Parsing", "status": "running|complete|error", "message": "...", "partial_output": null}
{"event": "done", "job_id": "...", "result_url": "/api/v1/jobs/{id}/result"}
```

### qg_jobs.type column values (must match frontend):
Use these exact strings: `"tosca-convert"`, `"test-gen"`, `"rca"`, `"impact"`, `"regression"`

---

## AGENT 1: ToscaConvertAgent

### Input schema:
```python
class ToscaConvertInput(BaseModel):
    file_content: str           # Base64-encoded Tosca XML
    file_name: str
    framework: str = "typescript"  # typescript | javascript
    browser: str = "chromium"
    base_url: str
    jira_story_id: Optional[str]
    project_id: str
```

### Steps to implement:
1. VALIDATING: Parse base64, decode XML, validate schema (root element must be TestCase or TestSuite)
2. PARSING: Extract all TestStep elements into IR: [{step_id, action_mode, element_path, input_value, expected_value, step_order}]
3. MAPPING: Apply 80+ keyword lookup table. Unmapped actions collected for RAG. Lookup table must include at minimum:
   - NavigateToUrl → page.goto()
   - Navigate → page.goto()
   - ClickAction → page.getByRole('button').click() or page.locator().click()
   - Click → page.locator().click()
   - InputValue → page.getByLabel().fill() or page.locator().fill()
   - Input → page.locator().fill()
   - VerifyValue → expect(page.locator()).toHaveValue()
   - VerifyExists / Verify → expect(page.locator()).toBeVisible()
   - WaitForElement → page.waitForSelector()
   - SelectValue / Select → page.selectOption()
   - GetText → page.locator().textContent()
   - ScrollTo → page.locator().scrollIntoViewIfNeeded()
   - TakeScreenshot → page.screenshot()
4. RAG ENRICHMENT: For unmapped actions, query Azure AI Search index "ent14_index" with query: "Playwright equivalent for Tosca action: {action_mode}". Return top 3 chunks. Inject into LLM context.
5. GENERATING: Call Azure OpenAI GPT-4o with: full IR + RAG context + instructions to generate idiomatic Playwright TypeScript (or JS) with: imports block, describe() wrapper, beforeEach() navigation, test() blocks per TestCase, await on all interactions, expect() assertions, inline comments per step. Return structured JSON: {"steps": [{"step_id": "...", "playwright_code": "...", "confidence": 0.0-1.0}]}
6. COMPILING: Assemble .spec.ts file from steps. Run subprocess: "npx tsc --noEmit --target ES2020 --module commonjs {file}" in temp dir. If errors: send error text + failing code back to LLM for single correction pass.
7. OUTPUT: Store .spec.ts in Azure Blob. Return quality report: {total_steps, converted_steps, low_confidence_steps, compilation_status, output_blob_path}

---

## AGENT 2: TestGenerationAgent

### Input schema:
```python
class TestGenInput(BaseModel):
    jira_story_id: str
    domain_tag: str             # payments | accounts | lending | transfers | other
    jtmf_suite_id: Optional[str]
    constraints_yaml: Optional[str]  # override constraint config
    project_id: str
```

### Steps to implement:
1. FETCHING STORY: Call Jira GET /rest/api/3/issue/{jira_story_id}. Extract summary, description, acceptance criteria (look in description body for "AC:" or "Acceptance Criteria:" sections), labels, parent epic.
2. CHECKING COVERAGE: If jtmf_suite_id provided: call JTMF API to get existing test titles for same epic. Build deduplication set.
3. RAG ENRICHMENT: Query Azure AI Search for domain entities found in AC (e.g. "transfer amount field constraints payments domain"). Return top-5 chunks of domain rules, field constraints, data dictionaries.
4. GENERATING SCENARIOS: Call LLM with: AC lines + dedup context + RAG domain rules. Instructions: generate 5-10 BDD Gherkin scenarios; minimum 2 negative (invalid input, business rule violation) and 2 boundary (at-limit, one-beyond-limit); use Scenario Outline + Examples for data-driven cases; avoid duplicating existing tests; output JSON: {"scenarios": [{"name": "...", "gherkin": "...", "examples_table": [{"col1": "val", ...}]}]}
5. SYNTHESIZING DATA: For each examples_table column, apply DataConstraintEngine:
   - Load constraint config from qg_domain_configs table (or constraints_yaml override)
   - numeric fields: generate min, max, min-1, max+1, zero, and 2 mid-range values
   - string fields: empty, 1-char, max-length, max-length+1, special chars
   - enum fields: all valid values + 1 invalid value
   - optional fields: include 1 null row
   - Scan all generated values for PII patterns (Luhn card numbers, SSN format XXX-XX-XXXX) — reject and regenerate
6. VALIDATING: Parse Gherkin output with a regex-based validator (check Given/When/Then structure). Ensure minimum 3 scenarios generated (re-prompt if fewer).
7. OUTPUT: Write .feature file to Azure Blob. Write data JSON/CSV to Azure Blob. Return: {feature_file_path, data_file_path, scenario_count, coverage_gap_lines}

---

## AGENT 3: FailureRCAAgent

### Input schema (also accepted via webhook):
```python
class RCAInput(BaseModel):
    pipeline_run_id: str
    failed_test_ids: List[str]
    service_tag: str
    failure_timestamp: str      # ISO 8601
    project_id: str
```

### Steps to implement:
1. FETCHING LOGS: Parallel async calls (asyncio.gather):
   a. Datadog: GET /api/v2/logs/events with filter.query=service:{service_tag} and time window ±5 minutes. Also GET /api/v1/query for metric time-series: error rate, p95 latency.
   b. Splunk: POST /services/search/jobs/oneshot with search="index=* {service_tag} error OR exception earliest={ts-5m} latest={ts+5m}"
   c. JTMF: GET /test-runs/{pipeline_run_id}/results — test execution records, assertion failures, last_pass_build_id
2. PRE-PROCESSING: Extract stack traces from log events using regex. Normalize (strip package paths to class.method). Rank events by frequency. Detect Datadog anomalies (values > mean + 2σ).
3. FINGERPRINTING: SHA-256(normalized_stack_trace_top_frame + exception_class + service_tag). Query qg_rca_fingerprints table for prior classification history.
4. RAG ENRICHMENT: Query Azure AI Search: "{exception_class} {service_tag} root cause". Return top-3 runbook/known-issue documents from ent14_index.
5. ANALYSING: Call LLM with: top-20 log events + Datadog anomaly summary + JTMF failure record + RAG context + prior fingerprint data. Instructions: classify into one of [code_defect, infra_failure, data_issue, env_misconfiguration, flaky_test]; provide confidence 0-100; list 3-5 recommended fix actions; draft Jira defect description. Output: {"classification": "...", "confidence": 85, "narrative": "...", "fix_actions": [...], "jira_description": "..."}
6. POST-PROCESSING: Upsert qg_rca_fingerprints. If confidence >= 80 AND no open duplicate Jira ticket (check via JQL: project=X AND status!=Done AND summary~"{exception_class}"): auto-create Jira defect.
7. OUTPUT: Store RCA report JSON in qg_jobs.result_payload. Return full report with classification, confidence, evidence, actions.

---

## AGENT 4: TestImpactAgent

### Input schema (also accepted via webhook):
```python
class ImpactInput(BaseModel):
    commit_sha: str
    repository: str
    changed_file_paths: List[str]
    pr_id: Optional[str]
    jira_story_id: Optional[str]
    project_id: str
```

### Steps to implement:
1. FETCHING DIFF: For each changed file path, call JTMF API to get coverage map: which test IDs have coverage on that file. This is the direct_tests set.
2. AST ANALYSIS: For each changed source file, run Python ast module (for .py files) or a basic regex-based function-boundary extractor (for .java, .ts) to identify which function/method names contain the changed line ranges.
3. COVERAGE LOOKUP: Query JTMF API for coverage map. SQL join pattern: for each (file_path, line_range) → get test_ids with coverage.
4. SCORING: Score each test: direct coverage = 100pts, same module but indirect = 25pts. Threshold: exclude tests < 20pts.
5. RISK ASSESSMENT: Call LLM with: changed function names + change_type (classify from diff: logic change vs config vs comment) + direct test count. Output: {"risk_level": "High|Medium|Low", "narrative": "...", "coverage_gap_files": [...]}
6. OUTPUT: Return {recommended_tests: [{test_id, test_name, score, reason}], risk_level, coverage_gaps, total_recommended, total_full_suite}

---

## AGENT 5: RegressionOptimizationAgent

### Input schema:
```python
class RegressionOptInput(BaseModel):
    jtmf_suite_id: str
    days_history: int = 90
    release_risk_profile: Optional[dict]  # {high_risk_domains: [...]}
    project_id: str
```

### Steps to implement:
1. LOADING HISTORY: Call JTMF API: GET /suites/{suite_id}/tests (metadata) and GET /suites/{suite_id}/history?days=90 (execution results per test per run).
2. SCORING FLAKINESS: For each test: pass_rate = PASS_count / total_runs. Compute daily pass rates. flakiness_score = (1 - pass_rate) * 0.6 + std(daily_pass_rates) * 0.4. Tag tests with flakiness_score > 0.35 as FLAKY.
3. CLUSTERING: Build binary coverage vector per test (which source files each test covers). Compute pairwise cosine similarity. Group tests with similarity > 0.90 into redundancy clusters. Within each cluster, retain the test with most defect links and lowest flakiness; mark others as redundant_candidate.
4. RISK SCORING: For each test: risk_score = (defect_link_count/3 * 0.35) + (recency_weight * 0.25) + (coverage_uniqueness * 0.25) + (flakiness_score * -0.15). Normalize 0-100. Threshold: exclude if score < 25. Override: any test linked to open Jira P1/P2 → score = 100.
5. LLM VALIDATION: Call LLM with: top-50 exclusion candidates + active Jira P1/P2 defect areas from Jira API + release_risk_profile. Instructions: for each excluded test, check if name/description semantically aligns with active defect areas — if yes, override to include. Generate per-test rationale and executive summary.
6. COVERAGE CHECK: Compute code_zones covered by optimized suite vs full suite. If ratio < 0.85: raise exclusion threshold by 5pts and re-score. Repeat until >= 0.85.
7. OUTPUT: Return {optimized_tests: [{test_id, score, decision, rationale}], flaky_tests: [...], reduction_percent, coverage_preservation, executive_summary}

---

## CONNECTORS TO BUILD

### Jira (connectors/jira.py):
- get_story(issue_key) → GET /rest/api/3/issue/{key}
- get_story_simplified(issue_key) → calls get_story(), extracts {id, title, acceptance_criteria: List[str]} (used by api/jira.py)
- create_subtask(parent_key, summary, description)
- create_defect(project_key, summary, description) → issuetype: Bug
- search_issues(jql) → GET /rest/api/3/search
- Auth: Basic base64(email:api_token)

### JTMF (connectors/jtmf.py):
- get_suite_tests(suite_id)
- get_suite_history(suite_id, days=90)
- get_coverage_map(file_paths: List[str])
- get_test_run_results(run_id)
- Auth: Bearer JTMF_API_TOKEN

### Datadog (connectors/datadog.py):
- get_logs(service_tag, start_ts, end_ts) → POST /api/v2/logs/events/search
- get_metrics(metric_name, service_tag, start_ts, end_ts) → GET /api/v1/query
- Auth: DD-API-KEY + DD-APPLICATION-KEY headers

### Splunk (connectors/splunk.py):
- search_events(service_tag, start_ts, end_ts) → POST /services/search/jobs/oneshot
- Auth: Bearer SPLUNK_TOKEN

### Confluence (connectors/confluence.py):
- search_content(query) → GET /rest/api/content/search
- get_page(page_id) → GET /rest/api/content/{id}?expand=body.storage
- Auth: Basic base64(email:api_token)

---

## NEW: JIRA STORY API ENDPOINT (api/jira.py)

```python
from fastapi import APIRouter, Depends, HTTPException
from app.connectors.jira import JiraConnector
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/story/{story_id}")
async def get_jira_story(story_id: str, user=Depends(get_current_user)):
    """
    Fetch a Jira story and return a simplified view with parsed acceptance criteria.
    Called by ToscaModule and TestGenModule in the frontend.
    """
    try:
        connector = JiraConnector()
        story = await connector.get_story_simplified(story_id)
        return story
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Jira story not found: {story_id}")
```

Mount in main.py:
```python
from app.api import jira as jira_api
app.include_router(jira_api.router, prefix="/api/v1/jira", tags=["jira"])
```

---

## WEBHOOK ENDPOINTS

### POST /api/v1/webhooks/cicd-failure
Triggered by Jenkins/Azure DevOps on pipeline failure. No user auth — validate HMAC signature from X-Webhook-Signature header.
Body: {"pipeline_run_id": "...", "failed_test_ids": [...], "service_tag": "...", "failure_timestamp": "...", "project_id": "..."}
Action: Create QgJob record with type="rca", dispatch FailureRCAAgent asynchronously using asyncio.create_task().

### POST /api/v1/webhooks/pr-commit
Triggered on PR creation or commit push.
Body: {"commit_sha": "...", "repository": "...", "changed_file_paths": [...], "pr_id": "...", "project_id": "..."}
Action: Create QgJob record with type="impact", dispatch TestImpactAgent asynchronously.

---

## CHATBOT SERVICE (chatbot/service.py)

### Two-step SSE flow (matches frontend exactly):

**Step 1 — POST /api/v1/chat/**
Input: `{"message": "...", "project_id": "..."}`
Action:
1. Create or get QgChatSession for this user
2. Save user message to qg_chat_messages
3. Return `{"session_id": "<uuid>"}` immediately
4. Kick off LLM work in background (asyncio.create_task)

**Step 2 — GET /api/v1/chat/stream/{sessionId}?token={jwt}**
SSE stream — token in query param (same pattern as job stream).
Implementation:
1. Load conversation history from qg_chat_messages (last 20 messages)
2. Query Azure AI Search (ent14_index) with user message → top-3 chunks
3. Build messages: system_prompt + RAG chunks + history + user message
4. System prompt: "You are a QA domain expert assistant for TD Bank. You have access to the TD knowledge base including Confluence documentation, Jira issues, and test management data. Always cite your sources. Only answer questions about QA, testing, code, and related technical topics."
5. Call Azure OpenAI with stream=True. Yield tokens:
```
data: {"type": "token", "token": "Hello"}\n\n
data: {"type": "token", "token": " world"}\n\n
data: {"type": "done", "citations": [{"title": "...", "url": "..."}]}\n\n
```
6. After stream: save assistant response + citations to qg_chat_messages

**IMPORTANT**: Chat SSE uses `{"type": "token"/"done"}` format. Agent job SSE uses `{"event": "step"/"done"}` format. These are different — do not conflate them.

---

## AUTHENTICATION & USER MANAGEMENT

### OVERVIEW
Use email/password authentication with bcrypt-hashed passwords and HS256 JWT tokens. No Azure AD, no MSAL. Azure SDK calls to OpenAI/Search/Blob still use ClientSecretCredential (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET) — this is only for Azure resource access, NOT for user login.

---

### models/user.py — QgUser table:
```python
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from app.core.db import Base
from datetime import datetime
import uuid

class QgUser(Base):
    __tablename__ = "qg_users"

    id               = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    email            = Column(String(255), unique=True, nullable=False, index=True)
    display_name     = Column(String(255), nullable=False)
    hashed_password  = Column(String(255), nullable=False)
    # role: "super_admin" | "admin" | "user"
    # super_admin: full access to all projects, can manage admins
    # admin: can manage users/projects they own or are assigned
    # user: can only access projects in project_access list
    role             = Column(String(50), nullable=False, default="user")
    is_admin         = Column(Boolean, default=False, nullable=False)  # True for super_admin and admin
    is_active        = Column(Boolean, default=True, nullable=False)
    # JSON list of project_ids this user can access: ["uuid1", "uuid2"]
    # null = access to all (used for super_admin)
    project_access   = Column(JSON, default=list)
    created_at       = Column(DateTime, default=datetime.utcnow)
    last_login       = Column(DateTime, nullable=True)
    created_by       = Column(String(255), nullable=True)  # email of admin who created
```

---

### schemas/auth.py — Pydantic schemas (must produce exact frontend response shapes):
```python
from pydantic import BaseModel, EmailStr
from typing import Optional, List

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    """Embedded in TokenResponse — must match frontend expectations exactly."""
    id: str
    email: str
    name: str           # maps from display_name
    role: str           # "super_admin" | "admin" | "user"
    is_admin: bool
    project_access: Optional[List[str]]

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic

class UserCreate(BaseModel):
    email: EmailStr
    display_name: str
    password: str
    role: str = "user"       # "super_admin" | "admin" | "user"
    is_admin: bool = False
    project_access: Optional[List[str]] = []

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    project_access: Optional[List[str]] = None

class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    is_admin: bool
    is_active: bool
    project_access: Optional[List[str]]
    last_login: Optional[str]
    created_by: Optional[str]

    class Config:
        from_attributes = True
```

---

### core/auth.py — JWT implementation:
```python
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from app.models.user import QgUser

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.jwt_secret_key,
                             algorithms=[settings.jwt_algorithm])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(QgUser).filter(QgUser.email == email, QgUser.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

async def require_admin(current_user: QgUser = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def check_project_access(user: QgUser, project_id: str):
    """Raise 403 if user cannot access this project. super_admin bypasses all checks."""
    if user.role == "super_admin":
        return
    if user.project_access is None or project_id not in user.project_access:
        raise HTTPException(status_code=403, detail="You do not have access to this project")

def check_module_access(project: "QgProject", module: str):
    """Raise 403 if the module is not enabled for this project.
    enabled_modules=None means ALL modules enabled (default for new projects).
    enabled_modules=[] means ALL disabled.

    Valid module keys (backend): tosca_convert | test_generation | failure_rca | impact_analysis | regression_opt
    """
    if project.enabled_modules is None:
        return
    if module not in project.enabled_modules:
        raise HTTPException(
            status_code=403,
            detail=f"Module '{module}' is not enabled for project '{project.name}'. "
                   f"Contact your admin to enable it."
        )
```

---

### api/auth.py — Login endpoint (produces exact frontend response shape):
```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.auth import verify_password, create_access_token, get_current_user, hash_password
from app.core.db import get_db
from app.models.user import QgUser
from app.schemas.auth import TokenResponse, UserOut

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(QgUser).filter(QgUser.email == form.username,
                                    QgUser.is_active == True).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_access_token({"sub": user.email, "role": user.role, "is_admin": user.is_admin})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.display_name,        # frontend stores as "name"
            "role": user.role,                 # "super_admin" | "admin" | "user"
            "is_admin": user.is_admin,
            "project_access": user.project_access,
        }
    }

@router.get("/me", response_model=UserOut)
async def me(current_user: QgUser = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
```

---

### schemas/projects.py — ProjectOut must include member_count and created_by:
```python
from pydantic import BaseModel
from typing import Optional, List

class ProjectCreate(BaseModel):
    name: str
    jira_project_key: Optional[str] = None
    domain_tag: Optional[str] = "Payments"

class ProjectOut(BaseModel):
    id: str
    name: str
    domain_tag: Optional[str]
    jira_project_key: Optional[str]
    member_count: int = 0          # count of qg_project_members rows for this project
    created_at: str                # ISO 8601 string
    created_by: Optional[str]      # UUID string of creating user
    enabled_modules: Optional[List[str]]  # None = all enabled

    class Config:
        from_attributes = True
```

---

### schemas/jobs.py — must match frontend job object shape:
```python
from pydantic import BaseModel
from typing import Optional

class JobOut(BaseModel):
    id: str
    type: str          # "tosca-convert" | "test-gen" | "rca" | "impact" | "regression"
    status: str        # "COMPLETE" | "FAILED" | "RUNNING" | "QUEUED"
    submitted: str     # ISO 8601 string (maps from created_at)
    user: str          # display_name of submitting user
    project_id: str

    class Config:
        from_attributes = True
```

---

### schemas/feedback.py — exact frontend payload:
```python
from pydantic import BaseModel
from typing import Optional

class FeedbackCreate(BaseModel):
    job_id: str
    module_type: str        # "tosca" | "test-gen" | "rca" | "impact" | "regression"
    rating: int             # 1-5, or 0 if not rated
    thumbs: Optional[str]   # "up" | "down" | null
    correction: Optional[str] = None
```

---

### api/jobs.py — GET /jobs/ with query params:
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.auth import get_current_user, check_project_access
from app.models.job import QgJob
from app.models.user import QgUser
from app.schemas.jobs import JobOut
from typing import Optional, List

router = APIRouter()

@router.get("/", response_model=List[JobOut])
async def list_jobs(
    project_id: Optional[str] = Query(None),
    limit: int = Query(10, le=100),
    user: QgUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(QgJob)
    if project_id:
        check_project_access(user, project_id)
        q = q.filter(QgJob.project_id == project_id)
    elif user.role != "super_admin":
        # filter to only projects the user can access
        if user.project_access is not None:
            q = q.filter(QgJob.project_id.in_(user.project_access))
    return q.order_by(QgJob.created_at.desc()).limit(limit).all()
```

---

### api/admin.py — Admin-only user & project access management:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.auth import require_admin, hash_password
from app.core.db import get_db
from app.models.user import QgUser
from app.schemas.auth import UserCreate, UserUpdate, UserOut

router = APIRouter()

# ── User Management ───────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
async def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(QgUser).order_by(QgUser.created_at.desc()).all()

@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(payload: UserCreate, db: Session = Depends(get_db),
                      admin=Depends(require_admin)):
    if db.query(QgUser).filter(QgUser.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    # Derive is_admin from role
    is_admin = payload.role in ("super_admin", "admin")
    user = QgUser(
        email=payload.email,
        display_name=payload.display_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_admin=is_admin,
        project_access=payload.project_access or [],
        created_by=admin.email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: str, payload: UserUpdate,
                      db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(QgUser).filter(QgUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.role is not None:
        user.role = payload.role
        user.is_admin = payload.role in ("super_admin", "admin")
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.project_access is not None:
        user.project_access = payload.project_access
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}", status_code=204)
async def deactivate_user(user_id: str, db: Session = Depends(get_db),
                           admin=Depends(require_admin)):
    user = db.query(QgUser).filter(QgUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()

# ── Project Access Management ────────────────────────────────────────────────

@router.post("/users/{user_id}/projects/{project_id}")
async def grant_project_access(user_id: str, project_id: str,
                                db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(QgUser).filter(QgUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    access = list(user.project_access or [])
    if project_id not in access:
        access.append(project_id)
        user.project_access = access
        db.commit()
    return {"message": f"Access granted to project {project_id}"}

@router.delete("/users/{user_id}/projects/{project_id}")
async def revoke_project_access(user_id: str, project_id: str,
                                 db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(QgUser).filter(QgUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.project_access = [p for p in (user.project_access or []) if p != project_id]
    db.commit()
    return {"message": f"Access revoked for project {project_id}"}

# ── Project Module Management ─────────────────────────────────────────────────

# Backend module keys (stored in DB)
ALL_MODULES = ["tosca_convert", "test_generation", "failure_rca", "impact_analysis", "regression_opt"]

@router.get("/projects/{project_id}/modules")
async def get_project_modules(project_id: str, db: Session = Depends(get_db),
                               admin=Depends(require_admin)):
    from app.models.project import QgProject
    project = db.query(QgProject).filter(QgProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    enabled = project.enabled_modules if project.enabled_modules is not None else ALL_MODULES
    return {
        "project_id": project_id,
        "project_name": project.name,
        "modules": [{"key": m, "enabled": m in enabled} for m in ALL_MODULES]
    }

@router.patch("/projects/{project_id}/modules")
async def set_project_modules(project_id: str, payload: dict,
                               db: Session = Depends(get_db), admin=Depends(require_admin)):
    """
    Payload: {"enabled_modules": ["tosca_convert", "test_generation"]}
    Pass null to re-enable all modules.
    Valid backend keys: tosca_convert | test_generation | failure_rca | impact_analysis | regression_opt
    """
    from app.models.project import QgProject
    project = db.query(QgProject).filter(QgProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    modules = payload.get("enabled_modules")
    if modules is not None:
        invalid = [m for m in modules if m not in ALL_MODULES]
        if invalid:
            raise HTTPException(status_code=422,
                detail=f"Invalid module keys: {invalid}. Valid: {ALL_MODULES}")
    project.enabled_modules = modules
    db.commit()
    return {"message": "Module access updated", "enabled_modules": project.enabled_modules}
```

---

### models/project.py — QgProject model:
```python
from sqlalchemy import Column, String, Boolean, DateTime, JSON, Integer
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from app.core.db import Base
from datetime import datetime
import uuid

class QgProject(Base):
    __tablename__ = "qg_projects"

    id                   = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    name                 = Column(String(255), nullable=False)
    jira_project_key     = Column(String(50), nullable=True)
    jtmf_suite_group     = Column(String(255), nullable=True)
    confluence_space     = Column(String(100), nullable=True)
    domain_tag           = Column(String(100), nullable=True)
    search_index_prefix  = Column(String(100), nullable=True)
    # JSON list of enabled module backend keys. None = all modules enabled.
    # Valid: tosca_convert | test_generation | failure_rca | impact_analysis | regression_opt
    enabled_modules      = Column(JSON, nullable=True, default=None)
    created_at           = Column(DateTime, default=datetime.utcnow)
    created_by           = Column(UNIQUEIDENTIFIER, nullable=True)  # user.id who created
    is_active            = Column(Boolean, default=True)

class QgProjectMember(Base):
    __tablename__ = "qg_project_members"

    id               = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    project_id       = Column(UNIQUEIDENTIFIER, nullable=False)
    user_email       = Column(String(255), nullable=False)
    user_display_name = Column(String(255), nullable=True)
    role             = Column(String(50), default="member")  # member | admin
    added_at         = Column(DateTime, default=datetime.utcnow)
```

Note: `member_count` in ProjectOut must be computed dynamically — count QgProjectMember rows where project_id matches, or store as a denormalized column updated on membership changes.

---

### IMPORTANT: Use check_module_access in every job submission endpoint
In api/jobs.py, add a module access check at the start of every job submission handler:

```python
from app.models.project import QgProject
from app.core.auth import check_project_access, check_module_access

@router.post("/tosca-convert")
async def submit_tosca(payload: ToscaConvertInput, user=Depends(get_current_user),
                       db: Session = Depends(get_db)):
    check_project_access(user, payload.project_id)
    project = db.query(QgProject).filter(QgProject.id == payload.project_id).first()
    check_module_access(project, "tosca_convert")
    # ... create QgJob with type="tosca-convert", status="QUEUED"
    # ... dispatch agent with asyncio.create_task()

# Module check mapping for all 5 job endpoints:
# POST /tosca-convert      → check_module_access(project, "tosca_convert")
# POST /test-generation    → check_module_access(project, "test_generation")
# POST /failure-rca        → check_module_access(project, "failure_rca")
# POST /impact-analysis    → check_module_access(project, "impact_analysis")
# POST /regression-optimize → check_module_access(project, "regression_opt")
```

---

### main.py — include all routers and bootstrap admin user:
```python
from app.api import auth, admin, jobs, projects, jira as jira_api, chatbot, feedback, webhooks

app.include_router(auth.router,      prefix="/api/v1/auth",     tags=["auth"])
app.include_router(admin.router,     prefix="/api/v1/admin",    tags=["admin"])
app.include_router(jobs.router,      prefix="/api/v1/jobs",     tags=["jobs"])
app.include_router(projects.router,  prefix="/api/v1/projects", tags=["projects"])
app.include_router(jira_api.router,  prefix="/api/v1/jira",     tags=["jira"])
app.include_router(chatbot.router,   prefix="/api/v1/chat",     tags=["chat"])
app.include_router(feedback.router,  prefix="/api/v1/feedback", tags=["feedback"])
app.include_router(webhooks.router,  prefix="/api/v1/webhooks", tags=["webhooks"])
```

Bootstrap admin on startup (creates super_admin role):
```python
@app.on_event("startup")
async def bootstrap_admin():
    db = next(get_db())
    if db.query(QgUser).count() == 0:
        admin_user = QgUser(
            email=settings.admin_bootstrap_email,
            display_name="QGenie Admin",
            hashed_password=hash_password(settings.admin_bootstrap_password),
            role="super_admin",
            is_admin=True,
            project_access=None,  # None = all projects
        )
        db.add(admin_user)
        db.commit()
        print(f"Bootstrap super_admin created: {settings.admin_bootstrap_email}")
```

---

### config.py additions for JWT:
Add to Settings class:
```python
jwt_secret_key: str
jwt_algorithm: str = "HS256"
jwt_expire_minutes: int = 480
admin_bootstrap_email: str = "admin@tdbank.com"
admin_bootstrap_password: str
```

---

### requirements.txt additions:
```
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
azure-identity==1.17.1          # for ClientSecretCredential (Azure SDK calls only)
```

---

### IMPORTANT: Azure SDK auth update
In rag/pipeline.py and blob_storage.py, replace DefaultAzureCredential with:
```python
from azure.identity import ClientSecretCredential

credential = ClientSecretCredential(
    tenant_id=settings.azure_tenant_id,
    client_id=settings.azure_client_id,
    client_secret=settings.azure_client_secret
)
```
This is used ONLY for calling Azure OpenAI, Azure AI Search, and Azure Blob — NOT for user login.

---

## BUILD INSTRUCTIONS

1. Create all files in the structure above
2. For every connector: implement full async methods with httpx, include retry logic (3 attempts with exponential backoff), raise HTTPException with clear error messages on failure
3. For every agent: implement all pipeline steps with SSE events, never call LLM for deterministic steps
4. All database operations use async SQLAlchemy sessions
5. Include a complete requirements.txt
6. Include Dockerfile: FROM python:3.11-slim, install ODBC driver 18 for SQL Server, pip install -r requirements.txt, CMD uvicorn app.main:app --host 0.0.0.0 --port 8000
7. Include comprehensive error handling — every external API call wrapped in try/except
8. Write tests for: ToscaConvertAgent parser, FailureRCAAgent fingerprint, all connectors (use pytest + respx for mocking httpx)
9. Add CORS middleware allowing the React dev server origin

Start by creating the directory structure, then implement files in this order:
core/config.py → core/db.py → models/user.py → models/ (rest) → schemas/auth.py → schemas/projects.py → schemas/jobs.py → schemas/feedback.py → core/auth.py → connectors/ → rag/pipeline.py → agents/base.py → agents/tosca_convert/ → agents/test_generation/ → agents/failure_rca/ → agents/impact_analysis/ → agents/regression_opt/ → chatbot/ → api/auth.py → api/admin.py → api/jira.py → api/jobs.py → api/projects.py → api/chatbot.py → api/feedback.py → api/webhooks.py → main.py → Dockerfile → requirements.txt
