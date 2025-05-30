const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Importar nuestros módulos (se compilarán a CommonJS)
const { registerRoutes } = require("./routes");
const { setupAuth } = require("./auth");

const app = express();

// Enhanced logging for debugging
const debugLog = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

try {
  debugLog("Starting server initialization...");

  // CORS configuration for production
  app.use(cors({
    origin: process.env.FRONTEND_URL || true,
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
  app.use((req: any, res: any, next: any) => {
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
      app.use((err: any, _req: any, res: any, _next: any) => {
        console.error('Server Error:', err);
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ 
          message,
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      });

      // Simple static file serving for production
      app.use(express.static('public'));
      
      // Health check endpoint
      app.get('/health', (req: any, res: any) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      const PORT = parseInt(process.env.PORT || '5000', 10);
      server.listen(PORT, "0.0.0.0", () => {
        debugLog(`Server is running on port ${PORT}`);
        console.log(`
        🚀 Server is running!
           - Local: http://localhost:${PORT}
           - Network: http://0.0.0.0:${PORT}
           - Environment: production
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
