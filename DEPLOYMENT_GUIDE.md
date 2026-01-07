# 部署指南 - 移除上传功能

## 部署信息

- **部署日期**: 2026-01-07
- **目标版本**: main (commit a982474)
- **部署内容**: 移除上传功能，保留自动爬取

## 步骤 1: 本地推送代码

```bash
cd /Users/cattreee/CBN/lottery-prediction

# 推送到 GitHub（需要认证）
git push origin main

# 如果需要配置 GitHub token:
# git remote set-url origin https://<token>@github.com/cattreemaybe/lottery-prediction.git
# git push origin main
```

## 步骤 2: 服务器部署

### 2.1 上传脚本到服务器

```bash
# 在本地执行
scp deploy-to-production.sh rollback.sh user@your-server:/path/to/lottery-prediction/
```

### 2.2 修改项目路径

编辑服务器上的 `deploy-to-production.sh`:
```bash
nano deploy-to-production.sh

# 修改这一行为你的实际项目路径
PROJECT_DIR="/path/to/lottery-prediction"
```

### 2.3 执行部署

```bash
# 在服务器上执行
cd /path/to/lottery-prediction
chmod +x deploy-to-production.sh
./deploy-to-production.sh
```

部署脚本会自动执行以下步骤：
1. ✅ 拉取最新代码
2. ✅ 检查环境配置
3. ✅ 备份数据库
4. ✅ 停止现有服务
5. ✅ 重新构建并启动
6. ✅ 验证部署状态

## 步骤 3: 手动部署（替代方案）

如果自动脚本执行失败，可手动执行：

```bash
# 3.1 拉取代码
cd /path/to/lottery-prediction
git pull origin main

# 3.2 检查 .env 配置
cd backend
cat .env
# 确保 DATABASE_URL, REDIS_URL 等配置正确

# 3.3 备份数据库
cd ..
mkdir -p backups
docker exec lottery-postgres pg_dump -U lottery_user -d lottery_db | gzip > backups/pre_deploy_backup.sql.gz

# 3.4 重新构建和部署
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 3.5 等待服务启动
sleep 30

# 3.6 查看日志
docker-compose logs -f backend
```

## 步骤 4: 验证部署

### 4.1 API 验证

```bash
# 检查健康状态
curl http://localhost:4000/api/health

# 检查数据量
curl http://localhost:4000/api/lottery/stats | jq '.data.totalDraws'

# 验证上传功能已移除（应返回 404）
curl -X POST http://localhost:4000/api/lottery/import
curl http://localhost:4000/api/lottery/template/excel
curl http://localhost:4000/api/lottery/template/csv

# 验证常量接口（应没有 fileUploadLimitMb）
curl http://localhost:4000/api/constants | jq
```

### 4.2 前端验证

访问生产环境 URL，检查：

1. **Dashboard 页面**
   - ✅ 显示历史数据量
   - ✅ 快速指南中无上传相关步骤

2. **历史数据页面**
   - ✅ 没有上传文件 UI
   - ✅ 没有下载模板按钮
   - ✅ 可以查看和删除记录

3. **其他功能**
   - ✅ 号码预测功能正常
   - ✅ 统计分析功能正常
   - ✅ 算法管理功能正常

### 4.3 爬虫验证

```bash
# 查看爬虫日志
docker logs lottery-scheduler

# 手动触发爬取
docker exec lottery-backend npm run sync:ssq

# 检查数据是否正确导入
docker exec lottery-postgres psql -U lottery_user -d lottery_db -c "SELECT COUNT(*), MAX(draw_date) FROM lottery_draws;"
```

## 备份信息

### 部署前备份
- **位置**: 服务器 `./backups/`
- **文件名**: `pre_deploy_backup_YYYYMMDD_HHMMSS.sql.gz`
- **脚本生成**: `lottery_backup_20260107_095946.sql.gz` (16K)

### 恢复备份

如需恢复到部署前状态：

```bash
# 方法 1: 恢复数据库
gunzip -c backups/pre_deploy_backup.sql.gz | docker exec -i lottery-postgres psql -U lottery_user -d lottery_db

# 方法 2: 恢复脚本生成的备份
gunzip -c backups/lottery_backup_20260107_095946.sql.gz | docker exec -i lottery-postgres psql -U lottery_user -d lottery_db
```

## 回滚方案

### 快速回滚

如果发现 bug，快速回滚到移除上传功能之前：

```bash
cd /path/to/lottery-prediction

# 使用回滚脚本（如果已上传）
./rollback.sh

# 或手动回滚
git revert 56ba4e2 --no-commit
docker-compose down
docker-compose up -d --build
```

### 回滚到指定版本

```bash
# 查看提交历史
git log --oneline -10

# 回滚到特定提交
git reset --hard <commit-hash>
git push origin main --force

# 重新部署
docker-compose down
docker-compose up -d --build
```

## 监控检查

部署后建议监控以下指标：

1. **服务健康**
   ```bash
   watch -n 5 'curl -s http://localhost:4000/api/health'
   ```

2. **错误日志**
   ```bash
   docker-compose logs -f backend | grep ERROR
   ```

3. **数据同步**
   ```bash
   # 检查爬虫是否正常工作
   docker logs lottery-scheduler --tail 50
   ```

4. **前端访问**
   - 检查浏览器控制台无错误
   - 验证所有页面加载正常

## 常见问题

### Q1: 服务启动失败
```bash
# 查看详细日志
docker-compose logs backend

# 检查端口占用
netstat -tlnp | grep -E '4000|5173|8001'
```

### Q2: 数据库连接失败
```bash
# 检查 .env 配置
cat backend/.env | grep DATABASE_URL

# 测试数据库连接
docker exec lottery-postgres psql -U lottery_user -d lottery_db -c "SELECT 1;"
```

### Q3: 爬虫无法工作
```bash
# 手动测试爬虫
docker exec lottery-backend npm run sync:ssq

# 检查网络连接
docker exec lottery-backend curl -I https://kaijiang.78500.cn/ssq/
```

## 联系支持

如遇到问题：
1. 检查日志: `docker-compose logs -f`
2. 回滚到之前版本
3. 联系开发团队

---

**部署准备就绪！**
