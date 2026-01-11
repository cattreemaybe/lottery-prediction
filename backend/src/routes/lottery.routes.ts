/**
 * @fileoverview lottery.routes.ts
 * @module backend/src/routes/lottery.routes
 *
 * Input:
//   - ../lib/prisma
//   - ../lib/redis
//   - ../services/data-import
//   - ../services/lottery-stats
//   - ../services/lottery-trends
 *
 * Output:
//   - lotteryRouter
 *
 * Pos: backend/src/routes/lottery.routes.ts
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { cacheGet, cacheSet, cacheDelPattern, CacheKeys } from '../lib/redis';
import { getFrequencyStats } from '../services/lottery-stats';
import { fetchTrendData } from '../services/lottery-trends';
import { runSsqCrawler } from '../scripts/fetch-ssq-from-78500';

export const lotteryRouter = Router();

// Query schemas
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['drawDate', 'period']).default('drawDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const frequencyQuerySchema = z.object({
  range: z.coerce.number().int().min(50).max(1000).default(200),
});

const trendQuerySchema = z.object({
  limit: z.coerce.number().int().min(10).max(50).default(20),
});

/**
 * GET /api/lottery/draws
 * List lottery draw records with pagination
 */
lotteryRouter.get('/draws', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, pageSize, sortBy, sortOrder } = query;

    const cacheKey = `${CacheKeys.lotteryDraws()}:${page}:${pageSize}:${sortBy}:${sortOrder}`;
    const cached = await cacheGet<{ data: unknown[]; total: number }>(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached.data,
        pagination: {
          page,
          pageSize,
          total: cached.total,
          totalPages: Math.ceil(cached.total / pageSize),
        },
      });
    }

    const [data, total] = await Promise.all([
      prisma.lotteryDraw.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.lotteryDraw.count(),
    ]);

    await cacheSet(cacheKey, { data, total }, 600); // Cache for 10 minutes

    res.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '请求参数不合法',
        errors: error.flatten(),
      });
    }
    next(error);
  }
});

/**
 * GET /api/lottery/draws/latest
 * Get latest lottery draw records
 */
lotteryRouter.get('/draws/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countSchema = z.object({
      count: z.coerce.number().int().min(1).max(1000).default(50),
    });

    const { count } = countSchema.parse(req.query);

    const cacheKey = CacheKeys.lotteryDraws(count);
    const cached = await cacheGet<unknown[]>(cacheKey);

    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const data = await prisma.lotteryDraw.findMany({
      take: count,
      orderBy: { drawDate: 'desc' },
    });

    await cacheSet(cacheKey, data, 600);

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '请求参数不合法',
        errors: error.flatten(),
      });
    }
    next(error);
  }
});

/**
 * GET /api/lottery/draws/:period
 * Get lottery draw by period
 */
lotteryRouter.get('/draws/:period', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period } = req.params;

    const cacheKey = CacheKeys.lotteryDrawByPeriod(period);
    const cached = await cacheGet<unknown>(cacheKey);

    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const data = await prisma.lotteryDraw.findUnique({
      where: { period },
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: `期号 ${period} 不存在`,
      });
    }

    await cacheSet(cacheKey, data, 3600);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/lottery/stats
 * Get lottery statistics
 */
lotteryRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalDraws, latestDraw, oldestDraw] = await Promise.all([
      prisma.lotteryDraw.count(),
      prisma.lotteryDraw.findFirst({ orderBy: { drawDate: 'desc' } }),
      prisma.lotteryDraw.findFirst({ orderBy: { drawDate: 'asc' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalDraws,
        latestDraw,
        oldestDraw,
        dateRange: latestDraw && oldestDraw ? {
          from: oldestDraw.drawDate,
          to: latestDraw.drawDate,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/lottery/stats/frequency
 * Get frequency analysis for red/blue balls
 */
lotteryRouter.get('/stats/frequency', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { range } = frequencyQuerySchema.parse(req.query);
    const stats = await getFrequencyStats(range);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: '请求参数不合法',
        errors: error.flatten(),
      });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/lottery/stats/trend
 * Get recent draw trend data
 */
lotteryRouter.get('/stats/trend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = trendQuerySchema.parse(req.query);
    const data = await fetchTrendData(limit);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: '请求参数不合法',
        errors: error.flatten(),
      });
      return;
    }
    next(error);
  }
});

/**
 * DELETE /api/lottery/draws/:period
 * Delete a lottery draw record
 */
lotteryRouter.delete('/draws/:period', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period } = req.params;

    await prisma.lotteryDraw.delete({
      where: { period },
    });

    await cacheDelPattern('lottery:*');
    await cacheDelPattern('stats:*');

    res.json({
      success: true,
      message: `期号 ${period} 已删除`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/lottery/sync
 * Manually trigger lottery data sync from crawler
 */
lotteryRouter.post('/sync', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await runSsqCrawler();

    await cacheDelPattern('lottery:*');
    await cacheDelPattern('stats:*');

    const totalDraws = await prisma.lotteryDraw.count();
    const latestDraw = await prisma.lotteryDraw.findFirst({
      orderBy: { drawDate: 'desc' },
    });

    res.json({
      success: true,
      message: '数据同步完成',
      data: {
        totalDraws,
        latestDraw: {
          period: latestDraw?.period,
          drawDate: latestDraw?.drawDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});
