"""Frequency-based prediction algorithm.

This algorithm analyzes historical lottery data and recommends numbers
based on their appearance frequency.
"""

from typing import List, Dict, Any
import random

from .base import LotteryPredictor, PredictionResult
from .utils import (
    extract_red_balls,
    extract_blue_balls,
    calculate_frequency,
    calculate_frequency_confidence,
    calculate_hot_cold_numbers
)


class FrequencyPredictor(LotteryPredictor):
    """Frequency-based lottery prediction."""

    def __init__(self):
        super().__init__(name="frequency", max_confidence=75.0)

    def predict(
        self,
        historical_data: List[Dict[str, Any]],
        dataset_size: int
    ) -> PredictionResult:
        """
        Generate prediction based on number frequency analysis.

        Strategy:
        1. Count appearance frequency of each number
        2. Select top 6 most frequent red balls
        3. Select most frequent blue ball
        4. Calculate confidence based on frequency concentration

        Args:
            historical_data: List of historical lottery draws
            dataset_size: Number of recent draws to analyze

        Returns:
            PredictionResult with predicted numbers and confidence
        """
        if not historical_data:
            return self.generate_random_fallback()

        # Limit to requested dataset size
        data_to_analyze = historical_data[:dataset_size]

        # Extract ball numbers
        red_balls_list = extract_red_balls(data_to_analyze)
        blue_balls_list = extract_blue_balls(data_to_analyze)

        if not red_balls_list:
            return self.generate_random_fallback()

        # Calculate frequencies
        all_red_balls = [ball for draw in red_balls_list for ball in draw]
        red_freq = calculate_frequency(all_red_balls, range_max=33)
        blue_freq = calculate_frequency(blue_balls_list, range_max=16)

        # Select top 6 most frequent red balls
        sorted_red = sorted(red_freq.items(), key=lambda x: x[1], reverse=True)
        predicted_red = sorted([num for num, _ in sorted_red[:6]])

        # Select most frequent blue ball
        sorted_blue = sorted(blue_freq.items(), key=lambda x: x[1], reverse=True)
        predicted_blue = sorted_blue[0][0] if sorted_blue else random.randint(1, 16)

        # Calculate confidence
        confidence = calculate_frequency_confidence(predicted_red, red_freq)

        # Get hot/cold classification for metadata
        hot, cold, neutral = calculate_hot_cold_numbers(red_freq)

        result = PredictionResult(
            red_balls=predicted_red,
            blue_ball=predicted_blue,
            confidence=confidence,
            metadata={
                'hot_numbers': hot,
                'cold_numbers': cold,
                'neutral_numbers': neutral,
                'top_red_frequency': sorted_red[0][1] if sorted_red else 0,
                'top_blue_frequency': sorted_blue[0][1] if sorted_blue else 0,
            }
        )

        return self.validate_prediction(result)


def frequency_analysis(historical_data: List[Dict[str, Any]], dataset_size: int) -> Dict[str, Any]:
    """
    Legacy function wrapper for frequency analysis.

    Args:
        historical_data: List of historical lottery draws
        dataset_size: Number of recent draws to analyze

    Returns:
        Dictionary containing prediction results
    """
    predictor = FrequencyPredictor()
    result = predictor.predict(historical_data, dataset_size)
    return result.to_dict()
