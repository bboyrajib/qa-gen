from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.db import create_tables, get_db
from app.core.auth import hash_password
from app.core.config import settings
from app.api import auth, admin, jobs, projects, jira as jira_api, chatbot, feedback, webhooks

app = FastAPI(title="QGenie 2.0", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(jira_api.router, prefix="/api/v1/jira", tags=["jira"])
app.include_router(chatbot.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(feedback.router, prefix="/api/v1/feedback", tags=["feedback"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])


@app.on_event("startup")
async def startup():
    create_tables()
    await bootstrap_admin()


async def bootstrap_admin():
    from app.models.user import QgUser
    import uuid
    db = next(get_db())
    try:
        if db.query(QgUser).count() == 0:
            admin_user = QgUser(
                id=uuid.uuid4(),
                email=settings.admin_bootstrap_email,
                display_name="QGenie Admin",
                hashed_password=hash_password(settings.admin_bootstrap_password),
                role="super_admin",
                is_admin=True,
                project_access=None,
            )
            db.add(admin_user)
            db.commit()
            print(f"[bootstrap] super_admin created: {settings.admin_bootstrap_email}")
    finally:
        db.close()


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
