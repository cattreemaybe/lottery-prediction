# 项目索引 (PROJECT_INDEX)

> 📅 生成时间: 2025-12-23T09:38:07.040Z

## 📊 项目概览

- **总文件数**: 57 个
- **总文件夹**: 21 个
- **总代码行数**: 7,217 行

### 按模块统计

| 模块 | 文件数 |
|------|--------|
| Frontend | 16 |
| Backend | 20 |
| ML Service | 21 |

### 按语言统计

| 语言 | 文件数 |
|------|--------|
| TypeScript | 36 |
| JavaScript | 0 |
| Python | 21 |

## 🗂️ 目录结构

### Frontend (`frontend/`)

- [`frontend/src/components/cards`](./frontend/src/components/cards/FOLDER_INDEX.md) (1 文件)
- [`frontend/src/components/charts`](./frontend/src/components/charts/FOLDER_INDEX.md) (1 文件)
- [`frontend/src/components`](./frontend/src/components/FOLDER_INDEX.md) (1 文件)
- [`frontend/src`](./frontend/src/FOLDER_INDEX.md) (2 文件)
- [`frontend/src/lib`](./frontend/src/lib/FOLDER_INDEX.md) (2 文件)
- [`frontend/src/pages`](./frontend/src/pages/FOLDER_INDEX.md) (6 文件)
- [`frontend/src/routes`](./frontend/src/routes/FOLDER_INDEX.md) (1 文件)
- [`frontend/src/shared`](./frontend/src/shared/FOLDER_INDEX.md) (2 文件)

### Backend (`backend/`)

- [`backend/src`](./backend/src/FOLDER_INDEX.md) (2 文件)
- [`backend/src/config`](./backend/src/config/FOLDER_INDEX.md) (1 文件)
- [`backend/src/lib`](./backend/src/lib/FOLDER_INDEX.md) (3 文件)
- [`backend/src/middleware`](./backend/src/middleware/FOLDER_INDEX.md) (1 文件)
- [`backend/src/routes`](./backend/src/routes/FOLDER_INDEX.md) (4 文件)
- [`backend/src/scripts`](./backend/src/scripts/FOLDER_INDEX.md) (2 文件)
- [`backend/src/services`](./backend/src/services/FOLDER_INDEX.md) (7 文件)

### ML Service (`ml-service/`)

- [`ml-service/app`](./ml-service/app/FOLDER_INDEX.md) (3 文件)
- [`ml-service/app/algorithms`](./ml-service/app/algorithms/FOLDER_INDEX.md) (8 文件)
- [`ml-service/app/api`](./ml-service/app/api/FOLDER_INDEX.md) (2 文件)
- [`ml-service/app/api/v1`](./ml-service/app/api/v1/FOLDER_INDEX.md) (3 文件)
- [`ml-service/app/core`](./ml-service/app/core/FOLDER_INDEX.md) (2 文件)
- [`ml-service/app/services`](./ml-service/app/services/FOLDER_INDEX.md) (3 文件)

## 🔑 核心模块

### Frontend 应用入口

**文件**: `frontend/src/main.tsx`

### 前端路由配置

**文件**: `frontend/src/routes/router.tsx`

**导出**: `router`

### API 客户端封装

**文件**: `frontend/src/lib/api.ts`

**导出**: `apiClient`, `fetchConstants`, `fetchAlgorithms`, `runPrediction`, `fetchPredictionHistory`, `fetchAlgorithmPerformance`, `fetchPredictionEvaluation`, `fetchLotteryDraws`, `fetchLatestDraws`, `fetchDrawByPeriod`, `fetchLotteryStats`, `fetchFrequencyStats`, `fetchTrendData`, `importLotteryFile`, `downloadExcelTemplate`, `downloadCsvTemplate`, `deleteLotteryDraw`

### Backend 服务入口

**文件**: `backend/src/server.ts`

### Express 应用配置

**文件**: `backend/src/app.ts`

**导出**: `createApp`

### API 路由聚合

**文件**: `backend/src/routes/index.ts`

**导出**: `apiRouter`

### ML 服务入口

**文件**: `ml-service/app/main.py`

**导出**: `health_check`

### 集成预测算法

**文件**: `ml-service/app/algorithms/ensemble.py`

**导出**: `EnsemblePredictor`, `ensemble_predict`

## 📈 依赖关系图

查看 [DEPENDENCY_GRAPH.md](./DEPENDENCY_GRAPH.md) 了解模块间的依赖关系。

## 🔍 使用说明

1. **浏览文件夹**: 点击上方目录结构中的链接查看各文件夹详情
2. **查看文件头**: 每个源文件顶部都有 Input/Output/Pos 注释
3. **追踪依赖**: 通过文件头的 Input 部分了解依赖关系
4. **更新索引**: 当文件结构变化时,重新运行 `/init-index` 命令

---

*本索引由 project-multilevel-index 自动生成*
