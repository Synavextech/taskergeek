import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

// Load .env file for development only - production should use real env vars
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({
    quiet: true,
    path: path.join(rootDir, '.env')
  });
}

// Validate environment before proceeding
import { validateEnvironment, validateSupabaseConfig, validatePayPalConfig } from './env-check';
validateEnvironment();
validateSupabaseConfig();
validatePayPalConfig();
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import { registerRoutes } from "./routes";
import cors from "cors";
import {
  globalErrorHandler,
  appCors,
  requestLogger,
  sanitizeInput,
  apiRateLimit,
  supabaseMiddleware
} from "./middleware";
const app = express();
app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(appCors);
app.use(supabaseMiddleware);

// Session management
app.use(session({
  secret: process.env.SUPABASE_JWT_SECRET || 'protaskergeek-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  name: 'auth_token' // Use the same name as the older auth_token cookie
}));

app.use(requestLogger);
app.use(sanitizeInput);
app.use('/api', apiRateLimit);
(async () => {
  let log = console.log;
  const server = await registerRoutes(app);
  if (process.env.NODE_ENV === "development") {
    const viteModule = await import("./vite");
    log = viteModule.log;
    const { setupVite } = viteModule;
    await setupVite(app, server);
  } else {
    try {
      const { serveStatic } = await import("./vite");
      serveStatic(app);
    } catch {
      app.use(express.static(path.join(__dirname, '../dist')));
    }
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }
  app.use(globalErrorHandler);
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        log(logLine);
      }
    });
    next();
  });
  // Handle process signals for graceful shutdown
  const gracefulShutdown = () => {
    console.log('Received shutdown signal. Closing server...');
    server.close(() => {
      console.log('Server closed. Exiting process...');
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown();
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    gracefulShutdown();
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

  server.listen(
    {
      port,
      host,
    },
    () => {
      log(`Server running on http://${host}:${port}`);
      log(`Environment: ${process.env.NODE_ENV}`);
      log(`Process ID: ${process.pid}`);
    },
  );
})().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
