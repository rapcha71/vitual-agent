import { DatabaseStorage } from "./database-storage";
import { GoogleSheetsStorage } from "./google-sheets";
import { IStorage } from "../storage";
import { User, Property, InsertUser, InsertProperty } from "@shared/schema";
import session from "express-session";

export class HybridStorage implements IStorage {
  private dbStorage: DatabaseStorage;
  private sheetsStorage: GoogleSheetsStorage | null = null;
  public sessionStore: session.Store;

  constructor() {
    this.dbStorage = new DatabaseStorage();
    this.sessionStore = this.dbStorage.sessionStore;

    // Inicializar Google Sheets de manera asíncrona
    this.initGoogleSheets().catch(error => {
      console.error("Error initializing Google Sheets storage:", error);
      // Continuar sin Google Sheets si hay error
    });
  }

  private async initGoogleSheets() {
    try {
      this.sheetsStorage = new GoogleSheetsStorage();
      console.log("Google Sheets storage initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Google Sheets storage:", error);
      this.sheetsStorage = null;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.dbStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.dbStorage.getUserByUsername(username);
  }

  async getUserByRememberToken(token: string): Promise<User | undefined> {
    return this.dbStorage.getUserByRememberToken(token);
  }

  async createUser(user: InsertUser): Promise<User> {
    const dbUser = await this.dbStorage.createUser(user);
    if (this.sheetsStorage) {
      try {
        await this.sheetsStorage.createUser(user);
      } catch (error) {
        console.error("Error syncing user to Google Sheets:", error);
        // Continuar incluso si falla la sincronización con Google Sheets
      }
    }
    return dbUser;
  }

  async createProperty(property: InsertProperty & { userId: number }): Promise<Property> {
    const dbProperty = await this.dbStorage.createProperty(property);
    if (this.sheetsStorage) {
      try {
        await this.sheetsStorage.createProperty(property);
      } catch (error) {
        console.error("Error syncing property to Google Sheets:", error);
        // Continuar incluso si falla la sincronización con Google Sheets
      }
    }
    return dbProperty;
  }

  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    return this.dbStorage.getPropertiesByUserId(userId);
  }

  async getAllPropertiesWithUsers(): Promise<(Property & { user: User })[]> {
    return this.dbStorage.getAllPropertiesWithUsers();
  }

  async updateUserRememberToken(userId: number, token: string | null): Promise<void> {
    await this.dbStorage.updateUserRememberToken(userId, token);
    if (this.sheetsStorage) {
      try {
        await this.sheetsStorage.updateUserRememberToken(userId, token);
      } catch (error) {
        console.error("Error syncing remember token to Google Sheets:", error);
      }
    }
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.dbStorage.updateLastLogin(userId);
    if (this.sheetsStorage) {
      try {
        await this.sheetsStorage.updateLastLogin(userId);
      } catch (error) {
        console.error("Error syncing last login to Google Sheets:", error);
      }
    }
  }

  async updateUserBiometricCredentials(userId: number, credentials: {
    credentialID: Buffer;
    publicKey: Buffer;
    counter: number;
  }): Promise<void> {
    await this.dbStorage.updateUserBiometricCredentials(userId, credentials);
    // No sincronizamos credenciales biométricas con Google Sheets por seguridad
  }

  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {
    await this.dbStorage.updateUserBiometricCounter(userId, counter);
    // No sincronizamos el contador biométrico con Google Sheets por seguridad
  }
}

export const storage = new HybridStorage();