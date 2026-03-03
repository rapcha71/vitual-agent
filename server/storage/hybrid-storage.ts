import { DatabaseStorage } from "./database-storage";
import { GoogleSheetsStorage } from "./google-sheets";
import { IStorage } from "../storage";
import { User, Property, InsertUser, InsertProperty, Message, InsertMessage } from "@shared/schema";
import session from "express-session";

export class HybridStorage implements IStorage {
  private dbStorage: DatabaseStorage;
  private sheetsStorage: GoogleSheetsStorage | null = null;
  public sessionStore: session.Store;

  private userCache = new Map<number, { user: User | null, timestamp: number }>();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  async getUser(userId: number): Promise<User | undefined> {
    // Check cache first
    const cached = this.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.user || undefined;
    }

    // First try to get from database
    try {
      const user = await this.dbStorage.getUser(userId);
      if (user) {
        this.userCache.set(userId, { user, timestamp: Date.now() });
        return user;
      }
    } catch (error) {
      console.error('Database error, falling back to Google Sheets:', error);
    }

    // Fallback to Google Sheets if available
    if (this.sheetsStorage) {
      try {
        const user = await this.sheetsStorage.getUser(userId);
        this.userCache.set(userId, { user: user || null, timestamp: Date.now() });
        return user;
      } catch (error) {
        console.error('Google Sheets error:', error);
      }
    }

    // Cache miss
    this.userCache.set(userId, { user: null, timestamp: Date.now() });
    return undefined;
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
    // Clear cache for the created user if it exists
    this.userCache.delete(dbUser.id);
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
    // Clear cache for the updated user if it exists
    this.userCache.delete(userId);
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
    // Clear cache for the updated user if it exists
    this.userCache.delete(userId);
  }

  async updateUserRole(userId: number, isAdmin: boolean): Promise<User> {
    const updatedUser = await this.dbStorage.updateUserRole(userId, isAdmin);
    if (this.sheetsStorage) {
      try {
        await this.sheetsStorage.updateUserRole(userId, isAdmin);
      } catch (error) {
        console.error("Error syncing user role to Google Sheets:", error);
      }
    }
    // Clear cache for the updated user if it exists
    this.userCache.delete(userId);
    return updatedUser;
  }

  async updateUserBiometricCredentials(userId: number, credentials: {
    credentialID: Buffer;
    publicKey: Buffer;
    counter: number;
  }): Promise<void> {
    await this.dbStorage.updateUserBiometricCredentials(userId, credentials);
    // Clear cache for the updated user if it exists
    this.userCache.delete(userId);
  }

  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {
    await this.dbStorage.updateUserBiometricCounter(userId, counter);
    // Clear cache for the updated user if it exists
    this.userCache.delete(userId);
  }

  // Message methods
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

  async deleteOldMessages(daysOld: number): Promise<number> {
    return this.dbStorage.deleteOldMessages(daysOld);
  }

  // Payment calculation methods
  async getWeeklyPayments(): Promise<Array<{ 
    userId: number; 
    user: User; 
    propertiesCount: number; 
    totalPayment: number; 
    weekStart: string; 
    weekEnd: string; 
  }>> {
    return this.dbStorage.getWeeklyPayments();
  }

  async getUserPaymentHistory(userId: number): Promise<Array<{ 
    weekStart: string; 
    weekEnd: string; 
    propertiesCount: number; 
    totalPayment: number; 
  }>> {
    return this.dbStorage.getUserPaymentHistory(userId);
  }

  // Password reset methods
  async storePasswordResetCode(userId: number, code: string, expireTime: number): Promise<void> {
    return this.dbStorage.storePasswordResetCode(userId, code, expireTime);
  }

  async verifyPasswordResetCode(userId: number, code: string): Promise<boolean> {
    return this.dbStorage.verifyPasswordResetCode(userId, code);
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await this.dbStorage.updateUserPassword(userId, hashedPassword);
    // Clear cache for the updated user
    this.userCache.delete(userId);
  }

  async clearPasswordResetCode(userId: number): Promise<void> {
    return this.dbStorage.clearPasswordResetCode(userId);
  }
}

export const storage = new HybridStorage();