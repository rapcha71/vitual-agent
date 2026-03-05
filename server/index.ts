import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { setupAuth } from "./auth";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { logger } from "./lib/logger";
import { pool } from "./db";

const app = express();

const debugLog = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

try {
  debugLog("Starting server initialization...");

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProduction 
    ? [
        process.env.APP_URL,
        /^https?:\/\/(www\.)?virtualagentcr\.com$/,
        process.env.REPLIT_DEV_DOMAIN,
        process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : undefined,
        'https://real-estate-pro-rapcha1.replit.app',
        'https://vitual-agent.vercel.app',
        /\.replit\.app$/,
        /\.railway\.app$/,
        /\.vercel\.app$/
      ].filter(Boolean)
    : true;

  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }));
  debugLog("CORS configured");

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { message: 'Demasiadas solicitudes, intenta más tarde' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Demasiados intentos de inicio de sesión' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', generalLimiter);
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);
  app.use('/api/forgot-password', authLimiter);

  // Configure trust proxy BEFORE session middleware
  app.set('trust proxy', 1);

  // Cookie parser middleware - must be before session
  app.use(cookieParser());
  debugLog("Cookie parser configured");

  // Body parsing middleware with reasonable limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));
  debugLog("Body parsing middleware configured");

  // Setup authentication
  setupAuth(app);
  debugLog("Authentication setup complete");

  // Production optimized logging middleware
  app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      // Only log errors in production, all requests in development
      if (app.get("env") === "production") {
        if (res.statusCode >= 400) {
          debugLog(`${req.method} ${req.path} ${res.statusCode} completed in ${duration}ms`);
        }
      } else {
        if (duration > 1000 || res.statusCode >= 400) {
          debugLog(`${req.method} ${req.path} ${res.statusCode} completed in ${duration}ms`);
        }
      }
    });

    next();
  });

  // Initialize server asynchronously
  (async () => {
    try {
      debugLog("Starting route registration...");
      const server = await registerRoutes(app);

      // Health check endpoint for production
      app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        });
      });

      // Error handling middleware
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        logger.error('Server Error:', err);
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ 
          message,
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      });

      if (app.get("env") === "development") {
        debugLog("Setting up Vite for development...");
        await setupVite(app, server);
      } else {
        debugLog("Setting up static serving for production...");
        serveStatic(app);
      }

      const PORT = parseInt(process.env.PORT || "5000", 10);
      const useHttps = process.env.USE_HTTPS_DEV === "true" && process.env.NODE_ENV !== "production";
      const protocol = useHttps ? "https" : "http";
      server.listen(PORT, "0.0.0.0", async () => {
        debugLog(`Server is running on port ${PORT}`);
        console.log(`
        🚀 Server is running!
           - Local: ${protocol}://localhost:${PORT}
           - Network: ${protocol}://0.0.0.0:${PORT}
           ${useHttps ? `\n           📱 En el celular usá: ${protocol}://192.168.1.16:${PORT} (reemplazá con tu IP)\n           La cámara y GPS funcionan con HTTPS.` : ""}
           - Environment: ${app.get("env")}
        `);
        
        // Ensure province column and sequence exist (migration 0005 - idempotent)
        try {
          await pool.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "province" text DEFAULT '01'`);
          await pool.query(`CREATE SEQUENCE IF NOT EXISTS "property_consecutive_seq"`);
          await pool.query(`SELECT setval('property_consecutive_seq', (SELECT COALESCE(COUNT(*), 0) FROM properties))`);
          debugLog("Schema migration (province, sequence) verified");
        } catch (migErr) {
          logger.warn("Startup migration check:", migErr);
        }
        
        // Clean up old messages (older than 7 days) on startup
        try {
          const deletedCount = await storage.deleteOldMessages(7);
          if (deletedCount > 0) {
            console.log(`Cleaned up ${deletedCount} messages older than 7 days`);
          }
        } catch (error) {
          logger.error('Error cleaning up old messages:', error);
        }
        
        // Schedule daily cleanup of old messages (every 24 hours)
        const cleanupInterval = setInterval(async () => {
          try {
            const deletedCount = await storage.deleteOldMessages(7);
            if (deletedCount > 0) {
              debugLog(`Scheduled cleanup: deleted ${deletedCount} old messages`);
            }
          } catch (error) {
            logger.error('Error in scheduled message cleanup:', error);
          }
        }, 24 * 60 * 60 * 1000);
        cleanupInterval.unref(); // No mantiene el proceso vivo solo por este timer
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  })();

} catch (error) {
  logger.error('Critical server initialization error:', error);
  process.exit(1);
}