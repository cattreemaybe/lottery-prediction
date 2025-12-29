"""ML prediction algorithms package."""

from .base import LotteryPredictor, PredictionResult
from .frequency import FrequencyPredictor, frequency_analysis
from .trend import TrendPredictor, trend_analysis
from .random_forest import RandomForestPredictor, random_forest_predict
from .lstm import LSTMPredictor, lstm_predict
from .ensemble import EnsemblePredictor, ensemble_predict

__all__ = [
    # Base classes
    'LotteryPredictor',
    'PredictionResult',
    # Predictor classes
    'FrequencyPredictor',
    'TrendPredictor',
    'RandomForestPredictor',
    'LSTMPredictor',
    'EnsemblePredictor',
    # Legacy functions
    'frequency_analysis',
    'trend_analysis',
    'random_forest_predict',
    'lstm_predict',
    'ensemble_predict',
]
