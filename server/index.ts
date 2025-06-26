import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import cors from "cors";
import { setupAuth } from "./auth";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Enhanced logging for debugging
const debugLog = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

try {
  debugLog("Starting server initialization...");

  // Simplified CORS configuration
  app.use(cors({
    origin: true,
    credentials: true
  }));
  debugLog("CORS configured");

  // Cookie parser middleware - must be before session
  app.use(cookieParser());
  debugLog("Cookie parser configured");

  // Body parsing middleware with increased limits
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));
  debugLog("Body parsing middleware configured");

  // Setup authentication
  setupAuth(app);
  debugLog("Authentication setup complete");

  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    debugLog(`Incoming ${req.method} request to ${req.path}`);

    res.on("finish", () => {
      const duration = Date.now() - start;
      debugLog(`${req.method} ${req.path} ${res.statusCode} completed in ${duration}ms`);
    });

    next();
  });

  // Initialize server asynchronously
  (async () => {
    try {
      debugLog("Starting route registration...");
      const server = await registerRoutes(app);

      // Error handling middleware
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error('Server Error:', err);
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({
          message,
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      });

      // This block now correctly separates development and production logic
      if (app.get("env") === "development") {
        debugLog("Setting up Vite for development...");
        // We only import Vite in development to avoid errors in production
        const { setupVite } = await import("./vite.js");
        await setupVite(app, server);
      } else {
        debugLog("Setting up static serving for production...");
        // In production, we serve the built static files directly
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        // Serve all static files (HTML, CSS, JS) from the 'dist' directory
        app.use(express.static(__dirname));

        // For any request that doesn't match a file or an API route,
        // send the main index.html file. This is for React Router.
        app.get('*', (req, res) => {
          res.sendFile(path.join(__dirname, 'index.html'));
        });
      }

      // Cloud Run assigns the port dynamically
      const PORT = process.env.PORT || 8080;
      server.listen(Number(PORT), "0.0.0.0", () => {
        debugLog(`Server is running on port ${PORT}`);
        console.log(`
        🚀 Server is running!
          - Local: http://localhost:${PORT}
          - Network: http://0.0.0.0:${PORT}
          - Environment: ${app.get("env")}
        `);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  })();

} catch (error) {
  console.error('Critical server initialization error:', error);
  process.exit(1);
}
