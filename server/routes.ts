import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPropertySchema } from "@shared/schema";
import { nanoid } from "nanoid";
import ocrService from "./services/ocr";
import { GoogleSheetsStorage } from "./storage/google-sheets";
import type { 
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  AuthenticatorTransport 
} from "@simplewebauthn/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Add WebAuthn registration endpoint
  app.post("/api/webauthn/register", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log("Generating registration options for user:", req.user.username);
      const options = await generateRegistrationOptions({
        rpName: "Virtual Agent",
        rpID: req.hostname,
        userID: req.user.id.toString(),
        userName: req.user.username,
        attestationType: "none",
      } as GenerateRegistrationOptionsOpts);

      // Store challenge in session for verification
      req.session.challenge = options.challenge;
      await req.session.save();

      console.log("Registration options generated successfully");
      res.json(options);
    } catch (error) {
      console.error("Error generating registration options:", error);
      res.status(500).json({ message: "Failed to generate registration options" });
    }
  });

  // Add WebAuthn registration verification endpoint
  app.post("/api/webauthn/register/verify", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log("Verifying registration response");
      const expectedChallenge = req.session.challenge;
      if (!expectedChallenge) {
        throw new Error("No challenge found in session");
      }

      const verification = await verifyRegistrationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: `https://${req.hostname}`,
        expectedRPID: req.hostname,
      } as VerifyRegistrationResponseOpts);

      if (verification.verified && verification.registrationInfo) {
        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

        // Store the credential in the database
        await storage.updateUserBiometricCredentials(req.user.id, {
          credentialID: Buffer.from(credentialID),
          publicKey: Buffer.from(credentialPublicKey),
          counter,
        });

        delete req.session.challenge;
        await req.session.save();

        console.log("Registration verified successfully");
        res.json({ success: true });
      } else {
        throw new Error("Verification failed");
      }
    } catch (error) {
      console.error("Error verifying registration:", error);
      res.status(400).json({ message: "Failed to verify registration" });
    }
  });

  // Add WebAuthn authentication endpoint
  app.post("/api/webauthn/authenticate", async (req, res) => {
    try {
      console.log("Generating authentication options for username:", req.body.username);
      const user = await storage.getUserByUsername(req.body.username);
      if (!user || !user.biometricCredentialId) {
        return res.status(400).json({ message: "No biometric credentials found" });
      }

      const credentialId = Buffer.from(user.biometricCredentialId, 'base64');

      const options = await generateAuthenticationOptions({
        rpID: req.hostname,
        allowCredentials: [{
          id: credentialId,
          transports: ["internal"] as AuthenticatorTransport[],
          type: "public-key",
        }],
        userVerification: "preferred",
      } as GenerateAuthenticationOptionsOpts);

      req.session.challenge = options.challenge;
      req.session.username = user.username;
      await req.session.save();

      console.log("Authentication options generated successfully");
      res.json(options);
    } catch (error) {
      console.error("Error generating authentication options:", error);
      res.status(500).json({ message: "Failed to generate authentication options" });
    }
  });

  // Add WebAuthn authentication verification endpoint
  app.post("/api/webauthn/authenticate/verify", async (req, res) => {
    try {
      console.log("Verifying authentication response");
      const username = req.session.username;
      const expectedChallenge = req.session.challenge;

      if (!username || !expectedChallenge) {
        throw new Error("No authentication in progress");
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.biometricPublicKey || !user.biometricCredentialId) {
        throw new Error("User not found or no biometric data");
      }

      const verification = await verifyAuthenticationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: `https://${req.hostname}`,
        expectedRPID: req.hostname,
        requireUserVerification: true,
        authenticator: {
          credentialID: Buffer.from(user.biometricCredentialId, 'base64'),
          credentialPublicKey: Buffer.from(user.biometricPublicKey, 'base64'),
          counter: user.biometricCounter || 0,
        },
      } as VerifyAuthenticationResponseOpts);

      if (verification.verified) {
        // Update the counter
        await storage.updateUserBiometricCounter(user.id, verification.authenticationInfo.newCounter);

        // Log the user in
        req.login(user, (err) => {
          if (err) {
            console.error("Error logging in after biometric auth:", err);
            return res.status(500).json({ message: "Error logging in" });
          }
          console.log("Authentication successful, user logged in");
          res.json({ success: true });
        });
      } else {
        throw new Error("Verification failed");
      }

      delete req.session.challenge;
      delete req.session.username;
      await req.session.save();
    } catch (error) {
      console.error("Error verifying authentication:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to verify authentication" 
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
      const result = await ocrService.testOCR(image);
      console.log("OCR test result:", result);

      res.json(result);
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
      let extractedPhoneNumber = '';
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