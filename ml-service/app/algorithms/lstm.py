"""LSTM-based prediction algorithm.

This algorithm uses Long Short-Term Memory (LSTM) neural networks
to model sequential patterns in lottery draws.

Note: Full LSTM implementation requires TensorFlow/PyTorch which are
heavy dependencies. This provides a lightweight statistical approximation
that mimics LSTM behavior for pattern recognition.
"""

from itertools import combinations
from typing import List, Dict, Any, Tuple
import random
import numpy as np

from .base import LotteryPredictor, PredictionResult
from .utils import extract_red_balls, extract_blue_balls


class LSTMPredictor(LotteryPredictor):
    """LSTM-inspired lottery prediction."""

    def __init__(self):
        super().__init__(name="lstm", max_confidence=68.0)
        self.sequence_length = 10  # Length of sequence to analyze

    def predict(
        self,
        historical_data: List[Dict[str, Any]],
        dataset_size: int
    ) -> PredictionResult:
        """
        Generate prediction using LSTM-inspired sequential analysis.

        Strategy:
        1. Analyze sequences of draws to find patterns
        2. Weight recent draws more heavily (mimicking LSTM's memory)
        3. Identify numbers with strong sequential momentum
        4. Combine sequential patterns with frequency analysis

        Args:
            historical_data: List of historical lottery draws
            dataset_size: Number of recent draws to analyze

        Returns:
            PredictionResult with predicted numbers and confidence
        """
        if not historical_data or len(historical_data) < 30:
            return self.generate_random_fallback()

        # Limit to requested dataset size
        data_to_analyze = historical_data[:dataset_size]

        # Extract ball numbers
        red_balls_list = extract_red_balls(data_to_analyze)
        blue_balls_list = extract_blue_balls(data_to_analyze)

        if len(red_balls_list) < 30:
            return self.generate_random_fallback()

        # Predict using sequential pattern analysis
        predicted_red, red_score_profile = self._predict_red_sequence(red_balls_list)
        predicted_blue = self._predict_blue_sequence(blue_balls_list)

        # Calculate confidence based on pattern strength
        confidence = self._calculate_confidence(red_score_profile, predicted_red)

        selected_strength = 0.0
        if predicted_red:
            idxs = [num - 1 for num in predicted_red if 1 <= num <= len(red_score_profile)]
            if idxs:
                selected_strength = float(np.mean(red_score_profile[idxs]))

        result = PredictionResult(
            red_balls=predicted_red,
            blue_ball=predicted_blue,
            confidence=confidence,
            metadata={
                'model': 'lstm_inspired',
                'sequence_length': self.sequence_length,
                'training_samples': len(red_balls_list),
                'signal_strength': round(selected_strength, 4),
            }
        )

        return self.validate_prediction(result)

    def _predict_red_sequence(
        self,
        red_balls_history: List[List[int]]
    ) -> Tuple[List[int], np.ndarray]:
        """
        Predict red balls using sequential pattern analysis.

        Returns:
            Tuple of predicted numbers and score profile for confidence calculation
        """
        sequence_matrix = self._build_sequence_matrix(red_balls_history, 33)

        if sequence_matrix.size == 0:
            return sorted(random.sample(range(1, 34), 6)), np.zeros(33)

        long_term_profile = sequence_matrix.mean(axis=0)
        recent_profile = self._recent_weighted_profile(sequence_matrix)
        ema_profile = self._exponential_memory(sequence_matrix)
        co_occurrence = self._co_occurrence_scores(red_balls_history)

        combined_scores = 0.4 * recent_profile + 0.3 * ema_profile + 0.3 * co_occurrence
        max_score = np.max(combined_scores)
        normalized_scores = combined_scores / max_score if max_score > 0 else combined_scores

        ranking = np.argsort(-normalized_scores)[:6] + 1
        return sorted(ranking.tolist()), normalized_scores

    def _predict_blue_sequence(self, blue_balls_history: List[int]) -> int:
        """
        Predict blue ball using sequential analysis.
        """
        if len(blue_balls_history) < 10:
            return random.randint(1, 16)

        matrix = self._build_sequence_matrix([[num] for num in blue_balls_history], 16)
        recent_profile = self._recent_weighted_profile(matrix)
        ema_profile = self._exponential_memory(matrix, alpha=0.25)

        combined_scores = 0.6 * recent_profile + 0.4 * ema_profile
        return int(np.argmax(combined_scores)) + 1

    def _calculate_confidence(
        self,
        score_profile: np.ndarray,
        predicted: List[int]
    ) -> float:
        """
        Calculate confidence based on pattern strength.
        """
        if score_profile.size == 0 or not predicted:
            return 50.0

        selected_scores = [score_profile[num - 1] for num in predicted if 1 <= num <= len(score_profile)]
        if not selected_scores:
            return 50.0

        avg_score = float(np.mean(selected_scores))
        spread = float(np.std(score_profile))
        stability = max(0.0, 1.0 - spread)

        confidence = 52.0 + avg_score * 25.0 + stability * 8.0
        return min(confidence, self.max_confidence)

    def _build_sequence_matrix(self, history: List[List[int]], size: int) -> np.ndarray:
        """
        Convert history into a binary matrix for sequence processing.
        """
        if not history:
            return np.zeros((0, size))

        matrix = np.zeros((len(history), size))
        for idx, draw in enumerate(history):
            for number in draw:
                if 1 <= number <= size:
                    matrix[idx, number - 1] = 1
        return matrix

    def _recent_weighted_profile(self, matrix: np.ndarray) -> np.ndarray:
        """
        Apply a cosine-based weighting to emphasize the latest draws.
        """
        window = matrix[-min(self.sequence_length, len(matrix)):]
        if window.size == 0:
            return np.zeros(matrix.shape[1])

        weights = np.linspace(0, np.pi / 2, num=window.shape[0])
        weight_vector = np.sin(weights)  # 0 -> 1 ramp
        weighted = (window.T * weight_vector).sum(axis=1)
        return weighted / weight_vector.sum()

    def _exponential_memory(self, matrix: np.ndarray, alpha: float = 0.18) -> np.ndarray:
        """
        Exponential moving average to mimic LSTM memory cell behaviour.
        """
        ema = np.zeros(matrix.shape[1])
        for row in matrix:
            ema = (1 - alpha) * ema + alpha * row
        return ema / np.max(ema) if np.max(ema) > 0 else ema

    def _co_occurrence_scores(self, history: List[List[int]]) -> np.ndarray:
        """
        Measure how often numbers appear together to capture sequence clusters.
        """
        window = history[-max(self.sequence_length * 3, 30):]
        scores = np.zeros(33)

        if not window:
            return scores

        co_matrix = np.zeros((33, 33))
        for draw in window:
            for a, b in combinations(sorted(set(draw)), 2):
                if 1 <= a <= 33 and 1 <= b <= 33:
                    co_matrix[a - 1, b - 1] += 1
                    co_matrix[b - 1, a - 1] += 1

        scores = co_matrix.sum(axis=1)
        max_score = scores.max()
        return scores / max_score if max_score > 0 else scores


def lstm_predict(historical_data: List[Dict[str, Any]], dataset_size: int) -> Dict[str, Any]:
    """
    Legacy function wrapper for LSTM prediction.

    Args:
        historical_data: List of historical lottery draws
        dataset_size: Number of recent draws to analyze

    Returns:
        Dictionary containing prediction results
    """
    predictor = LSTMPredictor()
    result = predictor.predict(historical_data, dataset_size)
    return result.to_dict()
