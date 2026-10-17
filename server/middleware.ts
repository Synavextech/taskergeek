import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { getSupabaseClient, createAdminClient } from "./supabase";
import { type SupabaseClient } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      user?: any;
      supabase: SupabaseClient;
      supabaseAdmin: SupabaseClient;
    }
  }
}

/**
 * Middleware to inject request-scoped Supabase clients.
 */
export const supabaseMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.supabase = getSupabaseClient(req, res);
  req.supabaseAdmin = createAdminClient();
  next();
};

import "express-session";
declare module "express-session" {
  interface SessionData {
    user?: any;
  }
}
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
  };
  timestamp: string;
}
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code;
  let details = err.details;

  // Handle specific error types with secure messages
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid request data';
    code = 'VALIDATION_ERROR';
    // Don't expose validation details in production
    if (process.env.NODE_ENV === 'production') {
      details = undefined;
    }
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid request format';
    code = 'INVALID_FORMAT';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced resource not found';
    code = 'INVALID_REFERENCE';
  } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    // Handle JSON parsing errors
    statusCode = 400;
    message = 'Invalid JSON format';
    code = 'INVALID_JSON';
  }

  // Security: Never expose stack traces or internal details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error for debugging (always log, but sanitize in production)
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    message,
    code,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection?.remoteAddress,
    ...(req.user && { userId: (req.user as any).id })
  };

  console.error(`[ERROR] ${JSON.stringify(logData)}`);

  if (isDevelopment && err.stack) {
    console.error(`[STACK] ${err.stack}`);
  }

  // Enhanced error sanitization - hide debug details in responses
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: statusCode >= 500 ? 'Internal server error' : message,
      ...(code && { code }),
      // Never expose details in production, even for client errors
      ...(isDevelopment && details && statusCode < 500 && { details })
    },
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(errorResponse);
};

// Success response helper
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
) => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(message && { message })
  };

  res.status(statusCode).json(response);
};

// Rate limiting middleware helper
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message: message || 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Tier 1: General API rate limiting (100 requests per 15 minutes)
export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many API requests, please try again later'
);

// Tier 2: Sensitive Auth route rate limiting (IP-based, 10 attempts per 15 minutes)
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10,
  'Too many authentication attempts from this IP, please try again in 15 minutes'
);

// Tier 4: OTP Verification rate limiting (Strict 5 attempts per 5 minutes)
export const otpRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  5,
  'Too many verification attempts, please try again in 5 minutes'
);

// Tier 3: Account-Based Rate Limiting Map (Tracks failed attempts per email to stop credential stuffing)
const accountFailureCache = new Map<string, { count: number; lockedUntil: number }>();

export const accountRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const email = req.body?.email?.toLowerCase()?.trim();
  if (!email) return next();

  const record = accountFailureCache.get(email);
  if (record && record.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / (1000 * 60));
    return res.status(429).json({
      success: false,
      error: {
        message: `Account temporarily locked due to multiple failed attempts. Please try again in ${minutesLeft} minute(s).`,
        code: 'ACCOUNT_LOCKED'
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

export const recordAccountAuthFailure = (email: string) => {
  if (!email) return;
  const key = email.toLowerCase().trim();
  const record = accountFailureCache.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;

  // Lock out account for 15 minutes after 5 consecutive failures
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000;
  }
  accountFailureCache.set(key, record);
};

export const clearAccountAuthFailure = (email: string) => {
  if (!email) return;
  accountFailureCache.delete(email.toLowerCase().trim());
};

// CORS configuration for API routes (strict)
// Simplified CORS configuration
export const appCors = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.FRONTEND_URL,
      process.env.PRODUCTION_URL,
      'https://protaskergeek.com',
      'https://www.protaskergeek.com'
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});


export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;

  // Capture response data safely
  let responseData: any;

  res.json = function (data: any) {
    responseData = data;
    return originalJson.call(this, data);
  };

  res.send = function (data: any) {
    responseData = data;
    return originalSend.call(this, data);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      ...(req.user && { userId: (req.user as any).id })
    };

    // Log API requests
    if (req.path.startsWith('/api')) {
      try {
        console.log(`[API] ${JSON.stringify(logData)}`);

        // Log errors with more detail (but avoid logging sensitive data)
        if (res.statusCode >= 400) {
          const errorLogData = {
            ...logData,
            body: req.body && typeof req.body === 'object' ? Object.keys(req.body) : req.body,
            query: req.query,
            params: req.params
          };
          console.error(`[ERROR] ${JSON.stringify(errorLogData)}`);
        }
      } catch (logError) {
        // Prevent logging errors from causing issues
        console.error('Logging error:', logError instanceof Error ? logError.message : String(logError));
      }
    }
  });

  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic XSS protection - remove script tags and javascript: protocols
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation middleware
export const validateSchema = (schema: any, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req[property]);
      req[property] = validated;
      next();
    } catch (error: any) {
      next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', error.errors));
    }
  };
};