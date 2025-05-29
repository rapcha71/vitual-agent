import fs from "fs";
import path from "path";
import { type Express } from "express";
import { type Server } from "http";
import express from "express";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await (
    await import("vite")
  ).createServer({
    server: { middlewareMode: true },
    appType: "custom",
    clearScreen: false,
  });
  app.use(vite.ssrLoadModule);
  app.use(vite.middlewares);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve("dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}`,
    );
  }

  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve("dist/index.html"));
  });
}
