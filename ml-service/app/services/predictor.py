"""Prediction service coordinator.

This module routes prediction requests to appropriate algorithms
and manages the prediction workflow.
"""

from datetime import datetime
from typing import Literal
import random

from ..algorithms import (
    frequency_analysis,
    trend_analysis,
    random_forest_predict,
    lstm_predict,
    ensemble_predict,
)
from .data_fetcher import fetch_historical_data_sync, DataFetchError

PredictionAlgorithm = Literal['ensemble', 'frequency', 'trend', 'random_forest', 'lstm']


def run_prediction(algorithm: PredictionAlgorithm, dataset_size: int) -> dict:
    """
    Run prediction using specified algorithm.

    This is the main entry point for prediction requests. It:
    1. Fetches historical data from the backend
    2. Routes to the appropriate algorithm
    3. Returns standardized prediction result

    Args:
        algorithm: Algorithm to use for prediction
        dataset_size: Number of historical draws to analyze

    Returns:
        Prediction result dictionary containing:
            - red_balls: List[int] - 6 predicted red ball numbers
            - blue_ball: int - predicted blue ball number
            - confidence: float - confidence score (0-100)
            - dataset_size: int - number of data points used
            - generated_at: datetime - timestamp of prediction
            - algorithm: str - algorithm used
    """
    # Fetch historical data from backend
    try:
        historical_data = fetch_historical_data_sync(count=dataset_size)
        print(f"Fetched {len(historical_data)} historical draws for {algorithm} prediction")
    except DataFetchError as e:
        print(f"Warning: Failed to fetch historical data: {e}")
        # Fallback to empty data (algorithms will handle gracefully)
        historical_data = []

    # Route to appropriate algorithm
    try:
        if algorithm == 'frequency':
            result = frequency_analysis(historical_data, dataset_size)
        elif algorithm == 'trend':
            result = trend_analysis(historical_data, dataset_size)
        elif algorithm == 'random_forest':
            result = random_forest_predict(historical_data, dataset_size)
        elif algorithm == 'lstm':
            result = lstm_predict(historical_data, dataset_size)
        elif algorithm == 'ensemble':
            result = ensemble_predict(historical_data, dataset_size)
        else:
            # Unknown algorithm, use random fallback
            result = _random_fallback()

        # Ensure result has required fields
        if not isinstance(result, dict):
            raise ValueError("Algorithm returned invalid result format")

        if 'red_balls' not in result or 'blue_ball' not in result or 'confidence' not in result:
            raise ValueError("Algorithm result missing required fields")

    except Exception as e:
        print(f"Error in {algorithm} prediction: {e}")
        # Fallback to random prediction on error
        result = _random_fallback()
        result['error'] = str(e)

    # Add metadata
    result['dataset_size'] = dataset_size
    result['generated_at'] = datetime.utcnow()
    result['algorithm'] = algorithm

    return result


def _random_fallback() -> dict:
    """
    Generate random prediction as fallback.

    Used when:
    - No historical data is available
    - Algorithm execution fails
    - Invalid algorithm is specified

    Returns:
        Random prediction with low confidence
    """
    red_balls = sorted(random.sample(range(1, 34), 6))
    blue_ball = random.randint(1, 16)

    return {
        'red_balls': red_balls,
        'blue_ball': blue_ball,
        'confidence': 30.0,
        'fallback': True,
    }
