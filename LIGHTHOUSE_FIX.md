# Lighthouse 部署修复说明

## 问题原因

手机端无法看到历史数据的根本原因是:

1. **前端 API 地址配置错误**: `VITE_API_BASE_URL` 设置为 `http://localhost:4000/api`
   - 在手机浏览器中,`localhost` 解析为手机本身,而不是服务器
   - 导致 API 请求失败

2. **Nginx 代理配置问题**: 
   - 旧的 Nginx 配置末尾有多余的斜杠 `proxy_pass http://lottery-backend:4000/api/;`
   - 导致路径重写错误

## 解决方案

### 1. 更新前端环境变量

```yaml
# docker-compose.yml
frontend:
  environment:
    VITE_API_BASE_URL: /api  # 使用相对路径
```

### 2. 修正 Nginx 配置

```nginx
# nginx.conf
server {
    listen 80;
    listen [::]:80;
    server_name localhost;

    # API 代理到后端 - 注意末尾没有斜杠
    location /api {
        proxy_pass http://lottery-backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端静态文件
    location / {
        proxy_pass http://lottery-frontend:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持 (Vite HMR)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. 重新创建前端和 Nginx 容器

```bash
# 停止并删除旧容器
docker stop lottery-frontend lottery-nginx
docker rm lottery-frontend lottery-nginx

# 重新创建前端容器(使用正确的环境变量)
docker run -d --name lottery-frontend --network lottery-network \
  -e VITE_API_BASE_URL=/api \
  -p 5173:5173 \
  lottery-prediction_20251230173142-frontend \
  npm run dev -- --host

# 创建 Nginx 配置文件
mkdir -p /tmp/nginx-conf
cat > /tmp/nginx-conf/default.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name localhost;

    location /api {
        proxy_pass http://lottery-backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://lottery-frontend:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# 重新创建 Nginx 容器
docker run -d --name lottery-nginx --network lottery-network \
  -p 80:80 \
  -v /tmp/nginx-conf/default.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

## 架构说明

修复后的架构:

```
手机/电脑浏览器
    ↓
http://119.29.219.152
    ↓
Nginx (80 端口)
    ├─→ /api/* → Backend (4000)
    └─→ /*    → Frontend (5173)
```

- 前端使用相对路径 `/api` 请求后端
- Nginx 将 `/api/*` 请求代理到后端容器
- 其他请求代理到前端容器
- 无论从哪个设备访问都能正常工作

## 验证

```bash
# 测试 API 健康检查
curl http://119.29.219.152/api/health

# 测试彩票统计
curl http://119.29.219.152/api/lottery/stats

# 测试最新开奖数据
curl 'http://119.29.219.152/api/lottery/draws/latest?count=5'
```

## 注意事项

1. **环境变量必须正确**: `VITE_API_BASE_URL` 必须设置为 `/api`,不能是 `http://localhost:4000/api`
2. **Nginx 代理路径**: `proxy_pass` 的 URL 末尾不要有斜杠
3. **容器重启**: 修改环境变量后必须重新创建容器,不能只重启
