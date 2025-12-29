# algorithms

📁 **路径**: `ml-service/app/algorithms`

## 📋 文件列表

### __init__.py

**位置**: `ml-service/app/algorithms/__init__.py`

**依赖**:
- `.base`
- `.frequency`
- `.trend`
- `.random_forest`
- `.lstm`
- `.ensemble`

**代码行数**: 27

---

### base.py

**位置**: `ml-service/app/algorithms/base.py`

**导出**:
- `PredictionResult`
- `LotteryPredictor`

**代码行数**: 116

---

### ensemble.py

**位置**: `ml-service/app/algorithms/ensemble.py`

**导出**:
- `EnsemblePredictor`
- `ensemble_predict`

**依赖**:
- `.base`
- `.frequency`
- `.trend`
- `.random_forest`
- `.lstm`
- `.utils`

**代码行数**: 390

---

### frequency.py

**位置**: `ml-service/app/algorithms/frequency.py`

**导出**:
- `FrequencyPredictor`
- `frequency_analysis`

**依赖**:
- `.base`
- `.utils`

**代码行数**: 109

---

### lstm.py

**位置**: `ml-service/app/algorithms/lstm.py`

**导出**:
- `LSTMPredictor`
- `lstm_predict`

**依赖**:
- `.base`
- `.utils`

**代码行数**: 223

---

### random_forest.py

**位置**: `ml-service/app/algorithms/random_forest.py`

**导出**:
- `RandomForestPredictor`
- `random_forest_predict`

**依赖**:
- `.base`
- `.utils`

**代码行数**: 356

---

### trend.py

**位置**: `ml-service/app/algorithms/trend.py`

**导出**:
- `TrendPredictor`
- `trend_analysis`

**依赖**:
- `.base`
- `.utils`

**代码行数**: 213

---

### utils.py

**位置**: `ml-service/app/algorithms/utils.py`

**导出**:
- `extract_red_balls`
- `extract_blue_balls`
- `calculate_frequency`
- `calculate_frequency_confidence`
- `create_feature_matrix`
- `calculate_hot_cold_numbers`
- `moving_average`
- `calculate_number_gaps`

**代码行数**: 219

---

