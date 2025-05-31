import os
from fastapi import FastAPI, Request
from dotenv import load_dotenv
from app.api import sharepoint
from fastapi.middleware.cors import CORSMiddleware
from app.api import ocr
import sys
from app.api import users
from app.api import activity
from app.api.sharepoint import content_router
from app.api import settings
from app.routers.blocks import router as blocks_router
from app.api import cache



load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://localhost:5174",
    ],  # You can use ["*"] for development, but it's not safe for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sharepoint.router, prefix="/api/sharepoint", tags=["sharepoint"])
app.include_router(ocr.router, prefix="/api/ocr")
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(activity.router, prefix="/api/notifications/activity", tags=["activity"])
app.include_router(content_router, prefix="/api/content/files", tags=["content"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(blocks_router, prefix="/api/blocks")
app.include_router(cache.router, prefix="/api/cache", tags=["cache"])

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL EXCEPTION: {exc}", file=sys.stderr)
    raise exc