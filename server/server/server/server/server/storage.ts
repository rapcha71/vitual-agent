import session from "express-session";
import { User, Property, InsertUser, InsertProperty, InsertMessage, Message } from "@shared/schema";

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByRememberToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  createProperty(property: InsertProperty & { userId: number }): Promise<Property>;
  getPropertiesByUserId(userId: number): Promise<Property[]>;
  getAllPropertiesWithUsers(): Promise<(Property & { user: User })[]>;
  updateUserRememberToken(userId: number, token: string | null): Promise<void>;
  updateLastLogin(userId: number): Promise<void>;
  updateUserRole(userId: number, isAdmin: boolean): Promise<User>;
  updateUserBiometricCredentials(userId: number, credentials: {
    credentialID: Buffer;
    publicKey: Buffer;
    counter: number;
  }): Promise<void>;
  updateUserBiometricCounter(userId: number, counter: number): Promise<void>;
  createMessage(message: InsertMessage & { senderId: number }): Promise<Message>;
  getMessages(): Promise<(Message & { sender: User })[]>;
  markMessageAsRead(messageId: number, userId: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;
}

// Simple database storage implementation
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { users, properties } from '@shared/schema';
import createMemoryStore from 'memorystore';

const MemoryStore = createMemoryStore(session);

class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  private db: any;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    if (process.env.DATABASE_URL) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      this.db = drizzle(pool);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    if (!this.db) return undefined;
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.db) return undefined;
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByRememberToken(token: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!this.db) throw new Error("Database not available");
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.db) return [];
    return await this.db.select().from(users);
  }

  async createProperty(property: InsertProperty & { userId: number }): Promise<Property> {
    if (!this.db) throw new Error("Database not available");
    const [newProperty] = await this.db.insert(properties).values(property).returning();
    return newProperty;
  }

  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    if (!this.db) return [];
    return await this.db.select().from(properties).where(eq(properties.userId, userId));
  }

  async getAllPropertiesWithUsers(): Promise<(Property & { user: User })[]> {
    return [];
  }

  async updateUserRememberToken(userId: number, token: string | null): Promise<void> {}
  async updateLastLogin(userId: number): Promise<void> {}
  async updateUserRole(userId: number, isAdmin: boolean): Promise<User> {
    throw new Error("Not implemented");
  }
  async updateUserBiometricCredentials(userId: number, credentials: any): Promise<void> {}
  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {}
  async createMessage(message: InsertMessage & { senderId: number }): Promise<Message> {
    throw new Error("Not implemented");
  }
  async getMessages(): Promise<(Message & { sender: User })[]> {
    return [];
  }
  async markMessageAsRead(messageId: number, userId: number): Promise<void> {}
  async getUnreadMessageCount(userId: number): Promise<number> {
    return 0;
  }
}

export const storage = new DatabaseStorage();
