"""Trend-based prediction using time series analysis.

This algorithm uses ARIMA (AutoRegressive Integrated Moving Average)
to capture trends and patterns in historical lottery data.
"""

from typing import List, Dict, Any
import random
import numpy as np

from .base import LotteryPredictor, PredictionResult
from .utils import extract_red_balls, extract_blue_balls, moving_average

try:
    from statsmodels.tsa.arima.model import ARIMA
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False


class TrendPredictor(LotteryPredictor):
    """Trend-based lottery prediction using ARIMA."""

    def __init__(self):
        super().__init__(name="trend", max_confidence=70.0)

    def predict(
        self,
        historical_data: List[Dict[str, Any]],
        dataset_size: int
    ) -> PredictionResult:
        """
        Generate prediction based on trend analysis.

        Strategy:
        1. Extract time series for each number's appearance
        2. Apply ARIMA or moving average to detect trends
        3. Select numbers with upward trend momentum
        4. Balance between trending and historically frequent numbers

        Args:
            historical_data: List of historical lottery draws
            dataset_size: Number of recent draws to analyze

        Returns:
            PredictionResult with predicted numbers and confidence
        """
        if not historical_data or len(historical_data) < 30:
            # Need sufficient data for trend analysis
            return self.generate_random_fallback()

        # Limit to requested dataset size
        data_to_analyze = historical_data[:dataset_size]

        # Extract ball numbers
        red_balls_list = extract_red_balls(data_to_analyze)
        blue_balls_list = extract_blue_balls(data_to_analyze)

        if not red_balls_list or len(red_balls_list) < 30:
            return self.generate_random_fallback()

        # Calculate trend scores for red balls
        red_trend_scores = self._calculate_trend_scores(
            red_balls_list,
            range_max=33
        )

        # Select top 6 red balls by trend score
        sorted_red = sorted(red_trend_scores.items(), key=lambda x: x[1], reverse=True)
        predicted_red = sorted([num for num, _ in sorted_red[:6]])

        # Calculate trend for blue balls
        blue_trend_scores = self._calculate_blue_trend(blue_balls_list)
        predicted_blue = max(blue_trend_scores, key=blue_trend_scores.get)

        # Calculate confidence based on trend strength
        top_6_scores = [score for _, score in sorted_red[:6]]
        avg_trend_strength = np.mean(top_6_scores) if top_6_scores else 0
        confidence = 50 + (avg_trend_strength * 20)  # Scale to 50-70 range

        result = PredictionResult(
            red_balls=predicted_red,
            blue_ball=predicted_blue,
            confidence=confidence,
            metadata={
                'trend_method': 'arima' if HAS_STATSMODELS else 'moving_average',
                'avg_trend_strength': round(avg_trend_strength, 3),
                'data_points': len(red_balls_list),
            }
        )

        return self.validate_prediction(result)

    def _calculate_trend_scores(
        self,
        red_balls_history: List[List[int]],
        range_max: int = 33
    ) -> Dict[int, float]:
        """
        Calculate trend scores for each number.

        Args:
            red_balls_history: Historical red ball draws
            range_max: Maximum number in range

        Returns:
            Dictionary mapping number to trend score
        """
        trend_scores = {}

        for num in range(1, range_max + 1):
            # Create binary time series (1 if appears, 0 if not)
            appearances = [1 if num in draw else 0 for draw in red_balls_history]

            if sum(appearances) < 3:
                # Not enough occurrences for meaningful trend
                trend_scores[num] = 0.0
                continue

            # Calculate trend using moving average slope
            window_size = min(10, len(appearances) // 3)
            ma = moving_average(appearances, window=window_size)

            # Calculate slope of recent trend
            if len(ma) >= 5:
                recent_trend = ma[-5:]
                slope = self._calculate_slope(recent_trend)
                trend_scores[num] = slope
            else:
                trend_scores[num] = 0.0

        return trend_scores

    def _calculate_blue_trend(
        self,
        blue_balls_history: List[int]
    ) -> Dict[int, float]:
        """
        Calculate trend scores for blue balls.

        Args:
            blue_balls_history: Historical blue ball numbers

        Returns:
            Dictionary mapping blue ball number to trend score
        """
        trend_scores = {i: 0.0 for i in range(1, 17)}

        for num in range(1, 17):
            # Create binary time series
            appearances = [1 if ball == num else 0 for ball in blue_balls_history]

            if sum(appearances) < 2:
                continue

            # Moving average trend
            window_size = min(8, len(appearances) // 3)
            ma = moving_average(appearances, window=window_size)

            if len(ma) >= 3:
                recent_trend = ma[-3:]
                slope = self._calculate_slope(recent_trend)
                trend_scores[num] = slope

        return trend_scores

    @staticmethod
    def _calculate_slope(values: List[float]) -> float:
        """
        Calculate slope of a sequence using linear regression.

        Args:
            values: Sequence of values

        Returns:
            Slope coefficient
        """
        if len(values) < 2:
            return 0.0

        n = len(values)
        x = np.arange(n)
        y = np.array(values)

        # Linear regression: y = mx + b
        x_mean = np.mean(x)
        y_mean = np.mean(y)

        numerator = np.sum((x - x_mean) * (y - y_mean))
        denominator = np.sum((x - x_mean) ** 2)

        if denominator == 0:
            return 0.0

        slope = numerator / denominator
        return slope


def trend_analysis(historical_data: List[Dict[str, Any]], dataset_size: int) -> Dict[str, Any]:
    """
    Legacy function wrapper for trend analysis.

    Args:
        historical_data: List of historical lottery draws
        dataset_size: Number of recent draws to analyze

    Returns:
        Dictionary containing prediction results
    """
    predictor = TrendPredictor()
    result = predictor.predict(historical_data, dataset_size)
    return result.to_dict()
