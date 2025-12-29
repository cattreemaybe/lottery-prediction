# lib

📁 **路径**: `backend/src/lib`

## 📋 文件列表

### errors.ts

**位置**: `backend/src/lib/errors.ts`

**导出**:
- `ERROR_CODES`
- `AppError`
- `createError`
- `isAppError`

**代码行数**: 114

---

### prisma.ts

**位置**: `backend/src/lib/prisma.ts`

**导出**:
- `prisma`
- `connectDatabase`
- `disconnectDatabase`

**依赖**:
- `../generated/prisma`

**代码行数**: 30

---

### redis.ts

**位置**: `backend/src/lib/redis.ts`

**导出**:
- `getRedisClient`
- `disconnectRedis`
- `cacheGet`
- `cacheSet`
- `cacheDel`
- `cacheDelPattern`
- `CacheKeys`

**代码行数**: 94

---

