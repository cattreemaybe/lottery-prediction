# services

📁 **路径**: `backend/src/services`

## 📋 文件列表

### algorithm-performance.ts

**位置**: `backend/src/services/algorithm-performance.ts`

**导出**:
- `recordAlgorithmPerformance`
- `fetchAlgorithmPerformance`

**依赖**:
- `../lib/prisma`

**代码行数**: 63

---

### data-import.ts

**位置**: `backend/src/services/data-import.ts`

**导出**:
- `parseExcelFile`
- `parseCsvFile`
- `importLotteryDraws`
- `generateExcelTemplate`
- `generateCsvTemplate`

**依赖**:
- `../lib/prisma`
- `../lib/redis`

**代码行数**: 388

---

### lottery-stats.ts

**位置**: `backend/src/services/lottery-stats.ts`

**导出**:
- `getFrequencyStats`

**依赖**:
- `../lib/prisma`
- `../lib/redis`

**代码行数**: 124

---

### lottery-trends.ts

**位置**: `backend/src/services/lottery-trends.ts`

**导出**:
- `fetchTrendData`

**依赖**:
- `../lib/prisma`
- `../lib/redis`

**代码行数**: 35

---

### ml-service.ts

**位置**: `backend/src/services/ml-service.ts`

**导出**:
- `fetchAlgorithms`
- `createPrediction`
- `fetchPredictionHistory`

**依赖**:
- `../config/env`

**代码行数**: 99

---

### prediction-evaluator.ts

**位置**: `backend/src/services/prediction-evaluator.ts`

**导出**:
- `evaluatePredictionPerformance`

**依赖**:
- `../lib/prisma`

**代码行数**: 239

---

### prediction-history.ts

**位置**: `backend/src/services/prediction-history.ts`

**导出**:
- `savePredictionResult`
- `getPredictionHistory`

**依赖**:
- `../lib/prisma`
- `../lib/redis`
- `./algorithm-performance`

**代码行数**: 68

---

