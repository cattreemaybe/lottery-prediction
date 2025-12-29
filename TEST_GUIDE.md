# 数据管理功能测试指南

本文档提供完整的测试步骤,用于验证数据管理功能是否正常工作。

## 前置条件

### 1. 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install

# ML服务依赖
cd ../ml-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置环境变量

**backend/.env**
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://lottery_user:lottery_pass@localhost:5432/lottery_db?schema=public
REDIS_URL=redis://localhost:6379
ML_SERVICE_BASE_URL=http://127.0.0.1:8001/api
```

**frontend/.env.local**
```env
VITE_API_BASE_URL=http://127.0.0.1:4000/api
```

### 3. 启动数据库 (选择一种方式)

**方式A: 使用 Docker Compose (推荐)**
```bash
docker-compose up -d postgres redis
```

**方式B: 本地安装**
- PostgreSQL 16+
- Redis 7+

手动创建数据库:
```sql
CREATE DATABASE lottery_db;
CREATE USER lottery_user WITH PASSWORD 'lottery_pass';
GRANT ALL PRIVILEGES ON DATABASE lottery_db TO lottery_user;
```

### 4. 运行数据库迁移

```bash
cd backend
npx prisma migrate dev --name init
```

如果看到 ✅ 表示迁移成功。

## 测试步骤

### 阶段1: 后端API测试

#### 1.1 启动后端服务

```bash
cd backend
npm run dev
```

应该看到:
```
✅ Database connected successfully
✅ Redis connected successfully
API server listening on http://localhost:4000
```

#### 1.2 测试健康检查

```bash
curl http://localhost:4000/api/health
```

期望响应:
```json
{"status":"ok"}
```

#### 1.3 测试常量配置

```bash
curl http://localhost:4000/api/constants
```

期望响应包含:
```json
{
  "minDatasetSize": 50,
  "recommendedDatasetSize": 200,
  "redBallRange": {"min":1,"max":33,"picks":6},
  "blueBallRange": {"min":1,"max":16,"picks":1}
}
```

#### 1.4 测试统计信息 (初始为空)

```bash
curl http://localhost:4000/api/lottery/stats
```

期望响应:
```json
{
  "success": true,
  "data": {
    "totalDraws": 0,
    "latestDraw": null,
    "oldestDraw": null,
    "dateRange": null
  }
}
```

#### 1.5 下载模板文件

```bash
# Excel模板
curl http://localhost:4000/api/lottery/template/excel --output template.xlsx

# CSV模板
curl http://localhost:4000/api/lottery/template/csv --output template.csv
```

检查文件是否成功下载。

#### 1.6 测试文件导入

使用下载的模板文件测试导入:

```bash
curl -X POST http://localhost:4000/api/lottery/import \
  -F "file=@template.csv" \
  -F "onDuplicate=skip"
```

期望响应:
```json
{
  "success": true,
  "message": "成功导入 2 条记录",
  "data": {
    "inserted": 2,
    "skipped": 0,
    "errors": []
  }
}
```

#### 1.7 查询导入的数据

```bash
curl http://localhost:4000/api/lottery/draws/latest?count=10
```

应该看到刚导入的2条记录。

#### 1.8 测试重复导入 (skip策略)

再次导入同一个文件:

```bash
curl -X POST http://localhost:4000/api/lottery/import \
  -F "file=@template.csv" \
  -F "onDuplicate=skip"
```

期望响应:
```json
{
  "success": true,
  "message": "成功导入 0 条记录，跳过 2 条重复",
  "data": {
    "inserted": 0,
    "skipped": 2,
    "errors": []
  }
}
```

#### 1.9 测试分页查询

```bash
curl "http://localhost:4000/api/lottery/draws?page=1&pageSize=50"
```

检查pagination字段。

#### 1.10 测试按期号查询

```bash
curl http://localhost:4000/api/lottery/draws/2024001
```

期望返回特定期号的数据。

### 阶段2: ML服务测试

#### 2.1 启动ML服务

```bash
cd ml-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

#### 2.2 测试ML服务健康检查

```bash
curl http://localhost:8001/health
```

#### 2.3 测试算法列表

```bash
curl http://localhost:8001/api/v1/algorithms/
```

#### 2.4 测试预测接口

```bash
curl -X POST http://localhost:8001/api/v1/predict/ \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"ensemble","dataset_size":200}'
```

### 阶段3: 前端测试

#### 3.1 启动前端开发服务器

```bash
cd frontend
npm run dev
```

访问 http://localhost:5173

#### 3.2 UI功能测试清单

**首页 (DashboardPage)**
- [ ] 显示4个统计卡片
- [ ] 显示快速开始指南

**历史数据页面 (HistoryPage)**
- [ ] 显示统计卡片 (总期数、最新期号、数据来源)
- [ ] 显示数据表格 (期号、日期、红球、蓝球)
- [ ] 分页控制正常工作
- [ ] 点击"下载Excel模板"成功下载
- [ ] 点击"下载CSV模板"成功下载
- [ ] 选择重复处理策略 (skip/replace/error)
- [ ] 上传文件成功,显示导入结果
- [ ] 上传相同文件,验证重复策略生效
- [ ] 删除记录功能正常

**号码预测页面 (PredictPage)**
- [ ] 选择算法下拉菜单正常
- [ ] 选择数据集大小正常
- [ ] 点击"预测号码"按钮
- [ ] 显示预测结果 (红球6个、蓝球1个)
- [ ] 显示置信度分数
- [ ] 显示历史预测记录

### 阶段4: 端到端集成测试

#### 4.1 完整流程测试

1. **准备数据**
   - 下载CSV模板
   - 修改模板,添加50条历史数据
   - 确保期号格式正确 (7位数字)
   - 确保红球范围 1-33,无重复
   - 确保蓝球范围 1-16

2. **导入数据**
   - 在历史数据页面上传文件
   - 验证导入成功消息
   - 检查统计卡片更新

3. **查看数据**
   - 浏览数据表格
   - 测试分页功能
   - 验证红球和蓝球显示正确

4. **运行预测**
   - 前往预测页面
   - 选择"综合预测"算法
   - 选择"最近200期"数据
   - 点击预测
   - 验证结果显示

5. **缓存验证**
   - 再次访问历史数据页面
   - 检查加载速度 (应该很快,因为有缓存)

#### 4.2 错误处理测试

1. **无效文件格式**
   - 上传 .txt 文件
   - 期望: 显示错误 "只支持 Excel/CSV"

2. **文件过大**
   - 上传 >10MB 文件
   - 期望: 显示错误 "文件大小不能超过10MB"

3. **无效数据格式**
   - 上传包含错误数据的CSV
   - 期望: 显示详细错误列表

4. **重复期号 (error策略)**
   - 选择"遇到重复则报错"
   - 上传包含重复期号的文件
   - 期望: 显示错误信息

## 性能测试

### 大数据量测试

创建包含1000条记录的CSV文件:

```bash
# 使用脚本生成测试数据
cat > generate_test_data.py << 'EOF'
import csv
import random
from datetime import datetime, timedelta

with open('test_1000_records.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['期号', '开奖日期', '红1', '红2', '红3', '红4', '红5', '红6', '蓝球'])

    start_date = datetime(2020, 1, 1)
    for i in range(1, 1001):
        period = f"2020{i:03d}"
        date = (start_date + timedelta(days=i*2)).strftime('%Y-%m-%d')
        red_balls = sorted(random.sample(range(1, 34), 6))
        blue_ball = random.randint(1, 16)
        writer.writerow([period, date] + red_balls + [blue_ball])

print("生成1000条测试数据完成: test_1000_records.csv")
EOF

python generate_test_data.py
```

导入并测试:
- 导入时间 < 5秒
- 分页响应时间 < 500ms
- 缓存命中后响应时间 < 100ms

## 故障排查

### 常见问题

**1. 数据库连接失败**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
解决方案:
- 检查 PostgreSQL 是否运行
- 检查 DATABASE_URL 配置
- 运行 `npx prisma migrate dev`

**2. Redis连接失败**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
解决方案:
- 检查 Redis 是否运行
- 检查 REDIS_URL 配置

**3. CORS错误**
```
Access-Control-Allow-Origin error
```
解决方案:
- 检查前端 VITE_API_BASE_URL 配置
- 确保后端 CORS 中间件正确配置

**4. Prisma客户端未生成**
```
Error: Cannot find module '@prisma/client'
```
解决方案:
```bash
cd backend
npx prisma generate
```

## 测试通过标准

所有功能测试通过后,应该满足:

✅ 数据库和Redis连接成功
✅ 所有API端点正常响应
✅ 文件上传和解析正常
✅ 数据验证正确
✅ 重复处理策略生效
✅ 分页功能正常
✅ 前端页面无报错
✅ 导入1000条数据性能合格
✅ 缓存机制正常工作

## 下一步

测试通过后,可以继续开发:
- 实现频率分析算法
- 实现趋势分析 (ARIMA)
- 开发统计分析API
- 完善前端可视化
