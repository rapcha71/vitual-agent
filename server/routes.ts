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
import multer from "multer";

// Configure multer for message images - use memory storage for production compatibility
const uploadMessageImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Upload message image endpoint - returns base64 data URL (no local file storage)
  app.post('/api/upload/message-image', (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }
    next();
  }, uploadMessageImage.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó ninguna imagen" });
    }
    // Convert to base64 data URL for production compatibility (no local file storage)
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64}`;
    res.json({ url: dataUrl });
  });

  // Ruta para obtener todos los usuarios (solo super admin)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      // Verificar si el usuario es super admin
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({
          message: "Esta acción requiere privilegios de super administrador"
        });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        message: error.message || "Error al obtener la lista de usuarios"
      });
    }
  });

  // Admin route to delete a user (super admin only)
  app.delete("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({
          message: "Esta acción requiere privilegios de super administrador"
        });
      }

      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({
          message: "ID de usuario inválido"
        });
      }

      // Prevent deleting yourself
      if (userId === req.user.id) {
        return res.status(400).json({
          message: "No puedes eliminar tu propia cuenta"
        });
      }

      // Check if user exists
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({
          message: "Usuario no encontrado"
        });
      }

      // Delete the user
      await storage.deleteUser(userId);
      
      res.json({
        success: true,
        message: "Usuario eliminado exitosamente"
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        message: error.message || "Error al eliminar el usuario"
      });
    }
  });

  // Admin route to get all properties with user information (optimized)
  app.get("/api/admin/properties", requireAdmin, async (req, res) => {
    try {
      console.log("Admin properties request - User:", req.user ? req.user.id : 'No user');
      console.log("Admin properties request - Is admin:", req.user?.isAdmin);
      
      const properties = await storage.getAllPropertiesWithUsers();
      console.log("Admin properties found:", properties.length);

      // Optimize response by removing heavy image data for list view
      const optimizedProperties = properties.map(property => {
        // Handle images that might be stored as JSON string, array, or object
        let hasImagesFlag = false;
        if (property.images) {
          if (typeof property.images === 'string') {
            try {
              const parsed = JSON.parse(property.images);
              if (Array.isArray(parsed)) {
                hasImagesFlag = parsed.length > 0;
              } else if (typeof parsed === 'object' && parsed !== null) {
                hasImagesFlag = Object.values(parsed).some(v => typeof v === 'string' && v.startsWith('data:'));
              }
            } catch {
              hasImagesFlag = false;
            }
          } else if (Array.isArray(property.images)) {
            hasImagesFlag = property.images.length > 0;
          } else if (typeof property.images === 'object' && property.images !== null) {
            hasImagesFlag = Object.values(property.images).some(v => typeof v === 'string' && (v as string).startsWith('data:'));
          }
        }
        
        return {
          ...property,
          images: ['placeholder'],
          hasImages: hasImagesFlag
        };
      });

      res.json(optimizedProperties);
    } catch (error: any) {
      console.error("Error fetching admin properties:", error);
      res.status(500).json({ message: error.message || "Failed to fetch properties" });
    }
  });

  // Get images for a specific property (for map InfoWindow)
  app.get("/api/admin/properties/:propertyId/images", requireAdmin, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const property = await storage.getPropertyByPropertyId(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Propiedad no encontrada" });
      }

      let imagesArray: string[] = [];
      if (property.images) {
        let imagesData = property.images;
        
        // Parse if it's a string
        if (typeof imagesData === 'string') {
          try {
            imagesData = JSON.parse(imagesData);
          } catch {
            imagesData = [] as string[];
          }
        }
        
        // Handle array format
        if (Array.isArray(imagesData)) {
          imagesArray = imagesData.filter(img => typeof img === 'string');
        } 
        // Handle object format like {sign: "data:...", additional: ["data:..."]}
        else if (typeof imagesData === 'object' && imagesData !== null) {
          for (const value of Object.values(imagesData)) {
            if (typeof value === 'string' && value.startsWith('data:')) {
              imagesArray.push(value);
            } else if (Array.isArray(value)) {
              imagesArray.push(...value.filter(v => typeof v === 'string' && v.startsWith('data:')));
            }
          }
        }
      }

      res.json({ images: imagesArray });
    } catch (error: any) {
      console.error("Error fetching property images:", error);
      res.status(500).json({ message: "Error al obtener imágenes" });
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
    console.log("Properties request - Session ID:", req.sessionID);
    console.log("Properties request - Is authenticated:", req.isAuthenticated());
    console.log("Properties request - User:", req.user ? req.user.id : 'No user');
    
    if (!req.isAuthenticated() || !req.user) {
      console.log("Authentication failed for properties request");
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const properties = await storage.getPropertiesByUserId(req.user.id);
      console.log("Properties found:", properties.length);
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
        hasImages: !!req.body.images,
        location: req.body.location
      });

      // Validate the request body
      const propertyData = insertPropertySchema.parse(req.body);

      // Extract text from sign image if present
      let extractedPhoneNumber = null;
      if (propertyData.images?.sign) {
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
      const phoneToCheck = extractedPhoneNumber || propertyData.signPhoneNumber;
      if (phoneToCheck) {
        const existingProperties = await storage.getAllPropertiesWithUsers();

        const duplicateProperty = existingProperties.find(existingProp => {
          // Check if phone numbers match
          if (existingProp.signPhoneNumber === phoneToCheck) {
            // Check if locations are within 15 meters
            return isWithinRadius(
              existingProp.location,
              propertyData.location,
              15 // 15 meters radius
            );
          }
          return false;
        });

        if (duplicateProperty) {
          return res.status(400).json({
            success: false,
            message: "Ya existe una propiedad con el mismo número de teléfono en esta ubicación. Por este motivo, la propiedad no será registrada nuevamente.",
            details: {
              existingPropertyId: duplicateProperty.propertyId,
              distance: "menos de 15 metros"
            }
          });
        }
      }

      // Convert images object to array for storage
      const imagesArray = [];
      if (propertyData.images?.sign) imagesArray.push(propertyData.images.sign);
      if (propertyData.images?.property) imagesArray.push(propertyData.images.property);

      // Auto-set markerColor from propertyType if missing
      const markerColorMap: Record<string, string> = {
        house: "blue",
        land: "green",
        commercial: "yellow"
      };
      const markerColor = propertyData.markerColor || markerColorMap[propertyData.propertyType] || "blue";

      // Create the property with extracted phone number if found
      const propertyId = nanoid();
      const property = await storage.createProperty({
        ...propertyData,
        userId: req.user.id,
        propertyId,
        signPhoneNumber: phoneToCheck || propertyData.signPhoneNumber,
        images: imagesArray as any,
        markerColor,
        createdAt: propertyData.createdAt || new Date().toISOString()
      });

      console.log("Property created successfully:", property.propertyId);
      
      // Notify admin of new property
      const { notificationService } = await import("./services/notifications");
      await notificationService.notifyNewProperty({
        propertyId: property.propertyId,
        propertyType: property.propertyType,
        agentName: req.user.fullName || req.user.username,
        createdAt: property.createdAt
      });

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

  // Route for super admin to send messages
  app.post("/api/admin/messages", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({
          message: "Esta acción requiere privilegios de super administrador"
        });
      }

      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage({
        ...messageData,
        senderId: req.user.id
      });

      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(500).json({
        message: error.message || "Error al enviar el mensaje"
      });
    }
  });

  // Route for regular users to send messages to super admin
  app.post("/api/messages/to-admin", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Find super admin to send message to
      const allUsers = await storage.getAllUsers();
      const superAdmin = allUsers.find(u => u.isSuperAdmin);
      
      if (!superAdmin) {
        return res.status(404).json({ message: "No se encontró un super administrador" });
      }

      const message = await storage.createMessage({
        ...messageData,
        senderId: req.user!.id,
        recipientId: superAdmin.id,
      });

      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating message to admin:", error);
      res.status(500).json({
        message: error.message || "Error al enviar el mensaje"
      });
    }
  });

  // Route to get all messages
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const messages = await storage.getMessages();
      console.log("Messages returned to user:", req.user?.id, "count:", messages.length);
      console.log("Sample message recipientIds:", messages.slice(0, 5).map(m => ({ id: m.id, recipientId: m.recipientId, type: typeof m.recipientId })));
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({
        message: error.message || "Error al obtener los mensajes"
      });
    }
  });

  // Route to mark a message as read
  app.post("/api/messages/:messageId/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await storage.markMessageAsRead(parseInt(req.params.messageId), req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      res.status(500).json({
        message: error.message || "Error al marcar el mensaje como leído"
      });
    }
  });

  // Route to get unread message count
  app.get("/api/messages/unread/count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error: any) {
      console.error("Error getting unread message count:", error);
      res.status(500).json({
        message: error.message || "Error al obtener el conteo de mensajes no leídos"
      });
    }
  });

  // Route for super admin to send messages to specific users
  app.post("/api/messages/to-user/:userId", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({
          message: "Esta acción requiere privilegios de super administrador"
        });
      }

      const recipientId = parseInt(req.params.userId);
      if (isNaN(recipientId)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }

      const messageData = insertMessageSchema.parse(req.body);
      
      const message = await storage.createMessage({
        ...messageData,
        senderId: req.user.id,
        recipientId: recipientId,
      });

      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending message to user:", error);
      res.status(500).json({
        message: error.message || "Error al enviar el mensaje"
      });
    }
  });

  // Route for super admin to send broadcast messages to all users
  app.post("/api/messages/broadcast", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({
          message: "Esta acción requiere privilegios de super administrador"
        });
      }

      const messageData = insertMessageSchema.parse(req.body);
      
      const message = await storage.createMessage({
        ...messageData,
        senderId: req.user.id,
        recipientId: null,
      });

      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending broadcast message:", error);
      res.status(500).json({
        message: error.message || "Error al enviar el mensaje"
      });
    }
  });

  // Route to get property images on demand
  app.get("/api/properties/:propertyId/images", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const propertyId = req.params.propertyId;
      const properties = await storage.getAllPropertiesWithUsers();
      const property = properties.find(p => p.propertyId === propertyId);

      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Check if user is admin or owns the property
      if (!req.user?.isAdmin && property.userId !== req.user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ images: property.images || [] });
    } catch (error: any) {
      console.error("Error fetching property images:", error);
      res.status(500).json({ message: error.message || "Failed to fetch images" });
    }
  });

  // Route to get weekly payments (admin only)
  app.get("/api/admin/payments/weekly", requireAdmin, async (req, res) => {
    try {
      const payments = await storage.getWeeklyPayments();
      res.json(payments);
    } catch (error: any) {
      console.error("Error fetching weekly payments:", error);
      res.status(500).json({
        message: error.message || "Error al obtener los pagos semanales"
      });
    }
  });

  // Route to get payment history for a specific user (admin only)
  app.get("/api/admin/payments/user/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const history = await storage.getUserPaymentHistory(userId);
      res.json(history);
    } catch (error: any) {
      console.error("Error fetching user payment history:", error);
      res.status(500).json({
        message: error.message || "Error al obtener el historial de pagos del usuario"
      });
    }
  });

  // Route to get unviewed properties count (admin only)
  app.get("/api/admin/properties/unviewed-count", requireAdmin, async (req, res) => {
    try {
      const count = await storage.getUnviewedPropertiesCount();
      res.json({ count });
    } catch (error: any) {
      console.error("Error fetching unviewed properties count:", error);
      res.status(500).json({ message: "Error al obtener el conteo de propiedades nuevas" });
    }
  });

  // Route to mark properties as viewed (admin only)
  app.post("/api/admin/properties/mark-viewed", requireAdmin, async (req, res) => {
    try {
      const { propertyIds } = req.body;
      if (!Array.isArray(propertyIds)) {
        return res.status(400).json({ message: "propertyIds debe ser un array" });
      }
      await storage.markPropertiesAsViewed(propertyIds);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking properties as viewed:", error);
      res.status(500).json({ message: "Error al marcar propiedades como vistas" });
    }
  });

  // Route to export properties to Google Sheets (super admin only)
  app.post("/api/admin/export/properties", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({
          message: "Esta acción requiere privilegios de super administrador"
        });
      }

      // Check if Google Sheets credentials are configured
      if (!process.env.GOOGLE_SHEETS_CREDENTIALS || !process.env.GOOGLE_SHEETS_ID) {
        return res.status(400).json({
          message: "Las credenciales de Google Sheets no están configuradas"
        });
      }

      const { google } = await import("googleapis");
      const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Get all properties with user info, ordered by newest first
      const properties = await storage.getAllPropertiesWithUsers();
      const sortedProperties = properties.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      // Translate property types to Spanish
      const translatePropertyType = (type: string) => {
        const types: Record<string, string> = {
          'house': 'Casa',
          'land': 'Lote',
          'commercial': 'Comercial'
        };
        return types[type] || type;
      };

      // Format location from location object
      const formatLocation = (location: any) => {
        if (location && location.lat && location.lng) {
          return `${location.lat}, ${location.lng}`;
        }
        return 'Sin ubicación';
      };

      // Format date
      const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Sin fecha';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      // Prepare data for export
      const sheetName = `Exportación_${new Date().toISOString().split('T')[0]}`;
      const headers = [
        'Tipo de Propiedad',
        'Teléfono',
        'Ubicación (Lat, Lng)',
        'Usuario',
        'Fecha de Ingreso'
      ];

      const rows = sortedProperties.map(prop => [
        translatePropertyType(prop.propertyType),
        prop.signPhoneNumber || 'Sin teléfono',
        formatLocation(prop.location),
        prop.user?.username || prop.user?.fullName || 'Usuario desconocido',
        formatDate(prop.createdAt)
      ]);

      // Check if sheet exists, if so delete and recreate
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const existingSheet = spreadsheet.data.sheets?.find(
        s => s.properties?.title === sheetName
      );

      if (existingSheet) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              deleteSheet: {
                sheetId: existingSheet.properties?.sheetId
              }
            }]
          }
        });
      }

      // Create new sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName
              }
            }
          }]
        }
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      // Add data rows
      if (rows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A2:E${rows.length + 1}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: rows
          }
        });
      }

      // Get the spreadsheet URL
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId || 0}`;

      res.json({
        success: true,
        message: `Se exportaron ${rows.length} propiedades a Google Sheets`,
        sheetName,
        spreadsheetUrl,
        rowCount: rows.length
      });
    } catch (error: any) {
      console.error("Error exporting to Google Sheets:", error);
      res.status(500).json({
        message: error.message || "Error al exportar a Google Sheets"
      });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}