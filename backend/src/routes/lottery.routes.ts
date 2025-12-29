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
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { cacheGet, cacheSet, cacheDelPattern, CacheKeys } from '../lib/redis';
import {
  parseExcelFile,
  parseCsvFile,
  importLotteryDraws,
  generateExcelTemplate,
  generateCsvTemplate,
  type ConflictStrategy,
} from '../services/data-import';
import { getFrequencyStats } from '../services/lottery-stats';
import { fetchTrendData } from '../services/lottery-trends';

export const lotteryRouter = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 Excel (.xlsx, .xls) 或 CSV 文件'));
    }
  },
});

// Query schemas
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['drawDate', 'period']).default('drawDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const importQuerySchema = z.object({
  onDuplicate: z.enum(['skip', 'replace', 'error']).default('skip'),
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
 * POST /api/lottery/import
 * Import lottery data from Excel or CSV file
 */
lotteryRouter.post(
  '/import',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文件',
        });
      }

      const query = importQuerySchema.parse(req.query);
      const strategy: ConflictStrategy = { onDuplicate: query.onDuplicate };

      let parsedData;
      const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();

      if (fileExt === 'csv') {
        parsedData = parseCsvFile(req.file.buffer);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        parsedData = parseExcelFile(req.file.buffer);
      } else {
        return res.status(400).json({
          success: false,
          message: '不支持的文件格式',
        });
      }

      const result = await importLotteryDraws(parsedData, strategy, fileExt);

      res.json({
        success: result.success,
        message: result.message,
        data: {
          inserted: result.inserted,
          skipped: result.skipped,
          errors: result.errors,
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

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '导入失败',
      });
    }
  }
);

/**
 * GET /api/lottery/template/excel
 * Download Excel template
 */
lotteryRouter.get('/template/excel', (_req: Request, res: Response) => {
  const buffer = generateExcelTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=lottery-template.xlsx');
  res.send(buffer);
});

/**
 * GET /api/lottery/template/csv
 * Download CSV template
 */
lotteryRouter.get('/template/csv', (_req: Request, res: Response) => {
  const csvContent = generateCsvTemplate();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=lottery-template.csv');
  res.send('\uFEFF' + csvContent); // Add BOM for Excel UTF-8 support
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
