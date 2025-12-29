#!/usr/bin/env python3
"""Test script for lottery prediction algorithms.

This script tests all implemented algorithms with sample data
to verify they work correctly.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.algorithms import (
    FrequencyPredictor,
    TrendPredictor,
    RandomForestPredictor,
    LSTMPredictor,
    EnsemblePredictor,
)


# Sample historical data
SAMPLE_DATA = [
    {'period': '2024100', 'red_balls': [3, 12, 18, 23, 29, 31], 'blue_ball': 8},
    {'period': '2024099', 'red_balls': [5, 11, 16, 22, 27, 32], 'blue_ball': 12},
    {'period': '2024098', 'red_balls': [1, 8, 15, 21, 28, 33], 'blue_ball': 6},
    {'period': '2024097', 'red_balls': [2, 10, 17, 24, 26, 30], 'blue_ball': 14},
    {'period': '2024096', 'red_balls': [4, 9, 14, 20, 25, 31], 'blue_ball': 3},
    {'period': '2024095', 'red_balls': [6, 11, 13, 19, 27, 32], 'blue_ball': 9},
    {'period': '2024094', 'red_balls': [3, 8, 16, 22, 28, 33], 'blue_ball': 5},
    {'period': '2024093', 'red_balls': [1, 10, 15, 23, 29, 31], 'blue_ball': 11},
    {'period': '2024092', 'red_balls': [5, 12, 18, 21, 26, 30], 'blue_ball': 7},
    {'period': '2024091', 'red_balls': [2, 9, 17, 24, 27, 32], 'blue_ball': 13},
    {'period': '2024090', 'red_balls': [4, 11, 14, 20, 28, 33], 'blue_ball': 2},
    {'period': '2024089', 'red_balls': [6, 8, 13, 22, 25, 31], 'blue_ball': 10},
    {'period': '2024088', 'red_balls': [3, 10, 16, 19, 29, 30], 'blue_ball': 4},
    {'period': '2024087', 'red_balls': [1, 12, 15, 23, 26, 32], 'blue_ball': 8},
    {'period': '2024086', 'red_balls': [5, 9, 18, 21, 27, 33], 'blue_ball': 15},
    {'period': '2024085', 'red_balls': [2, 11, 17, 24, 28, 31], 'blue_ball': 6},
    {'period': '2024084', 'red_balls': [4, 8, 14, 20, 25, 30], 'blue_ball': 12},
    {'period': '2024083', 'red_balls': [6, 10, 13, 22, 29, 32], 'blue_ball': 9},
    {'period': '2024082', 'red_balls': [3, 12, 16, 19, 26, 33], 'blue_ball': 1},
    {'period': '2024081', 'red_balls': [1, 9, 15, 23, 27, 31], 'blue_ball': 14},
    {'period': '2024080', 'red_balls': [5, 11, 18, 21, 28, 30], 'blue_ball': 7},
    {'period': '2024079', 'red_balls': [2, 8, 17, 24, 25, 32], 'blue_ball': 11},
    {'period': '2024078', 'red_balls': [4, 10, 14, 20, 29, 33], 'blue_ball': 3},
    {'period': '2024077', 'red_balls': [6, 12, 13, 22, 26, 31], 'blue_ball': 16},
    {'period': '2024076', 'red_balls': [3, 9, 16, 19, 27, 30], 'blue_ball': 5},
    {'period': '2024075', 'red_balls': [1, 11, 15, 23, 28, 32], 'blue_ball': 10},
    {'period': '2024074', 'red_balls': [5, 8, 18, 21, 25, 33], 'blue_ball': 2},
    {'period': '2024073', 'red_balls': [2, 10, 17, 24, 29, 31], 'blue_ball': 13},
    {'period': '2024072', 'red_balls': [4, 12, 14, 20, 26, 30], 'blue_ball': 8},
    {'period': '2024071', 'red_balls': [6, 9, 13, 22, 27, 32], 'blue_ball': 15},
    {'period': '2024070', 'red_balls': [3, 11, 16, 19, 28, 33], 'blue_ball': 4},
    {'period': '2024069', 'red_balls': [1, 8, 15, 23, 25, 31], 'blue_ball': 9},
    {'period': '2024068', 'red_balls': [5, 10, 18, 21, 29, 30], 'blue_ball': 6},
    {'period': '2024067', 'red_balls': [2, 12, 17, 24, 26, 32], 'blue_ball': 12},
    {'period': '2024066', 'red_balls': [4, 9, 14, 20, 27, 33], 'blue_ball': 1},
    {'period': '2024065', 'red_balls': [6, 11, 13, 22, 28, 31], 'blue_ball': 14},
    {'period': '2024064', 'red_balls': [3, 8, 16, 19, 25, 30], 'blue_ball': 7},
    {'period': '2024063', 'red_balls': [1, 10, 15, 23, 29, 32], 'blue_ball': 11},
    {'period': '2024062', 'red_balls': [5, 12, 18, 21, 26, 33], 'blue_ball': 3},
    {'period': '2024061', 'red_balls': [2, 9, 17, 24, 27, 31], 'blue_ball': 16},
    {'period': '2024060', 'red_balls': [4, 11, 14, 20, 28, 30], 'blue_ball': 5},
    {'period': '2024059', 'red_balls': [6, 8, 13, 22, 25, 32], 'blue_ball': 10},
    {'period': '2024058', 'red_balls': [3, 10, 16, 19, 29, 33], 'blue_ball': 2},
    {'period': '2024057', 'red_balls': [1, 12, 15, 23, 26, 31], 'blue_ball': 13},
    {'period': '2024056', 'red_balls': [5, 9, 18, 21, 27, 30], 'blue_ball': 8},
    {'period': '2024055', 'red_balls': [2, 11, 17, 24, 28, 32], 'blue_ball': 15},
    {'period': '2024054', 'red_balls': [4, 8, 14, 20, 25, 33], 'blue_ball': 4},
    {'period': '2024053', 'red_balls': [6, 10, 13, 22, 29, 31], 'blue_ball': 9},
    {'period': '2024052', 'red_balls': [3, 12, 16, 19, 26, 30], 'blue_ball': 6},
    {'period': '2024051', 'red_balls': [1, 9, 15, 23, 27, 32], 'blue_ball': 12},
]


def test_predictor(predictor, name: str):
    """Test a single predictor."""
    print(f"\n{'=' * 60}")
    print(f"Testing {name}")
    print('=' * 60)

    try:
        result = predictor.predict(SAMPLE_DATA, dataset_size=50)

        print(f"✅ Algorithm executed successfully")
        print(f"   Red balls: {result.red_balls}")
        print(f"   Blue ball: {result.blue_ball}")
        print(f"   Confidence: {result.confidence:.1f}%")

        # Validate result
        assert len(result.red_balls) == 6, "Should predict exactly 6 red balls"
        assert len(set(result.red_balls)) == 6, "Red balls should be unique"
        assert all(1 <= b <= 33 for b in result.red_balls), "Red balls should be in range 1-33"
        assert result.red_balls == sorted(result.red_balls), "Red balls should be sorted"
        assert 1 <= result.blue_ball <= 16, "Blue ball should be in range 1-16"
        assert 0 <= result.confidence <= 100, "Confidence should be 0-100"

        print(f"✅ All validations passed")

        if result.metadata:
            print(f"   Metadata: {list(result.metadata.keys())}")

        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all algorithm tests."""
    print("\n🧪 Testing Lottery Prediction Algorithms")
    print("=" * 60)
    print(f"Sample data: {len(SAMPLE_DATA)} historical draws")

    predictors = [
        (FrequencyPredictor(), "Frequency Predictor"),
        (TrendPredictor(), "Trend Predictor (ARIMA)"),
        (RandomForestPredictor(), "Random Forest Predictor"),
        (LSTMPredictor(), "LSTM Predictor"),
        (EnsemblePredictor(), "Ensemble Predictor"),
    ]

    results = []
    for predictor, name in predictors:
        success = test_predictor(predictor, name)
        results.append((name, success))

    # Summary
    print(f"\n{'=' * 60}")
    print("📊 Test Summary")
    print('=' * 60)

    total = len(results)
    passed = sum(1 for _, success in results if success)

    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == '__main__':
    sys.exit(main())
