# services

📁 **路径**: `ml-service/app/services`

## 📋 文件列表

### __init__.py

**位置**: `ml-service/app/services/__init__.py`

**代码行数**: 1

---

### data_fetcher.py

**位置**: `ml-service/app/services/data_fetcher.py`

**导出**:
- `DataFetchError`
- `fetch_historical_data`
- `fetch_historical_data_sync`

**依赖**:
- `..core.config`

**代码行数**: 97

---

### predictor.py

**位置**: `ml-service/app/services/predictor.py`

**导出**:
- `run_prediction`
- `_random_fallback`

**依赖**:
- `..algorithms`
- `.data_fetcher`

**代码行数**: 112

---

