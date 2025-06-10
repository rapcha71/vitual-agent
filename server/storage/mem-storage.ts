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
      markerColor
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
}