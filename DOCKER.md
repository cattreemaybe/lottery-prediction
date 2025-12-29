# Docker Deployment Guide

## Quick Start with Docker Compose

### Prerequisites
- Docker Engine 20.10+
- Docker Compose V2

### Development Environment

1. **Start all services:**
```bash
docker-compose up -d
```

2. **View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ml-service
```

3. **Stop services:**
```bash
docker-compose down
```

4. **Stop and remove volumes (clean reset):**
```bash
docker-compose down -v
```

### Service URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **ML Service**: http://localhost:8001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Database Migrations

Run migrations after first startup:

```bash
docker-compose exec backend npx prisma migrate dev --name init
```

Or manually:

```bash
cd backend
npx prisma migrate dev --name init
```

### Development Workflow

#### Backend Changes
The backend uses volume mounts for hot-reload during development:

```bash
# Restart backend after dependency changes
docker-compose restart backend
```

#### ML Service Changes
Python code changes are reflected immediately due to volume mounts.

#### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U lottery_user -d lottery_db

# Prisma Studio
docker-compose exec backend npx prisma studio
```

#### Redis Access

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# View all keys
docker-compose exec redis redis-cli KEYS "*"
```

### Troubleshooting

#### Port Conflicts
If ports are already in use, modify `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - '4001:4000'  # Change host port
```

#### Database Connection Issues
Check if PostgreSQL is healthy:

```bash
docker-compose ps
docker-compose logs postgres
```

#### Reset Everything
```bash
docker-compose down -v
docker-compose up -d --build
```

### Production Deployment

For production, create a separate `docker-compose.prod.yml`:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Key differences for production:
- Remove volume mounts
- Use environment variables from `.env` files
- Enable HTTPS with reverse proxy (Nginx)
- Configure resource limits
- Set up log aggregation

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Backend health endpoint
curl http://localhost:4000/api/health

# ML Service health endpoint
curl http://localhost:8001/health
```

### Backup & Restore

#### PostgreSQL Backup
```bash
docker-compose exec postgres pg_dump -U lottery_user lottery_db > backup.sql
```

#### PostgreSQL Restore
```bash
docker-compose exec -T postgres psql -U lottery_user lottery_db < backup.sql
```

#### Redis Backup
```bash
docker-compose exec redis redis-cli SAVE
docker cp lottery-redis:/data/dump.rdb ./redis-backup.rdb
```

### Performance Tuning

#### PostgreSQL
Modify `docker-compose.yml` to add performance settings:

```yaml
postgres:
  command:
    - postgres
    - -c
    - max_connections=200
    - -c
    - shared_buffers=256MB
```

#### Redis
```yaml
redis:
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Monitoring

Consider adding monitoring services:

```yaml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - '9090:9090'

  grafana:
    image: grafana/grafana
    ports:
      - '3000:3000'
```
