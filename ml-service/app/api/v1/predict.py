"""
@fileoverview: predict.py
@module: ml-service/app/api/v1/predict

Input:
#   - ...core.config
#   - ...services.predictor

Output:
#   - PredictionRequest
#   - PredictionResponse
#   - generate_prediction
#   - list_predictions

Pos: ml-service/app/api/v1/predict.py
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ...core.config import settings
from ...services.predictor import run_prediction

router = APIRouter()


class PredictionRequest(BaseModel):
    algorithm: str = Field(default="ensemble", examples=["ensemble"])
    dataset_size: int = Field(default=settings.recommended_dataset_size, ge=50, le=1000)


class PredictionResponse(BaseModel):
    red_balls: list[int]
    blue_ball: int
    confidence: float
    generated_at: datetime
    algorithm: str
    dataset_size: int


AVAILABLE_ALGORITHMS = {"ensemble", "frequency", "trend", "random_forest", "lstm"}


@router.post("/", response_model=PredictionResponse, summary="生成预测号码 (占位)")
def generate_prediction(payload: PredictionRequest):
    if payload.dataset_size < settings.min_dataset_size:
        raise HTTPException(status_code=400, detail="数据不足：至少需要50期历史数据才能进行有效预测")

    if payload.algorithm not in AVAILABLE_ALGORITHMS:
        raise HTTPException(status_code=400, detail="不支持的算法类型")

    prediction = run_prediction(payload.algorithm, payload.dataset_size)

    return PredictionResponse(**prediction)


@router.get("/history", summary="列出历史预测", response_model=list[PredictionResponse])
def list_predictions(limit: Annotated[int, Query(ge=1, le=10)] = 10):
    now = datetime.utcnow()
    sample = run_prediction("ensemble", settings.recommended_dataset_size)
    sample["generated_at"] = now

    return [PredictionResponse(**sample) for _ in range(limit)]
