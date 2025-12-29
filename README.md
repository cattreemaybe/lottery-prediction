# 双色球预测分析平台 Monorepo

基于 React + Express + FastAPI 的前后端分离项目骨架，按照《需求》《设计》《任务》规范实现初始目录与脚手架，涵盖前端展示、后端 API 网关以及 Python 算法微服务。

## 仓库结构

```
frontend/      # React 18 + TypeScript + Vite + Tailwind UI（含路由与页面占位）
backend/       # Express.js + TypeScript API 服务（含中间件与常量接口）
ml-service/    # FastAPI 机器学习服务，占位预测端点
```

## 快速开始

由于当前环境无法联网安装依赖，请在本地执行以下步骤：

1. **初始化数据库与 Node 依赖**
   ```bash
   # 如果使用本地 PostgreSQL，可直接执行： 
   psql -f setup-database.sql

   npm install --workspaces
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```
2. **安装 Python 依赖**
   ```bash
   cd ml-service
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. **配置环境变量**
   ```bash
   cp backend/.env.example backend/.env
   cp ml-service/.env.example ml-service/.env
   ```
   - `backend/.env`：若 Python 服务监听地址有变，更新 `ML_SERVICE_BASE_URL`；可按需调整 `ML_SERVICE_TIMEOUT_MS` 等超时设置。
   - `frontend/.env.local`（自行创建）：
     ```bash
     VITE_API_BASE_URL=http://127.0.0.1:4000/api
     ```
4. **运行服务**（推荐先启动算法服务，再启动后端与前端）
   ```bash
   # 算法服务
   cd ml-service
   source .venv/bin/activate
   uvicorn app.main:app --reload --port 8001

   # 后端 API
   cd ../backend
   npm run dev

   # 前端站点
   cd ../frontend
   npm run dev
   ```
5. **一键脚本（可选）**：使用 `scripts/start-all.sh` / `scripts/stop-all.sh` 自动拉起 Docker 中的 PostgreSQL、Redis 并通过 `nohup` 启动三端，日志保存在 `.logs/`。

> ⚠️ 生产部署需要配置 PostgreSQL、Redis、TimescaleDB 扩展以及 Docker/Nginx，如设计文档所示，这部分尚未实现。

## 已实现功能概览

- **前端**：完成导航布局、核心页面骨架（首页概览、历史数据、预测、统计分析、算法管理），内置风险提示与常量提示；已配置 React Router、React Query、Tailwind、ECharts 占位、Devtools 等基础设施。
- **后端**：Express 应用具备 Helmet/CORS/Rate Limit、安全日志、统一错误处理、Zod 环境变量校验和 `/api/constants`、`/api/lottery/*`、`/api/predict/*` 等接口；Prisma Schema、数据库连接、Redis 缓存工具与 Docker Compose 均已落地。
- **数据管理**：提供 Excel/CSV 解析、灵活列名兼容、日期格式纠正、冲突策略（跳过/替换/报错）、导入日志记录；可下载模板、分页查询开奖记录、统计频率与趋势数据并缓存结果。
- **可视化与交互**：统计页包含红蓝球频率、趋势线、热力图等 ECharts 图表；预测页新增“预测历史分析”“预测效果评估”双面板，可按算法筛选近十次预测、查看置信度趋势与平均分，并实时展示开奖命中情况与等级。
- **算法服务联调**：FastAPI 暴露 `/api/v1/algorithms`、`/api/v1/predict`、`/api/v1/predict/history`，提供频率/趋势/随机森林/LSTM/综合预测等多种算法；综合预测器已接入概率引擎（考虑频率、近期动量、缺口、子算法投票），输出结构化元数据，Node 端通过 `ml-service` SDK 带超时控制调用，并记录预测历史与算法表现。
- **脚本与运维基础**：提供 `setup-database.sql` 初始化数据库，`scripts/start-all.sh`/`stop-all.sh` 编排 PostgreSQL、Redis、前后端与算法服务；`docker-compose.yml` 可一键启动全部容器。

## 待办与下一步

1. **真实算法与评估**：接入可复现的频率/趋势/机器学习模型、完善特征工程及模型管理，对接真实历史开奖数据并输出置信度/召回率等指标。
2. **可视化与交互**：实现 ECharts 图表、算法表现对比、预测历史筛选等前端动态组件，并结合 React Query 缓存策略优化体验。
3. **数据来源与自动化**：打通官方开奖源或第三方爬虫、实现定时导入与告警，对导入失败/冲突输出更细粒度运行日志。
4. **可观测性与稳定性**：完善结构化日志、Prometheus 指标、链路追踪、超时/重试/熔断策略以及 Redis/数据库健康监控。
5. **CI/CD 与部署**：补充 GitHub Actions、Docker 镜像优化、Nginx/Gateway 配置及生产环境运行指南。

## 需求常量摘录

- 历史数据最小/推荐/最大展示期数：50 / 200 / 1000
- 红球范围：1-33（6 个不重复）；蓝球范围：1-16
- 文件上传限制：10MB；预测超时：5 秒；API 查询超时：1 秒

请在后续开发中持续对照规格文档，补充数据库、缓存、文件存储、日志、监控、安全策略等完整实现。
