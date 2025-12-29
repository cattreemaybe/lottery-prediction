"""
@fileoverview: main.py
@module: ml-service/app/main

Input:
#   - .core.config
#   - .api.router

Output:
#   - health_check

Pos: ml-service/app/main.py
"""

from fastapi import FastAPI

from .core.config import settings
from .api.router import api_router

app = FastAPI(
    title="Lottery Prediction ML Service",
    version="0.1.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "environment": settings.environment,
    }
