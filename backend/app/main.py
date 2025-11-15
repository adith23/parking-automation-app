from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from .core.config import settings
from .core.redis import close_redis_clients
from .core.socket_manager import socket_app
from .core.database import test_db_connection, Base, engine
from .api.v1.api_routes import api_router
from .services.geo_cache_service import start_geo_cache_tasks, stop_geo_cache_tasks
import app.models.base

@asynccontextmanager
async def lifespan(app: FastAPI):

    # ---- Create DB Tables on startup ----
    Base.metadata.create_all(bind=engine)

    # ---- Start background tasks ----
    geo_tasks = await start_geo_cache_tasks()

    try:
        yield
    finally:
        # ---- Graceful shutdown ----
        await stop_geo_cache_tasks(geo_tasks)
        await close_redis_clients()


# Application Initialization
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.GOOGLE_APPLICATION_CREDENTIALS:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = (
        settings.GOOGLE_APPLICATION_CREDENTIALS
    )


# Health & Readiness Endpoints (needed for ALB/ECS)
@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok"}


@app.get("/ready", tags=["System"])
def ready_check():
    """Check DB & Redis connection lightly."""
    db_ok = test_db_connection()
    return {
        "status": "ready" if db_ok else "not_ready",
        "database_ok": db_ok,
    }


# API Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# socket.io mounted at /ws
app.mount("/ws", socket_app)
