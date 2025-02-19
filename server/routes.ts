import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPropertySchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { GoogleSheetsStorage } from "./storage/google-sheets";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Temporary route to get service account email
  app.get("/api/service-account-email", (req, res) => {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS!);
      const email = credentials.client_email;
      if (!email) {
        return res.status(400).json({ error: "No client_email found in credentials" });
      }
      res.json({ email });
    } catch (error) {
      console.error("Error parsing credentials:", error);
      res.status(500).json({ error: "Error reading credentials" });
    }
  });

  // Example of custom session data management
  app.post("/api/session/custom", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    // Set custom session data
    req.session.customData = {
      lastAccessed: new Date(),
      customField: req.body.customField
    };

    res.json({ message: "Session updated with custom data" });
  });

  // Get session data
  app.get("/api/session/info", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    res.json({
      sessionID: req.sessionID,
      customData: req.session.customData || {},
      user: req.user
    });
  });

  app.post("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const propertyData = insertPropertySchema.parse(req.body);
      const propertyId = nanoid();

      const property = await storage.createProperty({
        ...propertyData,
        userId: req.user.id,
        propertyId
      });

      console.log("Property created successfully:", property.propertyId);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(400).json({ message: error.message || "Failed to create property" });
    }
  });

  app.get("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const properties = await storage.getPropertiesByUserId(req.user.id);
    res.json(properties);
  });

  const httpServer = createServer(app);
  return httpServer;
}