# routes

📁 **路径**: `backend/src/routes`

## 📋 文件列表

### health.routes.ts

**位置**: `backend/src/routes/health.routes.ts`

**导出**:
- `healthRouter`

**代码行数**: 17

---

### index.ts

**位置**: `backend/src/routes/index.ts`

**导出**:
- `apiRouter`

**依赖**:
- `../config/env`
- `./health.routes`
- `./predict.routes`
- `./lottery.routes`

**代码行数**: 26

---

### lottery.routes.ts

**位置**: `backend/src/routes/lottery.routes.ts`

**导出**:
- `lotteryRouter`

**依赖**:
- `../lib/prisma`
- `../lib/redis`
- `../services/data-import`
- `../services/lottery-stats`
- `../services/lottery-trends`

**代码行数**: 376

---

### predict.routes.ts

**位置**: `backend/src/routes/predict.routes.ts`

**导出**:
- `predictRouter`

**依赖**:
- `../config/env`
- `../services/ml-service`
- `../services/prediction-history`
- `../services/algorithm-performance`
- `../services/prediction-evaluator`

**代码行数**: 143

---

