import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPropertySchema } from "@shared/schema";
import { nanoid } from "nanoid";
import ocrService from "./services/ocr";
import { isWithinRadius } from "./lib/geo-utils";
import { requireAdmin } from "./middleware/admin";
import { insertMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Ruta para obtener todos los usuarios (solo super admin)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      // Verificar si el usuario es super admin
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ 
          message: "Access denied. Super admin privileges required." 
        });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: error.message || "Failed to fetch users" });
    }
  });

  // Ruta para actualizar rol de usuario (solo super admin)
  app.patch("/api/admin/users/:userId/role", requireAdmin, async (req, res) => {
    try {
      // Verificar si el usuario es super admin
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ 
          message: "Access denied. Super admin privileges required." 
        });
      }

      const userId = parseInt(req.params.userId);
      const { isAdmin } = req.body;

      if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: "isAdmin must be a boolean" });
      }

      const updatedUser = await storage.updateUserRole(userId, isAdmin);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: error.message || "Failed to update user role" });
    }
  });

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

  // Admin route to get all properties with user information
  app.get("/api/admin/properties", requireAdmin, async (req, res) => {
    try {
      const properties = await storage.getAllPropertiesWithUsers();
      res.json(properties);
    } catch (error: any) {
      console.error("Error fetching admin properties:", error);
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

  // OCR endpoint for extracting text from images
  app.post("/api/ocr", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }

      // Clean the base64 string
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
      
      const result = await ocrService.testOCR(base64Data);
      res.json(result);
    } catch (error: any) {
      console.error("OCR processing error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to process image"
      });
    }
  });

  // Test OCR connection
  app.get("/api/ocr/test", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Use a simple test image (1x1 white pixel)
      const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      
      const result = await ocrService.testOCR(testImageBase64);
      res.json({ 
        success: true, 
        message: "OCR service is working",
        result 
      });
    } catch (error: any) {
      console.error("OCR test error:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "OCR service test failed"
      });
    }
  });

  // Endpoint to get nearby properties within a radius
  app.get("/api/properties/nearby", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { lat, lng, radius = 1000 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ 
          message: "Latitude and longitude are required" 
        });
      }

      const userLocation = {
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string)
      };

      const radiusMeters = parseInt(radius as string);

      // Get all properties and filter by distance
      const allProperties = await storage.getAllPropertiesWithUsers();
      const nearbyProperties = allProperties.filter(property => {
        return isWithinRadius(userLocation, property.location, radiusMeters);
      });

      res.json(nearbyProperties);
    } catch (error: any) {
      console.error("Error fetching nearby properties:", error);
      res.status(500).json({ 
        message: error.message || "Failed to fetch nearby properties" 
      });
    }
  });

  // WebAuthn endpoints
  app.post("/api/webauthn/register/begin", async (req, res) => {
    // Implementation would go here
    res.json({ message: "WebAuthn register begin endpoint" });
  });

  app.post("/api/webauthn/register/complete", async (req, res) => {
    // Implementation would go here
    res.json({ message: "WebAuthn register complete endpoint" });
  });

  app.post("/api/webauthn/authenticate/begin", async (req, res) => {
    // Implementation would go here
    res.json({ message: "WebAuthn authenticate begin endpoint" });
  });

  app.post("/api/webauthn/authenticate/complete", async (req, res) => {
    // Implementation would go here
    res.json({ message: "WebAuthn authenticate complete endpoint" });
  });

  // Messages endpoints
  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage({
        ...messageData,
        senderId: req.user.id
      });

      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(500).json({ 
        message: error.message || "Failed to create message" 
      });
    }
  });

  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ 
        message: error.message || "Failed to fetch messages" 
      });
    }
  });

  app.patch("/api/messages/:messageId/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const messageId = parseInt(req.params.messageId);
      await storage.markMessageAsRead(messageId, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ 
        message: error.message || "Failed to mark message as read" 
      });
    }
  });

  app.get("/api/messages/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error: any) {
      console.error("Error getting unread message count:", error);
      res.status(500).json({ 
        message: error.message || "Failed to get unread message count" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
