"""
@fileoverview: config.py
@module: ml-service/app/core/config

Input:
#   - (no external imports)

Output:
#   - Settings
#   - get_settings

Pos: ml-service/app/core/config.py
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = Field(default="development", env="PYTHON_ENV")
    prediction_timeout_seconds: int = Field(default=5, env="PREDICTION_TIMEOUT_SECONDS")
    recommended_dataset_size: int = Field(default=200, env="RECOMMENDED_DATASET_SIZE")
    min_dataset_size: int = Field(default=50, env="MIN_DATASET_SIZE")
    backend_api_url: str = Field(default="http://127.0.0.1:4000/api", env="BACKEND_API_URL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # 忽略多余变量
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
