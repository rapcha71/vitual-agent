import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPropertySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Regular users route to get their own properties
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

  app.post("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Validate the request body
      const propertyData = insertPropertySchema.parse(req.body);

      // Convert images object to array for storage
      const imagesArray = [];
      if (propertyData.images?.sign) imagesArray.push(propertyData.images.sign);
      if (propertyData.images?.property) imagesArray.push(propertyData.images.property);

      // Create the property
      const property = await storage.createProperty({
        ...propertyData,
        userId: req.user.id,
        images: imagesArray
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
        message: error.message || "Failed to create property"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
