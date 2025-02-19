import session from "express-session";
import createMemoryStore from "memorystore";
import { User, Property, InsertUser, InsertProperty, PropertyType, MarkerColors } from "@shared/schema";
import { IStorage } from "../storage";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private properties: Map<number, Property>;
  public sessionStore: session.Store;
  private currentUserId: number;
  private currentPropertyId: number;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.currentUserId = 1;
    this.currentPropertyId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      fullName: insertUser.fullName ?? null,
      mobile: insertUser.mobile ?? null,
      nickname: insertUser.nickname ?? null,
      isAdmin: insertUser.isAdmin ?? false
    };
    this.users.set(id, user);
    return user;
  }

  async createProperty(insertProperty: InsertProperty & { userId: number }): Promise<Property> {
    const id = this.currentPropertyId++;
    const markerColor = MarkerColors[insertProperty.propertyType as keyof typeof PropertyType];
    const property: Property = {
      ...insertProperty,
      id,
      signPhoneNumber: insertProperty.signPhoneNumber ?? null,
      kmlData: insertProperty.kmlData ?? null,
      markerColor
    };
    this.properties.set(id, property);
    return property;
  }

  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      (property) => property.userId === userId
    );
  }
}