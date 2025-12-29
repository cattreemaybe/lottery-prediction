"""Utility functions for lottery prediction algorithms."""

from typing import List, Dict, Any, Tuple
from collections import Counter
import numpy as np


def extract_red_balls(historical_data: List[Dict[str, Any]]) -> List[List[int]]:
    """
    Extract red balls from historical data.

    Args:
        historical_data: List of historical draws

    Returns:
        List of red ball arrays
    """
    red_balls_list = []
    for draw in historical_data:
        red_balls = draw.get('red_balls', draw.get('redBalls', []))
        if red_balls and len(red_balls) == 6:
            red_balls_list.append(red_balls)
    return red_balls_list


def extract_blue_balls(historical_data: List[Dict[str, Any]]) -> List[int]:
    """
    Extract blue balls from historical data.

    Args:
        historical_data: List of historical draws

    Returns:
        List of blue ball numbers
    """
    blue_balls = []
    for draw in historical_data:
        blue_ball = draw.get('blue_ball', draw.get('blueBall'))
        if blue_ball and 1 <= blue_ball <= 16:
            blue_balls.append(blue_ball)
    return blue_balls


def calculate_frequency(numbers: List[int], range_max: int = 33) -> Dict[int, int]:
    """
    Calculate frequency of each number.

    Args:
        numbers: List of numbers to analyze
        range_max: Maximum number in the range

    Returns:
        Dictionary mapping number to frequency count
    """
    counter = Counter(numbers)
    # Ensure all numbers in range are represented
    return {num: counter.get(num, 0) for num in range(1, range_max + 1)}


def calculate_frequency_confidence(
    selected_numbers: List[int],
    frequency_dict: Dict[int, int]
) -> float:
    """
    Calculate confidence based on frequency distribution.

    Args:
        selected_numbers: Numbers that were selected
        frequency_dict: Frequency count for all numbers

    Returns:
        Confidence score (0-100)
    """
    total_occurrences = sum(frequency_dict.values())
    if total_occurrences == 0:
        return 50.0

    selected_occurrences = sum(frequency_dict.get(num, 0) for num in selected_numbers)
    concentration = (selected_occurrences / total_occurrences) * 100

    # Normalize to 50-75 range
    confidence = 50 + (concentration * 0.25)
    return min(confidence, 75.0)


def create_feature_matrix(
    red_balls_history: List[List[int]],
    lookback: int = 5
) -> Tuple[np.ndarray, List[List[int]]]:
    """
    Create feature matrix for machine learning models.

    Args:
        red_balls_history: Historical red ball draws
        lookback: Number of past draws to use as features

    Returns:
        Tuple of (feature_matrix, target_labels)
    """
    if len(red_balls_history) < lookback + 1:
        return np.array([]), []

    X = []
    y = []

    for i in range(len(red_balls_history) - lookback):
        # Features: flatten last `lookback` draws
        features = []
        for j in range(lookback):
            # One-hot encode each draw (33 dimensions for red balls)
            one_hot = [0] * 33
            for ball in red_balls_history[i + j]:
                if 1 <= ball <= 33:
                    one_hot[ball - 1] = 1
            features.extend(one_hot)

        X.append(features)
        y.append(red_balls_history[i + lookback])

    return np.array(X), y


def calculate_hot_cold_numbers(
    frequency_dict: Dict[int, int],
    hot_threshold: float = 0.7,
    cold_threshold: float = 0.3
) -> Tuple[List[int], List[int], List[int]]:
    """
    Categorize numbers into hot, cold, and neutral.

    Args:
        frequency_dict: Frequency count for each number
        hot_threshold: Percentile threshold for hot numbers
        cold_threshold: Percentile threshold for cold numbers

    Returns:
        Tuple of (hot_numbers, cold_numbers, neutral_numbers)
    """
    if not frequency_dict:
        return [], [], list(range(1, 34))

    frequencies = list(frequency_dict.values())
    hot_cutoff = np.percentile(frequencies, hot_threshold * 100)
    cold_cutoff = np.percentile(frequencies, cold_threshold * 100)

    hot = []
    cold = []
    neutral = []

    for num, freq in frequency_dict.items():
        if freq >= hot_cutoff:
            hot.append(num)
        elif freq <= cold_cutoff:
            cold.append(num)
        else:
            neutral.append(num)

    return hot, cold, neutral


def moving_average(data: List[float], window: int = 3) -> List[float]:
    """
    Calculate moving average of a time series.

    Args:
        data: Time series data
        window: Window size for moving average

    Returns:
        Moving average values
    """
    if len(data) < window:
        return data

    result = []
    for i in range(len(data)):
        if i < window - 1:
            result.append(np.mean(data[:i + 1]))
        else:
            result.append(np.mean(data[i - window + 1:i + 1]))

    return result


def calculate_number_gaps(
    historical_data: List[Dict[str, Any]],
    number: int,
    is_red: bool = True
) -> List[int]:
    """
    Calculate gaps (periods of absence) for a specific number.

    Args:
        historical_data: List of historical draws
        number: Number to analyze
        is_red: True for red ball, False for blue ball

    Returns:
        List of gap lengths
    """
    gaps = []
    current_gap = 0

    for draw in historical_data:
        if is_red:
            balls = draw.get('red_balls', draw.get('redBalls', []))
            appears = number in balls
        else:
            ball = draw.get('blue_ball', draw.get('blueBall'))
            appears = number == ball

        if appears:
            gaps.append(current_gap)
            current_gap = 0
        else:
            current_gap += 1

    return gaps
