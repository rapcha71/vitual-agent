import { DatabaseStorage } from "./database-storage";
import { GoogleSheetsStorage } from "./google-sheets";
import { IStorage } from "../storage";
import { User, Property, InsertUser, InsertProperty, Message, InsertMessage } from "@shared/schema";
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
      }
    }
    return dbUser;
  }

  async getAllUsers(): Promise<User[]> {
    try {
      // Obtener usuarios solo de la base de datos principal
      return await this.dbStorage.getAllUsers();
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }

  async createProperty(property: InsertProperty & { userId: number }): Promise<Property> {
    const dbProperty = await this.dbStorage.createProperty(property);
    if (this.sheetsStorage) {
      try {
        await this.sheetsStorage.createProperty(property);
      } catch (error) {
        console.error("Error syncing property to Google Sheets:", error);
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

  async updateUserRole(userId: number, isAdmin: boolean): Promise<User> {
    const updatedUser = await this.dbStorage.updateUserRole(userId, isAdmin);
    // Note: Google Sheets storage doesn't support updateUserRole operation
    // Only database storage handles role updates
    return updatedUser;
  }

  async updateUserBiometricCredentials(userId: number, credentials: {
    credentialID: Buffer;
    publicKey: Buffer;
    counter: number;
  }): Promise<void> {
    await this.dbStorage.updateUserBiometricCredentials(userId, credentials);
  }

  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {
    await this.dbStorage.updateUserBiometricCounter(userId, counter);
  }

  // Métodos para mensajes (solo en base de datos por eficiencia)
  async createMessage(message: InsertMessage & { senderId: number }): Promise<Message> {
    return this.dbStorage.createMessage(message);
  }

  async getMessages(): Promise<(Message & { sender: User })[]> {
    return this.dbStorage.getMessages();
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    return this.dbStorage.markMessageAsRead(messageId, userId);
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    return this.dbStorage.getUnreadMessageCount(userId);
  }
}

// Usar solo DatabaseStorage para máximo rendimiento
export const storage = new DatabaseStorage();