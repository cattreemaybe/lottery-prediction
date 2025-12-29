"""
@fileoverview: router.py
@module: ml-service/app/api/router

Input:
#   - .v1

Output:
#   - (no exports)

Pos: ml-service/app/api/router.py
"""

from fastapi import APIRouter

from .v1 import algorithms, predict

api_router = APIRouter()

api_router.include_router(algorithms.router, prefix="/v1/algorithms", tags=["algorithms"])
api_router.include_router(predict.router, prefix="/v1/predict", tags=["predict"])
