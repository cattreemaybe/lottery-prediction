/**
 * Unified Error Code System
 * 统一错误码系统
 */

// Error code ranges:
// 1000-1999: Client errors (4xx)
// 2000-2999: Server errors (5xx)
// 3000-3999: Validation errors
// 4000-4999: Business logic errors
// 5000-5999: External service errors

export const ERROR_CODES = {
  // Client Errors (1000-1999)
  NOT_FOUND: { code: 1001, status: 404, message: '资源未找到' },
  BAD_REQUEST: { code: 1002, status: 400, message: '请求参数错误' },
  UNAUTHORIZED: { code: 1003, status: 401, message: '未授权访问' },
  FORBIDDEN: { code: 1004, status: 403, message: '禁止访问' },
  RATE_LIMITED: { code: 1005, status: 429, message: '请求过于频繁' },

  // Server Errors (2000-2999)
  INTERNAL_ERROR: { code: 2001, status: 500, message: '服务器内部错误' },
  SERVICE_UNAVAILABLE: { code: 2002, status: 503, message: '服务暂时不可用' },
  TIMEOUT: { code: 2003, status: 504, message: '请求超时' },

  // Validation Errors (3000-3999)
  VALIDATION_FAILED: { code: 3001, status: 400, message: '数据验证失败' },
  INVALID_FORMAT: { code: 3002, status: 400, message: '数据格式错误' },
  MISSING_FIELD: { code: 3003, status: 400, message: '缺少必填字段' },
  INVALID_RANGE: { code: 3004, status: 400, message: '数值超出有效范围' },

  // Business Logic Errors (4000-4999)
  INSUFFICIENT_DATA: { code: 4001, status: 400, message: '历史数据不足' },
  ALGORITHM_NOT_FOUND: { code: 4002, status: 400, message: '算法不存在' },
  PREDICTION_FAILED: { code: 4003, status: 500, message: '预测执行失败' },
  DUPLICATE_PERIOD: { code: 4004, status: 409, message: '期号已存在' },
  IMPORT_FAILED: { code: 4005, status: 400, message: '数据导入失败' },

  // External Service Errors (5000-5999)
  ML_SERVICE_ERROR: { code: 5001, status: 502, message: 'ML服务错误' },
  ML_SERVICE_TIMEOUT: { code: 5002, status: 504, message: 'ML服务响应超时' },
  ML_SERVICE_UNAVAILABLE: { code: 5003, status: 503, message: 'ML服务不可用' },
  DATABASE_ERROR: { code: 5004, status: 500, message: '数据库操作失败' },
  CACHE_ERROR: { code: 5005, status: 500, message: '缓存服务错误' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Application Error class with error code support
 */
export class AppError extends Error {
  public readonly code: number;
  public readonly status: number;
  public readonly details?: unknown;
  public cause?: Error;

  constructor(
    errorType: ErrorCode,
    options?: {
      message?: string;
      details?: unknown;
      cause?: Error;
    }
  ) {
    const errorDef = ERROR_CODES[errorType];
    const message = options?.message || errorDef.message;

    super(message);

    this.name = 'AppError';
    this.code = errorDef.code;
    this.status = errorDef.status;
    this.details = options?.details;

    if (options?.cause) {
      this.cause = options.cause;
    }

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    const result: {
      success: false;
      error: {
        code: number;
        message: string;
        details?: unknown;
      };
    } = {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
    
    if (this.details) {
      result.error.details = this.details;
    }
    
    return result;
  }
}

/**
 * Helper function to create errors quickly
 */
export function createError(
  errorType: ErrorCode,
  messageOrOptions?: string | { message?: string; details?: unknown; cause?: Error }
): AppError {
  if (typeof messageOrOptions === 'string') {
    return new AppError(errorType, { message: messageOrOptions });
  }
  return new AppError(errorType, messageOrOptions);
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
