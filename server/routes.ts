import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPropertySchema } from "@shared/schema";
import { nanoid } from "nanoid";
import ocrService from "./services/ocr";
import { isWithinRadius } from "./lib/geo-utils";
import { requireAdmin } from "./middleware/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Admin route to get all properties with user information
  app.get("/api/admin/properties", requireAdmin, async (req, res) => {
    try {
      const properties = await storage.getAllPropertiesWithUsers();
      console.log("Admin properties fetch:", {
        count: properties.length,
        sampleImages: properties[0]?.images || [],
        firstProperty: properties[0] ? {
          id: properties[0].propertyId,
          imageCount: properties[0].images?.length,
          hasImages: !!properties[0].images
        } : null
      });
      res.json(properties);
    } catch (error: any) {
      console.error("Error fetching admin properties:", error);
      res.status(500).json({ message: error.message || "Failed to fetch properties" });
    }
  });

  // Ruta protegida para gestionar roles de administrador (solo super admin)
  app.post("/api/admin/roles", requireAdmin, async (req, res) => {
    try {
      // Verificar si el usuario actual es super admin
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ 
          message: "Esta acción requiere privilegios de super administrador" 
        });
      }

      const { userId, isAdmin } = req.body;

      // No permitir cambios en el rol de super admin
      const targetUser = await storage.getUser(userId);
      if (targetUser?.isSuperAdmin) {
        return res.status(403).json({ 
          message: "No se pueden modificar los privilegios de un super administrador" 
        });
      }

      // Actualizar rol de administrador
      const updatedUser = await storage.updateUserRole(userId, isAdmin);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating admin role:", error);
      res.status(500).json({ 
        message: error.message || "Error al actualizar rol de administrador" 
      });
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

  app.post("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log("Received property submission request:", {
        propertyType: req.body.propertyType,
        hasSignImage: !!req.body.images?.sign,
        hasPropertyImage: !!req.body.images?.property,
        location: req.body.location
      });

      // Validate the request body
      const propertyData = insertPropertySchema.parse(req.body);
      const propertyId = nanoid();

      // Extract text from sign image if present
      let extractedPhoneNumber = null;
      if (propertyData.images.sign) {
        try {
          const extractedText = await ocrService.extractTextFromBase64Image(propertyData.images.sign);
          const phoneNumbers = await ocrService.extractPhoneNumbers(extractedText);
          if (phoneNumbers.length > 0) {
            extractedPhoneNumber = phoneNumbers[0];
            console.log('Extracted phone number from sign:', extractedPhoneNumber);
          }
        } catch (error) {
          console.error('Error processing sign image:', error);
          // Continue without OCR if it fails
        }
      }

      // Check for duplicate properties
      if (extractedPhoneNumber) {
        const existingProperties = await storage.getPropertiesByUserId(req.user.id);
        const duplicates = existingProperties.filter(existingProperty => {
          const phoneMatch = existingProperty.signPhoneNumber === extractedPhoneNumber;
          const locationMatch = isWithinRadius(
            existingProperty.location,
            propertyData.location,
            15 // 15 meters radius
          );
          return phoneMatch && locationMatch;
        });

        if (duplicates.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Se ha detectado una propiedad similar en un radio de 15 metros con el mismo número de teléfono. Por favor, verifique que no sea una propiedad duplicada.",
            duplicateProperties: duplicates.map(d => ({
              propertyId: d.propertyId,
              location: d.location,
              signPhoneNumber: d.signPhoneNumber
            }))
          });
        }
      }

      // Create the property with extracted phone number if found
      const property = await storage.createProperty({
        ...propertyData,
        userId: req.user.id,
        propertyId,
        signPhoneNumber: extractedPhoneNumber || propertyData.signPhoneNumber
      });

      console.log("Property created successfully:", property.propertyId);
      return res.status(201).json({
        success: true,
        property,
        message: "Property created successfully"
      });
    } catch (error: any) {
      console.error("Error creating property:", {
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create property",
        error: error.toString(),
        details: error.errors || error.issues || []
      });
    }
  });

  // Add OCR test endpoint
  app.post("/api/test-ocr", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ message: "No image provided" });
      }

      console.log("Testing OCR functionality...");
      const extractedText = await ocrService.extractTextFromBase64Image(image);
      const phoneNumbers = await ocrService.extractPhoneNumbers(extractedText);

      console.log("OCR test result:", {
        extractedText,
        phoneNumbers
      });

      res.json({
        success: true,
        extractedText,
        phoneNumbers
      });
    } catch (error: any) {
      console.error("Error testing OCR:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process image"
      });
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}