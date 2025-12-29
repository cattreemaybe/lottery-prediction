"""Base classes and interfaces for prediction algorithms."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import random


@dataclass
class PredictionResult:
    """Standard prediction result structure."""
    red_balls: List[int]
    blue_ball: int
    confidence: float
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        result = {
            'red_balls': self.red_balls,
            'blue_ball': self.blue_ball,
            'confidence': round(self.confidence, 1),
        }
        if self.metadata:
            result['metadata'] = self.metadata
        return result


class LotteryPredictor(ABC):
    """Abstract base class for lottery prediction algorithms."""

    def __init__(self, name: str, max_confidence: float = 80.0):
        """
        Initialize predictor.

        Args:
            name: Algorithm name
            max_confidence: Maximum confidence score for this algorithm
        """
        self.name = name
        self.max_confidence = max_confidence

    @abstractmethod
    def predict(
        self,
        historical_data: List[Dict[str, Any]],
        dataset_size: int
    ) -> PredictionResult:
        """
        Generate prediction based on historical data.

        Args:
            historical_data: List of historical lottery draws
            dataset_size: Number of recent draws to analyze

        Returns:
            PredictionResult with predicted numbers and confidence
        """
        pass

    def validate_prediction(self, result: PredictionResult) -> PredictionResult:
        """
        Validate and normalize prediction result.

        Args:
            result: Prediction result to validate

        Returns:
            Validated and normalized result
        """
        # Ensure red balls are sorted and unique
        red_balls = sorted(set(result.red_balls))

        # If not exactly 6 red balls, fill or truncate
        if len(red_balls) < 6:
            all_red_numbers = set(range(1, 34))
            used_numbers = set(red_balls)
            available_numbers = list(all_red_numbers - used_numbers)
            random.shuffle(available_numbers)
            red_balls.extend(available_numbers[:6 - len(red_balls)])
            red_balls.sort()
        elif len(red_balls) > 6:
            red_balls = red_balls[:6]

        # Ensure blue ball is in valid range
        blue_ball = result.blue_ball
        if blue_ball < 1 or blue_ball > 16:
            blue_ball = random.randint(1, 16)

        # Cap confidence at max_confidence
        confidence = min(result.confidence, self.max_confidence)

        return PredictionResult(
            red_balls=red_balls,
            blue_ball=blue_ball,
            confidence=confidence,
            metadata=result.metadata
        )

    def generate_random_fallback(self) -> PredictionResult:
        """
        Generate random prediction as fallback.

        Returns:
            Random prediction with low confidence
        """
        red_balls = sorted(random.sample(range(1, 34), 6))
        blue_ball = random.randint(1, 16)

        return PredictionResult(
            red_balls=red_balls,
            blue_ball=blue_ball,
            confidence=30.0,
            metadata={'fallback': True}
        )
