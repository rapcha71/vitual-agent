import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import cors from "cors";
import { setupAuth } from "./auth";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const debugLog = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

try {
  debugLog("Starting server initialization...");

  app.use(cors({
    origin: true,
    credentials: true
  }));
  debugLog("CORS configured");

  app.use(cookieParser());
  debugLog("Cookie parser configured");

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));
  debugLog("Body parsing middleware configured");

  setupAuth(app);
  debugLog("Authentication setup complete");

  app.use((req, res, next) => {
    const start = Date.now();
    debugLog(`Incoming ${req.method} request to ${req.path}`);
    res.on("finish", () => {
      const duration = Date.now() - start;
      debugLog(`${req.method} ${req.path} ${res.statusCode} completed in ${duration}ms`);
    });
    next();
  });

  (async () => {
    try {
      debugLog("Starting route registration...");
      const server = await registerRoutes(app);

      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error('Server Error:', err);
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({
          message,
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      });

      if (app.get("env") === "development") {
        debugLog("Setting up Vite for development...");
        const { setupVite } = await import("./vite.js");
        await setupVite(app, server);
      } else {
        debugLog("Setting up static serving for production...");
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        const staticFilesPath = path.join(__dirname, 'public');
        
        app.use(express.static(staticFilesPath));

        app.get('*', (req, res) => {
          res.sendFile(path.join(staticFilesPath, 'index.html'));
        });
      }

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
