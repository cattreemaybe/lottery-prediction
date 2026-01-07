#!/bin/bash
# 生产环境部署脚本 - 移除上传功能
# 部署日期: 2026-01-07
# 版本: main (commit a982474)

set -e  # 遇到错误立即退出

echo "========================================="
echo "  彩票预测系统 - 生产环境部署"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目目录（根据你的实际情况修改）
PROJECT_DIR="/path/to/lottery-prediction"

# 部署步骤
step_1_pull_code() {
    echo -e "${GREEN}[步骤 1/6]${NC} 拉取最新代码..."
    cd ${PROJECT_DIR}

    # 拉取最新代码
    echo "执行: git pull origin main"
    git pull origin main

    echo -e "${GREEN}✓${NC} 代码拉取完成"
    echo ""
}

step_2_check_env() {
    echo -e "${GREEN}[步骤 2/6]${NC} 检查环境配置..."

    cd ${PROJECT_DIR}/backend

    if [ ! -f .env ]; then
        echo -e "${RED}✗${NC} 未找到 .env 文件！"
        echo "请先配置 backend/.env 文件"
        exit 1
    fi

    echo "检查 DATABASE_URL 配置..."
    if ! grep -q "DATABASE_URL" .env; then
        echo -e "${RED}✗${NC} .env 文件缺少 DATABASE_URL"
        exit 1
    fi

    echo -e "${GREEN}✓${NC} 环境配置检查完成"
    echo ""
}

step_3_backup_database() {
    echo -e "${GREEN}[步骤 3/6]${NC} 备份数据库..."

    cd ${PROJECT_DIR}

    # 创建备份目录
    mkdir -p backups

    # 执行备份
    BACKUP_FILE="backups/pre_deploy_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

    echo "执行: docker exec lottery-postgres pg_dump -U lottery_user -d lottery_db | gzip > ${BACKUP_FILE}"
    docker exec lottery-postgres pg_dump -U lottery_user -d lottery_db | gzip > ${BACKUP_FILE}

    SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
    echo -e "${GREEN}✓${NC} 数据库备份成功: ${BACKUP_FILE} (大小: ${SIZE})"
    echo ""
}

step_4_stop_services() {
    echo -e "${GREEN}[步骤 4/6]${NC} 停止现有服务..."

    cd ${PROJECT_DIR}

    echo "执行: docker-compose down"
    docker-compose down

    echo -e "${GREEN}✓${NC} 服务已停止"
    echo ""
}

step_5_build_and_start() {
    echo -e "${GREEN}[步骤 5/6]${NC} 重新构建并启动服务..."

    cd ${PROJECT_DIR}

    echo "执行: docker-compose build --no-cache"
    docker-compose build --no-cache

    echo "执行: docker-compose up -d"
    docker-compose up -d

    echo -e "${GREEN}✓${NC} 服务启动中..."
    echo ""

    # 等待服务启动
    echo "等待服务启动（30秒）..."
    sleep 30
}

step_6_verify() {
    echo -e "${GREEN}[步骤 6/6]${NC} 验证部署状态..."

    # 检查服务状态
    echo "检查服务状态..."
    docker-compose ps

    # 检查后端 API
    echo ""
    echo "检查后端 API..."
    if curl -s http://localhost:4000/api/health > /dev/null; then
        echo -e "${GREEN}✓${NC} 后端 API 响应正常"
    else
        echo -e "${RED}✗${NC} 后端 API 无响应"
    fi

    # 检查统计数据
    echo "检查统计数据..."
    TOTAL_DRAWS=$(curl -s http://localhost:4000/api/lottery/stats | jq -r '.data.totalDraws')
    if [ ! -z "$TOTAL_DRAWS" ]; then
        echo -e "${GREEN}✓${NC} 数据量: ${TOTAL_DRAWS} 期"
    else
        echo -e "${YELLOW}⚠${NC} 无法获取数据量"
    fi

    # 检查上传路由是否已删除
    echo "验证上传功能已移除..."
    UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:4000/api/lottery/import)
    if [ "$UPLOAD_STATUS" = "404" ]; then
        echo -e "${GREEN}✓${NC} 上传路由已成功删除 (404)"
    else
        echo -e "${RED}✗${NC} 上传路由仍然存在 (HTTP $UPLOAD_STATUS)"
    fi

    # 检查模板下载路由是否已删除
    echo "验证模板下载已移除..."
    TEMPLATE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/lottery/template/excel)
    if [ "$TEMPLATE_STATUS" = "404" ]; then
        echo -e "${GREEN}✓${NC} 模板下载路由已成功删除 (404)"
    else
        echo -e "${RED}✗${NC} 模板下载路由仍然存在 (HTTP $TEMPLATE_STATUS)"
    fi

    echo ""
}

main() {
    echo -e "${YELLOW}开始部署流程...${NC}"
    echo ""

    # 执行所有步骤
    step_1_pull_code
    step_2_check_env
    step_3_backup_database
    step_4_stop_services
    step_5_build_and_start
    step_6_verify

    echo "========================================="
    echo -e "${GREEN}  部署完成！${NC}"
    echo "========================================="
    echo ""
    echo "后续操作："
    echo "1. 访问前端页面验证功能"
    echo "2. 检查日志: docker-compose logs -f"
    echo "3. 查看爬虫状态: docker logs lottery-scheduler"
    echo ""
    echo "如需回滚，执行: git revert 56ba4e2"
}

# 执行主函数
main
