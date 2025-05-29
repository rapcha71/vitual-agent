import express from "express";
import cors from "cors";
import { setupAuth } from "./auth.js";
import { registerRoutes } from "./routes.js";
import { log, setupVite, serveStatic } from "./vite.js";

const app = express();
const port = parseInt(process.env.PORT || "5000");

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? [process.env.FRONTEND_URL || "https://your-app.railway.app"]
    : ["http://localhost:5000", "http://localhost:3000"],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

async function startServer() {
  try {
    // Setup authentication
    setupAuth(app);
    
    // Register API routes
    const server = await registerRoutes(app);
    
    // Setup Vite in development, serve static files in production
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }

    server.listen(port, "0.0.0.0", () => {
      log(`Server running on port ${port}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
