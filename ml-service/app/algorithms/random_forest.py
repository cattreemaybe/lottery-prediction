"""Random Forest-based prediction algorithm.

This algorithm uses Random Forest classifier to predict lottery numbers
based on engineered features from historical data.
"""

from typing import List, Dict, Any, Tuple
import random
import numpy as np

from .base import LotteryPredictor, PredictionResult
from .utils import extract_red_balls, extract_blue_balls, calculate_frequency

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.multioutput import MultiOutputClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


class RandomForestPredictor(LotteryPredictor):
    """Random Forest-based lottery prediction."""

    def __init__(self):
        super().__init__(name="random_forest", max_confidence=72.0)
        self.lookback = 5  # Number of past draws to use as features

    def predict(
        self,
        historical_data: List[Dict[str, Any]],
        dataset_size: int
    ) -> PredictionResult:
        """
        Generate prediction using Random Forest classifier.

        Strategy:
        1. Engineer features from historical patterns
        2. Train separate RF models for each ball position
        3. Predict most likely numbers based on recent patterns
        4. Combine predictions with probability-based selection

        Args:
            historical_data: List of historical lottery draws
            dataset_size: Number of recent draws to analyze

        Returns:
            PredictionResult with predicted numbers and confidence
        """
        if not HAS_SKLEARN:
            # Fallback if sklearn not available
            return self._fallback_predict(historical_data, dataset_size)

        if not historical_data or len(historical_data) < self.lookback + 10:
            return self.generate_random_fallback()

        # Limit to requested dataset size
        data_to_analyze = historical_data[:dataset_size]

        # Extract ball numbers
        red_balls_list = extract_red_balls(data_to_analyze)
        blue_balls_list = extract_blue_balls(data_to_analyze)

        if len(red_balls_list) < self.lookback + 10:
            return self._fallback_predict(historical_data, dataset_size)

        # Train models and make predictions
        predicted_red, avg_slot_probability = self._predict_red_balls(red_balls_list)
        predicted_blue = self._predict_blue_ball(blue_balls_list)

        # Calculate confidence based on model certainty
        confidence = 52.0 + avg_slot_probability * 28.0 + min(len(red_balls_list) / 400, 1.0) * 10.0

        result = PredictionResult(
            red_balls=predicted_red,
            blue_ball=predicted_blue,
            confidence=confidence,
            metadata={
                'model': 'random_forest',
                'lookback': self.lookback,
                'training_samples': len(red_balls_list),
                'has_sklearn': HAS_SKLEARN,
                'slot_probability': round(avg_slot_probability, 4),
            }
        )

        return self.validate_prediction(result)

    def _predict_red_balls(
        self,
        red_balls_history: List[List[int]]
    ) -> Tuple[List[int], float]:
        """
        Predict red balls using Random Forest with engineered features.

        Args:
            red_balls_history: Historical red ball draws

        Returns:
            Tuple of predicted numbers and average slot probability
        """
        X, y = self._prepare_training_data(red_balls_history)

        if len(X) < 25:
            # Not enough data, use frequency-based selection
            fallback = self._frequency_based_selection(red_balls_history)
            return fallback, 0.45

        latest_window = red_balls_history[-self.lookback:]
        latest_features = np.array(self._encode_window_features(latest_window)).reshape(1, -1)

        classifier = RandomForestClassifier(
            n_estimators=180,
            max_depth=None,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )

        pipeline = Pipeline([
            ('scaler', StandardScaler(with_mean=False)),
            ('model', MultiOutputClassifier(classifier))
        ])

        try:
            pipeline.fit(X, y)
        except Exception:
            fallback = self._frequency_based_selection(red_balls_history)
            return fallback, 0.45

        raw_prediction = pipeline.predict(latest_features)[0]
        estimator_list = pipeline.named_steps['model'].estimators_
        slot_probabilities = []
        probability_maps = []

        for idx, estimator in enumerate(estimator_list):
            proba = estimator.predict_proba(latest_features)[0]
            classes = estimator.classes_
            class_prob_map = {int(cls): float(prob) for cls, prob in zip(classes, proba)}
            probability_maps.append(class_prob_map)
            slot_probabilities.append(class_prob_map.get(int(raw_prediction[idx]), 0.0))

        combined_scores = self._aggregate_probabilities(probability_maps)
        predicted_numbers: List[int] = []

        for idx, value in enumerate(raw_prediction.tolist()):
            number = int(value)
            if 1 <= number <= 33 and number not in predicted_numbers:
                predicted_numbers.append(number)
            else:
                fallback_num = self._select_high_probability_number(combined_scores, predicted_numbers)
                predicted_numbers.append(fallback_num)

        average_probability = float(np.mean(slot_probabilities)) if slot_probabilities else 0.45

        return sorted(predicted_numbers[:6]), average_probability

    def _predict_blue_ball(self, blue_balls_history: List[int]) -> int:
        """
        Predict blue ball using frequency and recent pattern.

        Args:
            blue_balls_history: Historical blue ball numbers

        Returns:
            Predicted blue ball number
        """
        if len(blue_balls_history) < 10:
            return random.randint(1, 16)

        # Calculate frequency
        freq = calculate_frequency(blue_balls_history, range_max=16)

        # Weight recent appearances more heavily
        recent = blue_balls_history[:min(20, len(blue_balls_history))]
        recent_freq = calculate_frequency(recent, range_max=16)

        # Combined score: 60% recent, 40% overall
        combined_scores = {}
        for num in range(1, 17):
            overall_weight = freq[num] / len(blue_balls_history) if blue_balls_history else 0
            recent_weight = recent_freq[num] / len(recent) if recent else 0
            combined_scores[num] = 0.4 * overall_weight + 0.6 * recent_weight

        return max(combined_scores, key=combined_scores.get)

    def _prepare_training_data(
        self,
        red_balls_history: List[List[int]]
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Build training dataset for the Random Forest model.
        """
        feature_rows: List[List[float]] = []
        targets: List[List[int]] = []

        for idx in range(self.lookback, len(red_balls_history)):
            window = red_balls_history[idx - self.lookback:idx]
            target_draw = red_balls_history[idx]

            if len(target_draw) < 6:
                continue

            features = self._encode_window_features(window)
            feature_rows.append(features)
            targets.append(target_draw[:6])

        if not feature_rows:
            return np.empty((0, 0)), np.empty((0, 6))

        return np.array(feature_rows), np.array(targets)

    def _encode_window_features(self, window: List[List[int]]) -> List[float]:
        """
        Encode a lookback window into a numerical feature vector.
        """
        features: List[float] = []

        for draw in window:
            one_hot = [0] * 33
            for ball in draw:
                if 1 <= ball <= 33:
                    one_hot[ball - 1] = 1
            features.extend(one_hot)

            draw_array = np.array(draw)
            features.extend([
                float(draw_array.sum()),
                float(draw_array.mean()),
                float(draw_array.std() if len(draw_array) > 1 else 0.0),
                float(np.median(draw_array)),
                float(draw_array.max() - draw_array.min()) if len(draw_array) > 0 else 0.0,
                float(sum(1 for b in draw if b % 2 == 1)),  # odds count
                float(sum(1 for b in draw if b > 16)),      # high numbers
            ])

        flattened = [ball for draw in window for ball in draw]
        if flattened:
            flat_array = np.array(flattened)
            features.extend([
                float(flat_array.mean()),
                float(flat_array.std()),
                float(flat_array.max()),
                float(flat_array.min()),
            ])
        else:
            features.extend([0.0, 0.0, 0.0, 0.0])

        return features

    def _aggregate_probabilities(self, probability_maps: List[Dict[int, float]]) -> Dict[int, float]:
        """
        Combine per-slot probability maps into a single score table.
        """
        combined: Dict[int, float] = {num: 0.0 for num in range(1, 34)}
        for slot_map in probability_maps:
            for num, prob in slot_map.items():
                if 1 <= num <= 33:
                    combined[num] += prob
        return combined

    def _select_high_probability_number(
        self,
        combined_scores: Dict[int, float],
        used_numbers: List[int]
    ) -> int:
        """
        Pick the highest probability number that hasn't been used yet.
        """
        candidates = sorted(
            combined_scores.items(),
            key=lambda item: item[1],
            reverse=True
        )
        for num, _ in candidates:
            if num not in used_numbers:
                return num
        # Fallback to random if all numbers were used (shouldn't happen)
        remaining = [num for num in range(1, 34) if num not in used_numbers]
        return random.choice(remaining) if remaining else random.randint(1, 33)

    def _frequency_based_selection(
        self,
        red_balls_history: List[List[int]]
    ) -> List[int]:
        """
        Fallback to frequency-based selection.

        Args:
            red_balls_history: Historical red ball draws

        Returns:
            List of 6 predicted numbers
        """
        all_numbers = [ball for draw in red_balls_history for ball in draw]
        freq = calculate_frequency(all_numbers, range_max=33)

        sorted_numbers = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return sorted([num for num, _ in sorted_numbers[:6]])

    def _fallback_predict(
        self,
        historical_data: List[Dict[str, Any]],
        dataset_size: int
    ) -> PredictionResult:
        """
        Fallback prediction when sklearn is not available.

        Uses simple pattern matching and frequency analysis.

        Args:
            historical_data: List of historical lottery draws
            dataset_size: Number of recent draws to analyze

        Returns:
            PredictionResult
        """
        if not historical_data:
            return self.generate_random_fallback()

        data_to_analyze = historical_data[:min(dataset_size, len(historical_data))]
        red_balls_list = extract_red_balls(data_to_analyze)
        blue_balls_list = extract_blue_balls(data_to_analyze)

        if not red_balls_list:
            return self.generate_random_fallback()

        # Frequency-based selection
        predicted_red = self._frequency_based_selection(red_balls_list)
        predicted_blue = self._predict_blue_ball(blue_balls_list) if blue_balls_list else random.randint(1, 16)

        return PredictionResult(
            red_balls=predicted_red,
            blue_ball=predicted_blue,
            confidence=55.0,
            metadata={'fallback': True, 'reason': 'sklearn_unavailable'}
        )


def random_forest_predict(historical_data: List[Dict[str, Any]], dataset_size: int) -> Dict[str, Any]:
    """
    Legacy function wrapper for Random Forest prediction.

    Args:
        historical_data: List of historical lottery draws
        dataset_size: Number of recent draws to analyze

    Returns:
        Dictionary containing prediction results
    """
    predictor = RandomForestPredictor()
    result = predictor.predict(historical_data, dataset_size)
    return result.to_dict()
