import os
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import db
from .routers import auth, documents, pipeline, validation, confidence, verification, misc, users

app = FastAPI(title="IntelliLand API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:8443").split(","), allow_methods=["*"], allow_headers=["*"])
db.seed_users(os.environ.get("USERS_JSON", "[]"))

@app.middleware("http")
async def security_headers(request, call_next):
    resp = await call_next(request)
    resp.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer"})
    if request.url.path.startswith("/api"):
        resp.headers["Cache-Control"] = "no-store"
    if os.environ.get("HTTPS") == "1":
        resp.headers["Strict-Transport-Security"] = "max-age=31536000"
    return resp

v1 = APIRouter(prefix="/api/v1")
for r in (users.router, auth.router, documents.router, pipeline.router, validation.router, confidence.router, verification.router, misc.audit, misc.gis, misc.reports):
    v1.include_router(r)
app.include_router(v1)

@app.get("/health")
def health():
    return {"status": "ok"}
