import os
import time
from datetime import datetime
from fastapi import FastAPI, Request
from dotenv import load_dotenv
from app.api import sharepoint
from fastapi.middleware.cors import CORSMiddleware
from app.api.ocr import router as ocr_router
import sys
from app.api import users
from app.api import activity
from app.api.sharepoint import content_router
from app.api import settings
from app.routers.blocks import router as blocks_router
from app.api.blocks import router as api_blocks_router
from app.api import cache
from app.api import preload
from app.api import search
from app.api import images
from app.api.thumbnails import routes as thumbnails_router # Updated import
from app.api import system_monitor
from app.api import database_settings
from app.startup import setup_startup_tasks, preload_health_check

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],  # You can use ["*"] for development, but it's not safe for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sharepoint.router, prefix="/api/sharepoint", tags=["sharepoint"])
app.include_router(ocr_router, prefix="/api/ocr")
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(activity.router, prefix="/api/notifications/activity", tags=["activity"])
app.include_router(content_router, prefix="/api/content/files", tags=["content"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
from app.routers import localizations
app.include_router(localizations.router, prefix="/api/localizations", tags=["localizations"])
app.include_router(blocks_router, prefix="/api/blocks")
app.include_router(api_blocks_router, prefix="/api/blocks")
app.include_router(cache.router, prefix="/api/cache", tags=["cache"])
app.include_router(preload.router, prefix="/api/preload", tags=["preload"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(thumbnails_router.router, prefix="/api/thumbnails", tags=["thumbnails"]) # Updated router
app.include_router(system_monitor.router, prefix="/api/system-monitor", tags=["system_monitor"])
app.include_router(database_settings.router, prefix="/api/settings", tags=["database_settings"])

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/health")
def api_health_check():
    """API-prefixed health check endpoint for frontend status monitoring."""
    return {"status": "ok", "service": "backend", "timestamp": import_time()}

@app.get("/health/preload")
def preload_health():
    """Health check endpoint specifically for the preload system."""
    return preload_health_check()

# Setup startup tasks
setup_startup_tasks(app)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL EXCEPTION: {exc}", file=sys.stderr)
    raise exc

def import_time():
    """Return current timestamp in ISO format."""
    return datetime.now().isoformat()