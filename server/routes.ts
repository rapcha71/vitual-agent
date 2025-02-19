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
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log("Received property submission request");

      // Validate the request body
      const propertyData = insertPropertySchema.parse(req.body);
      const propertyId = nanoid();

      // Create the property
      const property = await storage.createProperty({
        ...propertyData,
        userId: req.user.id,
        propertyId
      });

      console.log("Property created successfully:", property.propertyId);
      return res.status(201).json({ 
        success: true,
        property,
        message: "Property created successfully" 
      });
    } catch (error: any) {
      console.error("Error creating property:", error);
      return res.status(400).json({ 
        success: false,
        message: error.message || "Failed to create property",
        error: error.toString()
      });
    }
  });

  app.get("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const properties = await storage.getPropertiesByUserId(req.user.id);
      res.json(properties);
    } catch (error: any) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: error.message || "Failed to fetch properties" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}