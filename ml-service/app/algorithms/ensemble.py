"""Ensemble prediction algorithm with probability engine.

The ensemble now combines statistical signals derived from historical
draws with the outputs of individual algorithms (frequency / trend /
random forest / LSTM).  Instead of simply voting, it builds a
probability table for every number based on frequency, recency,
momentum and overdue signals, then blends that table with the
component predictions to produce balanced results.
"""

from collections import Counter
from typing import Dict, List, Any, Tuple
import random
import numpy as np

from .base import LotteryPredictor, PredictionResult
from .frequency import FrequencyPredictor
from .trend import TrendPredictor
from .random_forest import RandomForestPredictor
from .lstm import LSTMPredictor
from .utils import extract_red_balls, extract_blue_balls, calculate_frequency


class EnsemblePredictor(LotteryPredictor):
    """Ensemble prediction combining multiple algorithms + probability model."""

    def __init__(self, weights: Dict[str, float] | None = None):
        super().__init__(name="ensemble", max_confidence=80.0)
        self.predictors = {
            'frequency': FrequencyPredictor(),
            'trend': TrendPredictor(),
            'random_forest': RandomForestPredictor(),
            'lstm': LSTMPredictor(),
        }
        self.weights = weights or {
            'frequency': 0.20,
            'trend': 0.25,
            'random_forest': 0.30,
            'lstm': 0.25,
        }
        total_weight = sum(self.weights.values()) or 1.0
        self.weights = {k: v / total_weight for k, v in self.weights.items()}
        self.recent_window = 60

    def predict(
        self,
        historical_data: List[Dict[str, Any]],
        dataset_size: int
    ) -> PredictionResult:
        if not historical_data:
            return self.generate_random_fallback()

        data_to_analyze = historical_data[:dataset_size]
        red_history = extract_red_balls(data_to_analyze)
        blue_history = extract_blue_balls(data_to_analyze)

        if len(red_history) < 20:
            return self.generate_random_fallback()

        base_red_scores = self._build_red_probability(red_history, data_to_analyze)
        component_predictions = self._run_component_predictors(data_to_analyze, dataset_size)
        vote_scores = self._build_vote_scores(component_predictions)
        combined_red_scores = self._combine_scores(base_red_scores, vote_scores, base_weight=0.65)
        predicted_red = self._select_numbers_with_distribution(combined_red_scores)

        predicted_blue, blue_candidates = self._score_blue_candidates(
            blue_history,
            component_predictions,
            data_to_analyze,
        )

        confidence = self._calculate_ensemble_confidence(
            component_predictions,
            combined_red_scores,
            predicted_red,
            len(red_history),
        )

        metadata = {
            'component_predictions': {
                name: {
                    'red_balls': result.red_balls,
                    'blue_ball': result.blue_ball,
                    'confidence': result.confidence,
                }
                for name, result in component_predictions.items()
            },
            'weights': self.weights,
            'algorithms_used': list(component_predictions.keys()),
            'top_candidates': self._describe_top_candidates(combined_red_scores, limit=10),
            'blue_candidates': blue_candidates,
            'dataset_coverage': len(red_history),
        }

        result = PredictionResult(
            red_balls=predicted_red,
            blue_ball=predicted_blue,
            confidence=confidence,
            metadata=metadata,
        )

        return self.validate_prediction(result)

    def _run_component_predictors(
        self,
        historical_data: List[Dict[str, Any]],
        dataset_size: int,
    ) -> Dict[str, PredictionResult]:
        predictions: Dict[str, PredictionResult] = {}
        for name, predictor in self.predictors.items():
            try:
                predictions[name] = predictor.predict(historical_data, dataset_size)
            except Exception as error:  # pragma: no cover - defensive
                print(f"Warning: {name} predictor failed: {error}")
        return predictions

    def _build_vote_scores(
        self,
        predictions: Dict[str, PredictionResult],
    ) -> Dict[int, float]:
        if not predictions:
            return {num: 0.0 for num in range(1, 34)}

        scores = {num: 0.0 for num in range(1, 34)}
        for name, result in predictions.items():
            weight = self.weights.get(name, 0.0)
            confidence_factor = result.confidence / 100.0
            for ball in result.red_balls:
                if 1 <= ball <= 33:
                    scores[ball] += weight * confidence_factor
        return self._normalize_scores(scores)

    def _build_red_probability(
        self,
        red_history: List[List[int]],
        historical_data: List[Dict[str, Any]],
    ) -> Dict[int, float]:
        flattened = [ball for draw in red_history for ball in draw]
        freq = calculate_frequency(flattened, range_max=33)
        freq_norm = self._normalize_scores(freq)

        recent_window = min(self.recent_window, len(red_history))
        recent_flat = [ball for draw in red_history[:recent_window] for ball in draw]
        recent_norm = self._normalize_scores(calculate_frequency(recent_flat, range_max=33))

        previous_flat = [
            ball for draw in red_history[recent_window:recent_window * 2] for ball in draw
        ]
        previous_norm = self._normalize_scores(
            calculate_frequency(previous_flat, range_max=33)
        ) if previous_flat else {num: 0.0 for num in range(1, 34)}

        momentum = {
            num: max(recent_norm.get(num, 0.0) - previous_norm.get(num, 0.0), 0.0)
            for num in range(1, 34)
        }

        gap_scores = self._current_gap_scores(historical_data, range_max=33, is_red=True)

        combined = {}
        for num in range(1, 34):
            combined[num] = (
                0.35 * freq_norm.get(num, 0.0)
                + 0.25 * recent_norm.get(num, 0.0)
                + 0.20 * gap_scores.get(num, 0.0)
                + 0.20 * momentum.get(num, 0.0)
            )

        return self._normalize_scores(combined)

    def _score_blue_candidates(
        self,
        blue_history: List[int],
        predictions: Dict[str, PredictionResult],
        historical_data: List[Dict[str, Any]],
    ) -> Tuple[int, List[Dict[str, float]]]:
        if not blue_history:
            random_blue = random.randint(1, 16)
            return random_blue, [{'number': random_blue, 'score': 0.5}]

        base_scores = self._build_blue_probability(blue_history, historical_data)
        vote_scores = self._build_blue_vote_scores(predictions)
        combined = self._combine_scores(base_scores, vote_scores, base_weight=0.7)
        best = max(combined, key=combined.get)
        return best, self._describe_top_candidates(combined, limit=5)

    def _build_blue_probability(
        self,
        blue_history: List[int],
        historical_data: List[Dict[str, Any]],
    ) -> Dict[int, float]:
        freq = calculate_frequency(blue_history, range_max=16)
        freq_norm = self._normalize_scores(freq)

        recent_window = min(30, len(blue_history))
        recent = blue_history[:recent_window]
        previous = blue_history[recent_window:recent_window * 2]

        recent_norm = self._normalize_scores(calculate_frequency(recent, range_max=16))
        previous_norm = self._normalize_scores(
            calculate_frequency(previous, range_max=16)
        ) if previous else {num: 0.0 for num in range(1, 17)}

        momentum = {
            num: max(recent_norm.get(num, 0.0) - previous_norm.get(num, 0.0), 0.0)
            for num in range(1, 17)
        }

        gap_scores = self._current_gap_scores(historical_data, range_max=16, is_red=False)

        combined = {}
        for num in range(1, 17):
            combined[num] = (
                0.4 * freq_norm.get(num, 0.0)
                + 0.3 * recent_norm.get(num, 0.0)
                + 0.2 * gap_scores.get(num, 0.0)
                + 0.1 * momentum.get(num, 0.0)
            )

        return self._normalize_scores(combined)

    def _build_blue_vote_scores(
        self,
        predictions: Dict[str, PredictionResult],
    ) -> Dict[int, float]:
        if not predictions:
            return {num: 0.0 for num in range(1, 17)}

        scores = {num: 0.0 for num in range(1, 17)}
        for name, result in predictions.items():
            weight = self.weights.get(name, 0.0)
            confidence_factor = result.confidence / 100.0
            ball = result.blue_ball
            if 1 <= ball <= 16:
                scores[ball] += weight * confidence_factor
        return self._normalize_scores(scores)

    def _combine_scores(
        self,
        base_scores: Dict[int, float],
        vote_scores: Dict[int, float],
        base_weight: float = 0.65,
    ) -> Dict[int, float]:
        combined = {}
        for num in base_scores:
            combined[num] = base_weight * base_scores.get(num, 0.0) + (1 - base_weight) * vote_scores.get(num, 0.0)
        return self._normalize_scores(combined)

    def _select_numbers_with_distribution(
        self,
        scores: Dict[int, float],
    ) -> List[int]:
        sorted_candidates = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        targets = {'low': 2, 'mid': 2, 'high': 2}
        counts = {'low': 0, 'mid': 0, 'high': 0}
        selected: List[int] = []

        for number, _ in sorted_candidates:
            group = self._group_for_number(number)
            if counts[group] < targets[group]:
                selected.append(number)
                counts[group] += 1
            if len(selected) == 6:
                break

        if len(selected) < 6:
            for number, _ in sorted_candidates:
                if number not in selected:
                    selected.append(number)
                if len(selected) == 6:
                    break

        return sorted(selected[:6])

    @staticmethod
    def _group_for_number(number: int) -> str:
        if number <= 11:
            return 'low'
        if number <= 22:
            return 'mid'
        return 'high'

    def _current_gap_scores(
        self,
        historical_data: List[Dict[str, Any]],
        range_max: int,
        is_red: bool,
    ) -> Dict[int, float]:
        if not historical_data:
            return {num: 0.0 for num in range(1, range_max + 1)}

        default_gap = len(historical_data)
        gap_map = {num: default_gap for num in range(1, range_max + 1)}

        for idx, draw in enumerate(historical_data):
            if is_red:
                values = draw.get('red_balls', draw.get('redBalls', [])) or []
            else:
                blue_value = draw.get('blue_ball', draw.get('blueBall'))
                values = [blue_value] if blue_value else []

            for number in values:
                if 1 <= number <= range_max and gap_map[number] == default_gap:
                    gap_map[number] = idx

        normalized = {
            num: (gap / default_gap) if default_gap else 0.0
            for num, gap in gap_map.items()
        }
        return normalized

    def _normalize_scores(self, values: Dict[int, float]) -> Dict[int, float]:
        if not values:
            return {}

        numeric_values = [float(value) for value in values.values()]
        max_value = max(numeric_values)
        min_value = min(numeric_values)

        if max_value == min_value:
            return {key: 1.0 / len(values) for key in values}

        return {
            key: (float(value) - min_value) / (max_value - min_value)
            for key, value in values.items()
        }

    def _calculate_ensemble_confidence(
        self,
        predictions: Dict[str, PredictionResult],
        combined_scores: Dict[int, float],
        selected_numbers: List[int],
        sample_size: int,
    ) -> float:
        weighted_confidence = 0.0
        for name, result in predictions.items():
            weighted_confidence += result.confidence * self.weights.get(name, 0.0)

        base_avg = 0.0
        if selected_numbers:
            base_avg = float(np.mean([combined_scores.get(num, 0.0) for num in selected_numbers]))

        data_factor = min(sample_size / 400, 1.0)
        agreement_bonus = self._agreement_bonus(predictions, selected_numbers)

        confidence = weighted_confidence + base_avg * 30.0 + data_factor * 8.0 + agreement_bonus
        return min(max(confidence, 52.0), self.max_confidence)

    def _agreement_bonus(
        self,
        predictions: Dict[str, PredictionResult],
        selected_numbers: List[int],
    ) -> float:
        if not predictions or not selected_numbers:
            return 0.0

        counts: Counter[int] = Counter()
        for result in predictions.values():
            counts.update([ball for ball in result.red_balls if ball in selected_numbers])

        duplicates = sum(1 for count in counts.values() if count >= 2)
        return min(duplicates * 1.5, 9.0)

    @staticmethod
    def _describe_top_candidates(
        scores: Dict[int, float],
        limit: int = 10,
    ) -> List[Dict[str, float]]:
        ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:limit]
        return [{'number': num, 'score': round(score, 4)} for num, score in ordered]

    def update_weights(self, performance_metrics: Dict[str, float]):
        if not performance_metrics:
            return
        total = sum(performance_metrics.values()) or 1.0
        self.weights = {
            name: score / total
            for name, score in performance_metrics.items()
        }


def ensemble_predict(
    historical_data: List[Dict[str, Any]],
    dataset_size: int,
    weights: Dict[str, float] | None = None
) -> Dict[str, Any]:
    predictor = EnsemblePredictor(weights=weights)
    result = predictor.predict(historical_data, dataset_size)
    return result.to_dict()
