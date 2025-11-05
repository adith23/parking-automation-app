from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import Base, engine
from .core.redis import close_redis_clients
from .core.socket_manager import socket_app
from .api.v1.api_routes import api_router
from .services.geo_cache_service import start_geo_cache_tasks, stop_geo_cache_tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    Base.metadata.create_all(bind=engine)
    geo_tasks = await start_geo_cache_tasks()
    try:
        yield
    finally:
        await stop_geo_cache_tasks(geo_tasks)
        await close_redis_clients()

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

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.mount("/ws", socket_app)