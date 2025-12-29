/**
 * @fileoverview data-import.ts
 * @module backend/src/services/data-import
 *
 * Input:
//   - ../lib/prisma
//   - ../lib/redis
 *
 * Output:
//   - parseExcelFile
//   - parseCsvFile
//   - importLotteryDraws
//   - generateExcelTemplate
//   - generateCsvTemplate
 *
 * Pos: backend/src/services/data-import.ts
 */

import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { cacheDelPattern } from '../lib/redis';

// Data validation schema
const lotteryDrawSchema = z.object({
  period: z.string().regex(/^\d{7}$/, '期号必须是7位数字'),
  drawDate: z.coerce.date(),
  redBalls: z
    .array(z.number().int().min(1).max(33))
    .length(6)
    .refine((arr) => new Set(arr).size === 6, {
      message: '红球数字不能重复',
    })
    .refine((arr) => arr.every((n) => n >= 1 && n <= 33), {
      message: '红球数字必须在1-33之间',
    }),
  blueBall: z.number().int().min(1).max(16),
});

export type LotteryDrawInput = z.infer<typeof lotteryDrawSchema>;

export interface ImportResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  message: string;
}

export interface ConflictStrategy {
  onDuplicate: 'skip' | 'replace' | 'error';
}

/**
 * Parse Excel file buffer to lottery draw data
 */
export function parseExcelFile(buffer: Buffer): LotteryDrawInput[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('Excel文件为空');
  }

  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  return jsonData.map((row, index) => {
    try {
      return normalizeRow(row);
    } catch (error) {
      throw new Error(`第${index + 2}行数据格式错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/**
 * Parse CSV file buffer to lottery draw data
 */
export function parseCsvFile(buffer: Buffer): LotteryDrawInput[] {
  const csvString = buffer.toString('utf-8');

  const records = parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((row, index) => {
    try {
      return normalizeRow(row);
    } catch (error) {
      throw new Error(`第${index + 2}行数据格式错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/**
 * Normalize row data to standard format
 * Supports flexible column names
 */
function normalizeRow(row: Record<string, unknown>): LotteryDrawInput {
  const period = String(findColumnValue(row, ['期号', 'period', '期数'])).trim();
  const drawDateRaw = findColumnValue(row, ['开奖日期', 'drawDate', 'date', '日期']);
  const redBalls = extractRedBalls(row);
  const blueBall = extractBlueBall(row);

  return {
    period,
    drawDate: parseDrawDate(drawDateRaw),
    redBalls,
    blueBall,
  };
}

/**
 * Normalize different date formats that might come from CSV/Excel exports
 */
function parseDrawDate(value: unknown): Date {
  if (!value) {
    throw new Error('开奖日期不能为空');
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Some Excel exports keep native timestamps (milliseconds since epoch)
    if (value > 10 ** 11) {
      const timestampDate = new Date(value);
      if (!isNaN(timestampDate.getTime())) {
        return timestampDate;
      }
    }

    // Otherwise treat it as an Excel serial number (days since 1899-12-30)
    const excelDate = excelSerialToDate(value);
    if (excelDate) {
      return excelDate;
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error('开奖日期不能为空');
    }

    const normalized = normalizeDateString(trimmed);
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  throw new Error('开奖日期格式不正确');
}

function normalizeDateString(value: string): string {
  // Support formats like 2025/01/03 or 2025.01.03
  if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(value)) {
    return value.replace(/[./-]/g, '-');
  }

  // Support compact format such as 20250103
  if (/^\d{8}$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6);
    return `${year}-${month}-${day}`;
  }

  return value;
}

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const excelEpoch = Date.UTC(1899, 11, 30);
  const days = serial - 25569; // Serial for Unix epoch (1970-01-01)
  const date = new Date(days * millisecondsPerDay);
  if (!isNaN(date.getTime())) {
    return date;
  }

  const excelDate = new Date(excelEpoch + serial * millisecondsPerDay);
  return isNaN(excelDate.getTime()) ? null : excelDate;
}

/**
 * Find value by multiple possible column names
 */
function findColumnValue(row: Record<string, unknown>, possibleNames: string[]): unknown {
  for (const name of possibleNames) {
    if (name in row) {
      return row[name];
    }
  }

  // Try case-insensitive match
  const lowerCaseKeys = Object.keys(row).map((k) => k.toLowerCase());
  for (const name of possibleNames) {
    const index = lowerCaseKeys.indexOf(name.toLowerCase());
    if (index !== -1) {
      return Object.values(row)[index];
    }
  }

  throw new Error(`找不到列: ${possibleNames.join(' / ')}`);
}

/**
 * Extract red balls from various formats
 */
function extractRedBalls(row: Record<string, unknown>): number[] {
  // Format 1: Separate columns (红1, 红2, ... 红6)
  const redBallCols = [];
  for (let i = 1; i <= 6; i++) {
    const value = row[`红${i}`] ?? row[`red${i}`] ?? row[`Red${i}`];
    if (value !== undefined) {
      redBallCols.push(Number(value));
    }
  }

  if (redBallCols.length === 6) {
    return redBallCols;
  }

  // Format 2: Single column with comma/space separated
  const redBallsStr =
    (row['红球'] as string) ??
    (row['redBalls'] as string) ??
    (row['red_balls'] as string) ??
    '';

  if (redBallsStr) {
    return redBallsStr
      .toString()
      .split(/[,\s]+/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n));
  }

  throw new Error('无法解析红球数据');
}

/**
 * Extract blue ball
 */
function extractBlueBall(row: Record<string, unknown>): number {
  const value = row['蓝球'] ?? row['blue'] ?? row['blueBall'] ?? row['blue_ball'];

  if (value === undefined) {
    throw new Error('找不到蓝球列');
  }

  return Number(value);
}

/**
 * Validate and import lottery draw data to database
 */
export async function importLotteryDraws(
  data: LotteryDrawInput[],
  strategy: ConflictStrategy = { onDuplicate: 'skip' },
  source: string = 'csv'
): Promise<ImportResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      // Validate data
      const validated = lotteryDrawSchema.parse(row);

      // Check for duplicate
      const existing = await prisma.lotteryDraw.findUnique({
        where: { period: validated.period },
      });

      if (existing) {
        if (strategy.onDuplicate === 'error') {
          errors.push({ row: i + 1, error: `期号 ${validated.period} 已存在` });
          continue;
        }

        if (strategy.onDuplicate === 'skip') {
          skipped++;
          continue;
        }

        // Replace: update existing record
        await prisma.lotteryDraw.update({
          where: { period: validated.period },
          data: {
            drawDate: validated.drawDate,
            redBalls: validated.redBalls,
            blueBall: validated.blueBall,
            source,
          },
        });
        inserted++;
      } else {
        // Insert new record
        await prisma.lotteryDraw.create({
          data: {
            period: validated.period,
            drawDate: validated.drawDate,
            redBalls: validated.redBalls,
            blueBall: validated.blueBall,
            source,
          },
        });
        inserted++;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map((e) => e.message).join('; ');
        errors.push({ row: i + 1, error: message });
      } else {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }
  }

  // Clear cache after successful import
  if (inserted > 0) {
    await cacheDelPattern('lottery:*');
    await cacheDelPattern('stats:*');
  }

  // Log import result
  await prisma.importLog.create({
    data: {
      filename: 'import',
      fileType: source,
      recordCount: data.length,
      skipCount: skipped,
      errorCount: errors.length,
      status: errors.length === 0 ? 'success' : errors.length < data.length ? 'partial' : 'failed',
      errorMsg: errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : null,
    },
  });

  return {
    success: errors.length === 0,
    inserted,
    skipped,
    errors,
    message: `成功导入 ${inserted} 条记录${skipped > 0 ? `，跳过 ${skipped} 条重复` : ''}${errors.length > 0 ? `，${errors.length} 条错误` : ''}`,
  };
}

/**
 * Generate template files for download
 */
export function generateExcelTemplate(): Buffer {
  const templateData = [
    {
      期号: '2024001',
      开奖日期: '2024-01-01',
      红1: 3,
      红2: 9,
      红3: 12,
      红4: 18,
      红5: 25,
      红6: 30,
      蓝球: 5,
    },
    {
      期号: '2024002',
      开奖日期: '2024-01-02',
      红1: 2,
      红2: 11,
      红3: 16,
      红4: 21,
      红5: 29,
      红6: 32,
      蓝球: 8,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function generateCsvTemplate(): string {
  return `期号,开奖日期,红1,红2,红3,红4,红5,红6,蓝球
2024001,2024-01-01,3,9,12,18,25,30,5
2024002,2024-01-02,2,11,16,21,29,32,8`;
}
