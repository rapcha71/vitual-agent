import session from "express-session";
import createMemoryStore from "memorystore";
import { User, Property, InsertUser, InsertProperty, PropertyType, MarkerColors } from "@shared/schema";
import { IStorage } from "../storage";

const MemoryStore = createMemoryStore(session);

// Create a singleton instance to persist data across reloads
let usersMap = new Map<number, User>();
let propertiesMap = new Map<number, Property>();
let currentUserId = 1;
let currentPropertyId = 1;
let memStore = new MemoryStore({
  checkPeriod: 86400000 // 24 hours
});

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private properties: Map<number, Property>;
  public sessionStore: session.Store;
  private currentUserId: number;
  private currentPropertyId: number;
  private passwordResetCodes: Map<number, { code: string; expireTime: number }> = new Map();

  constructor() {
    // Use the singleton instance
    this.users = usersMap;
    this.properties = propertiesMap;
    this.currentUserId = currentUserId;
    this.currentPropertyId = currentPropertyId;
    this.sessionStore = memStore;
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log("Getting user by ID:", id);
    const user = this.users.get(id);
    console.log("Found user:", user ? "Yes" : "No");
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log("Getting user by username:", username);
    const user = Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
    console.log("Found user:", user ? "Yes" : "No");
    return user;
  }

  async getUserByRememberToken(token: string): Promise<User | undefined> {
    console.log("Getting user by remember token:", token);
    const user = Array.from(this.users.values()).find(
      (user) => user.rememberToken === token,
    );
    console.log("Found user by remember token:", user ? "Yes" : "No");
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("Creating new user:", insertUser.username);
    const id = this.currentUserId++;
    currentUserId = this.currentUserId; // Update singleton

    const user: User = {
      ...insertUser,
      id,
      fullName: insertUser.fullName ?? null,
      mobile: insertUser.mobile ?? null,
      nickname: insertUser.nickname ?? null,
      isAdmin: insertUser.isAdmin ?? false,
      rememberToken: null,
      lastLoginAt: null
    };

    this.users.set(id, user);
    usersMap = this.users; // Update singleton
    console.log("User created successfully:", user);
    return user;
  }

  async updateUserRememberToken(userId: number, token: string | null): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const updatedUser: User = {
      ...user,
      rememberToken: token
    };

    this.users.set(userId, updatedUser);
    usersMap = this.users; // Update singleton
    console.log("Updated remember token for user:", userId);
  }

  async updateLastLogin(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);
    usersMap = this.users; // Update singleton
    console.log("Updated last login for user:", userId);
  }

  async createProperty(insertProperty: InsertProperty & { userId: number }): Promise<Property> {
    const id = this.currentPropertyId++;
    currentPropertyId = this.currentPropertyId; // Update singleton

    const markerColor = MarkerColors[insertProperty.propertyType as keyof typeof PropertyType];
    const property: Property = {
      ...insertProperty,
      id,
      signPhoneNumber: insertProperty.signPhoneNumber ?? null,
      kmlData: insertProperty.kmlData ?? null,
      markerColor,
      createdAt: new Date().toISOString()
    };

    this.properties.set(id, property);
    propertiesMap = this.properties; // Update singleton
    return property;
  }

  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      (property) => property.userId === userId
    );
  }

  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.biometricCounter = counter;
    }
  }

  async storePasswordResetCode(userId: number, code: string, expireTime: number): Promise<void> {
    this.passwordResetCodes.set(userId, { code, expireTime });
  }

  async verifyPasswordResetCode(userId: number, code: string): Promise<boolean> {
    const resetData = this.passwordResetCodes.get(userId);
    if (!resetData) {
      return false;
    }

    if (Date.now() > resetData.expireTime) {
      this.passwordResetCodes.delete(userId);
      return false;
    }

    return resetData.code === code;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.password = hashedPassword;
    }
  }

  async clearPasswordResetCode(userId: number): Promise<void> {
    this.passwordResetCodes.delete(userId);
  }

  // Payment calculation methods implementation
  async getWeeklyPayments(): Promise<Array<{ 
    userId: number; 
    user: User; 
    propertiesCount: number; 
    totalPayment: number; 
    weekStart: string; 
    weekEnd: string; 
  }>> {
    const paymentRate = 250; // 250 colones per property
    const currentDate = new Date();
    
    // Get start of current week (Monday)
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    
    // Get end of current week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Count properties registered this week by user
    const userPayments = new Map<number, { user: User; count: number }>();

    // Iterate through all properties
    for (const [, property] of this.properties) {
      const propertyDate = new Date(property.createdAt);
      
      if (propertyDate >= weekStart && propertyDate <= weekEnd) {
        const user = this.users.get(property.userId);
        if (user && !user.isAdmin && !user.isSuperAdmin) {
          if (userPayments.has(property.userId)) {
            userPayments.get(property.userId)!.count++;
          } else {
            userPayments.set(property.userId, { user, count: 1 });
          }
        }
      }
    }

    // Convert to result format
    const results = Array.from(userPayments.entries())
      .filter(([, data]) => data.count > 0)
      .map(([userId, data]) => ({
        userId,
        user: data.user,
        propertiesCount: data.count,
        totalPayment: data.count * paymentRate,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString()
      }));

    return results;
  }

  async getUserPaymentHistory(userId: number): Promise<Array<{ 
    weekStart: string; 
    weekEnd: string; 
    propertiesCount: number; 
    totalPayment: number; 
  }>> {
    const paymentRate = 250;
    const userProperties = Array.from(this.properties.values())
      .filter(p => p.userId === userId);

    // Group properties by week
    const weeklyGroups = new Map<string, number>();
    
    userProperties.forEach(property => {
      const propertyDate = new Date(property.createdAt);
      const weekStart = new Date(propertyDate);
      weekStart.setDate(propertyDate.getDate() - propertyDate.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyGroups.set(weekKey, (weeklyGroups.get(weekKey) || 0) + 1);
    });

    return Array.from(weeklyGroups.entries()).map(([weekKey, count]) => {
      const weekStart = new Date(weekKey);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        propertiesCount: count,
        totalPayment: count * paymentRate
      };
    }).filter(entry => entry.propertiesCount > 0);
  }

  // Message methods - need to implement these as they're missing
  async createMessage(message: InsertMessage & { senderId: number }): Promise<Message> {
    // For now, return a mock implementation
    throw new Error('Messages not implemented in MemStorage');
  }

  async getMessages(): Promise<(Message & { sender: User })[]> {
    // For now, return empty array
    return [];
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    // For now, do nothing
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    // For now, return 0
    return 0;
  }

  async deleteOldMessages(daysOld: number): Promise<number> {
    // For now, return 0
    return 0;
  }
}