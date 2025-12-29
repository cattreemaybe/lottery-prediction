# 🎓 新手完整测试指南

本指南将手把手教您如何测试双色球预测平台。每一步都有详细说明。

---

## 📋 前置准备清单

在开始之前,请确认:
- ✅ 已安装 Node.js (版本 18+)
- ✅ 已安装 npm
- ⬜ PostgreSQL 数据库
- ⬜ Redis 缓存

---

## 第一部分: 安装数据库 (约10分钟)

### Step 1: 安装 PostgreSQL 和 Redis

**在终端中依次执行以下命令:**

```bash
# 1. 安装 PostgreSQL
brew install postgresql@16

# 2. 安装 Redis
brew install redis

# 3. 启动 PostgreSQL 服务
brew services start postgresql@16

# 4. 启动 Redis 服务
brew services start redis
```

**等待安装完成后,验证是否成功:**

```bash
# 检查 PostgreSQL (应该显示版本号)
psql --version

# 检查 Redis (应该显示版本号)
redis-cli --version
```

### Step 2: 创建数据库和用户

```bash
# 1. 进入 PostgreSQL 命令行
psql postgres

# 2. 在 psql 中执行以下 SQL (复制粘贴,逐行执行):
CREATE DATABASE lottery_db;
CREATE USER lottery_user WITH PASSWORD 'lottery_pass';
GRANT ALL PRIVILEGES ON DATABASE lottery_db TO lottery_user;

# 3. 在 psql 中连接到新数据库测试
\c lottery_db

# 4. 给用户权限
GRANT ALL ON SCHEMA public TO lottery_user;

# 5. 退出 psql
\q
```

**说明:**
- `psql postgres` - 打开 PostgreSQL 命令行
- `\c lottery_db` - 连接到数据库
- `\q` - 退出 psql

---

## 第二部分: 后端测试 (约15分钟)

### Step 1: 进入后端目录并安装依赖

```bash
# 1. 进入项目根目录
cd /Users/cattreee/codex/test

# 2. 进入后端文件夹
cd backend

# 3. 安装所有依赖 (第一次需要几分钟)
npm install
```

**看到这样的输出表示成功:**
```
added XXX packages in XXs
```

### Step 2: 配置环境变量

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 用文本编辑器打开 .env 文件
open .env
```

**确认 .env 文件包含以下内容:**
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://lottery_user:lottery_pass@localhost:5432/lottery_db?schema=public
REDIS_URL=redis://localhost:6379
REDIS_TTL_SECONDS=3600
ML_SERVICE_BASE_URL=http://127.0.0.1:8001/api
ML_SERVICE_TIMEOUT_MS=2000
```

**保存并关闭文件。**

### Step 3: 运行数据库迁移

```bash
# 在 backend 目录下执行:
npx prisma migrate dev --name init
```

**成功的输出应该包含:**
```
✔ Your database is now in sync with your schema.
✔ Generated Prisma Client
```

**如果出现错误:**
- 检查 PostgreSQL 是否在运行: `brew services list`
- 检查数据库连接: `psql -U lottery_user -d lottery_db -h localhost`

### Step 4: 生成 Prisma Client

```bash
# 确保在 backend 目录
npx prisma generate
```

**看到 "Generated Prisma Client" 表示成功。**

### Step 5: 运行代码逻辑测试

```bash
# 测试数据导入功能
npx ts-node src/scripts/test-data-import.ts
```

**预期输出:**
```
🧪 Testing Data Import Functionality
...
🎉 All tests passed successfully!
```

**如果所有测试都显示 ✅,说明代码逻辑正确!**

### Step 6: 生成测试数据

```bash
# 生成 100 条测试数据
npx ts-node src/scripts/generate-test-data.ts 100
```

**成功输出:**
```
🎲 Generating 100 test lottery records...
✅ Generated 100 records
📄 Saved to: /Users/cattreee/codex/test/backend/test-data-100.csv
```

### Step 7: 启动后端服务器

```bash
# 启动开发服务器 (这个命令会一直运行,不要关闭)
npm run dev
```

**成功启动会看到:**
```
✅ Database connected successfully
✅ Redis connected successfully
API server listening on http://localhost:4000
```

**⚠️ 保持这个终端窗口打开!** 服务器需要一直运行。

---

### Step 8: 测试 API (打开新终端窗口)

**按 Command + T 打开新的终端标签页,或者打开新的终端窗口。**

#### 测试 1: 健康检查

```bash
curl http://localhost:4000/api/health
```

**预期输出:**
```json
{"status":"ok"}
```

#### 测试 2: 获取配置常量

```bash
curl http://localhost:4000/api/constants
```

**预期输出:** (包含红球、蓝球范围等配置)
```json
{
  "minDatasetSize": 50,
  "recommendedDatasetSize": 200,
  ...
}
```

#### 测试 3: 查看统计信息

```bash
curl http://localhost:4000/api/lottery/stats
```

**预期输出:** (初始状态为空)
```json
{
  "success": true,
  "data": {
    "totalDraws": 0,
    ...
  }
}
```

#### 测试 4: 下载 CSV 模板

```bash
curl http://localhost:4000/api/lottery/template/csv --output ~/Desktop/template.csv
```

**成功会在桌面看到 template.csv 文件。**

#### 测试 5: 导入测试数据

```bash
# 导入之前生成的 100 条数据
curl -X POST http://localhost:4000/api/lottery/import \
  -F "file=@/Users/cattreee/codex/test/backend/test-data-100.csv" \
  -F "onDuplicate=skip"
```

**预期输出:**
```json
{
  "success": true,
  "message": "成功导入 100 条记录",
  "data": {
    "inserted": 100,
    "skipped": 0,
    "errors": []
  }
}
```

#### 测试 6: 查询导入的数据

```bash
curl "http://localhost:4000/api/lottery/draws/latest?count=5"
```

**应该看到 5 条最新的开奖记录。**

#### 测试 7: 测试重复导入

```bash
# 再次导入相同文件 (应该全部跳过)
curl -X POST http://localhost:4000/api/lottery/import \
  -F "file=@/Users/cattreee/codex/test/backend/test-data-100.csv" \
  -F "onDuplicate=skip"
```

**预期输出:**
```json
{
  "success": true,
  "message": "成功导入 0 条记录，跳过 100 条重复",
  "data": {
    "inserted": 0,
    "skipped": 100,
    ...
  }
}
```

#### 测试 8: 查询特定期号

```bash
curl http://localhost:4000/api/lottery/draws/2020001
```

**应该返回期号 2020001 的详细数据。**

---

## 第三部分: Python ML服务测试 (约10分钟)

### Step 1: 打开新终端,进入 ML 服务目录

```bash
# 进入项目根目录
cd /Users/cattreee/codex/test

# 进入 ML 服务目录
cd ml-service
```

### Step 2: 创建 Python 虚拟环境

```bash
# 创建虚拟环境
python3 -m venv .venv

# 激活虚拟环境 (macOS/Linux)
source .venv/bin/activate
```

**激活成功后,命令行前面会出现 `(.venv)` 标记。**

### Step 3: 安装 Python 依赖

```bash
# 确保虚拟环境已激活 (看到 .venv 标记)
pip install -r requirements.txt
```

**看到 "Successfully installed..." 表示成功。**

### Step 4: 启动 ML 服务

```bash
# 启动 FastAPI 服务器
uvicorn app.main:app --reload --port 8001
```

**成功启动会看到:**
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete.
```

**⚠️ 保持这个终端窗口打开!**

### Step 5: 测试 ML 服务 (打开新终端)

```bash
# 测试健康检查
curl http://localhost:8001/health

# 测试算法列表
curl http://localhost:8001/api/v1/algorithms/

# 测试预测接口
curl -X POST http://localhost:8001/api/v1/predict/ \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"ensemble","dataset_size":200}'
```

**预期看到预测结果 (红球6个 + 蓝球1个 + 置信度)。**

---

## 第四部分: 前端测试 (约10分钟)

### Step 1: 打开新终端,进入前端目录

```bash
# 进入项目根目录
cd /Users/cattreee/codex/test

# 进入前端目录
cd frontend
```

### Step 2: 安装前端依赖

```bash
npm install
```

### Step 3: 配置前端环境变量

```bash
# 创建环境变量文件
echo 'VITE_API_BASE_URL=http://127.0.0.1:4000/api' > .env.local

# 查看文件内容确认
cat .env.local
```

### Step 4: 启动前端开发服务器

```bash
npm run dev
```

**成功启动会看到:**
```
  VITE vX.X.X  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 5: 在浏览器中测试

**打开浏览器,访问:** http://localhost:5173

#### 测试检查清单:

**首页 (Dashboard)**
- [ ] 页面正常加载
- [ ] 看到 4 个统计卡片
- [ ] 看到快速开始指南

**历史数据页面** (点击导航栏 "历史数据")
- [ ] 看到统计卡片显示 "总开奖期数: 100"
- [ ] 看到数据表格显示导入的数据
- [ ] 红球显示为红色圆形,蓝球显示为蓝色圆形
- [ ] 点击"上一页"/"下一页"按钮测试分页
- [ ] 点击"下载 Excel 模板"按钮,文件成功下载
- [ ] 点击"下载 CSV 模板"按钮,文件成功下载

**上传文件测试:**
1. 点击"选择文件上传"
2. 选择之前下载的模板文件
3. 应该看到导入结果提示
4. 数据表格应该显示新导入的数据

**号码预测页面** (点击导航栏 "号码预测")
- [ ] 选择算法下拉菜单正常
- [ ] 选择数据集大小正常
- [ ] 点击"预测号码"按钮
- [ ] 看到预测结果 (6个红球 + 1个蓝球)
- [ ] 看到置信度分数
- [ ] 右侧显示最近预测记录

---

## 🎯 测试通过标准

如果以上所有测试都成功,您应该看到:

✅ **后端服务器:**
- Database connected successfully
- Redis connected successfully
- 服务运行在 http://localhost:4000

✅ **ML 服务:**
- 服务运行在 http://localhost:8001
- API 返回预测结果

✅ **前端:**
- 页面正常显示
- 可以查看历史数据
- 可以上传文件
- 可以生成预测

✅ **数据库:**
- 成功导入 100 条测试数据
- 查询响应正常
- 重复导入正确处理

---

## ❓ 常见问题解决

### 问题 1: PostgreSQL 无法启动

```bash
# 检查服务状态
brew services list

# 重启服务
brew services restart postgresql@16
```

### 问题 2: Redis 无法启动

```bash
# 检查服务状态
brew services list

# 重启服务
brew services restart redis
```

### 问题 3: 端口被占用

```bash
# 查看占用 4000 端口的进程
lsof -i :4000

# 杀死进程 (替换 PID 为实际进程号)
kill -9 PID
```

### 问题 4: 数据库连接失败

```bash
# 测试数据库连接
psql -U lottery_user -d lottery_db -h localhost

# 如果提示密码,输入: lottery_pass
```

### 问题 5: Prisma Client 未生成

```bash
cd /Users/cattreee/codex/test/backend
npx prisma generate
```

### 问题 6: 前端无法连接后端

检查 `.env.local` 文件:
```bash
cd /Users/cattreee/codex/test/frontend
cat .env.local
```

应该显示:
```
VITE_API_BASE_URL=http://127.0.0.1:4000/api
```

---

## 📝 服务启动命令速查表

**您需要同时运行 3 个服务,建议打开 3 个终端窗口:**

### 终端 1: 后端服务
```bash
cd /Users/cattreee/codex/test/backend
npm run dev
```

### 终端 2: ML 服务
```bash
cd /Users/cattreee/codex/test/ml-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

### 终端 3: 前端服务
```bash
cd /Users/cattreee/codex/test/frontend
npm run dev
```

**全部启动成功后:**
- 后端: http://localhost:4000
- ML服务: http://localhost:8001
- 前端: http://localhost:5173

---

## ✨ 下一步

所有测试通过后,您可以:
1. 导入更多历史数据
2. 测试不同的预测算法
3. 开始开发新功能!

**祝您测试顺利!** 🎉
