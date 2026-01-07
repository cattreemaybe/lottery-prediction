#!/bin/bash
# 回滚脚本 - 恢复上传功能

set -e

PROJECT_DIR="/path/to/lottery-prediction"

echo "========================================="
echo "  回滚部署 - 恢复上传功能"
echo "========================================="
echo ""

echo -e "\033[1;33m[警告] 此操作将恢复上传功能\033[0m"
read -p "确认继续回滚? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "取消回滚"
    exit 0
fi

echo ""
echo "执行: git revert 56ba4e2"
cd ${PROJECT_DIR}
git revert 56ba4e2 --no-commit

echo "重新部署..."
docker-compose down
docker-compose up -d --build

echo "回滚完成！"
echo ""
echo "如需重新部署无上传功能版本："
echo "git revert HEAD~1"  # 撤销回滚
