import { users, properties, type User, type Property, type InsertUser, type InsertProperty, PropertyType, MarkerColors } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { IStorage } from "../storage";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "../db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log("Getting user by ID:", id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    console.log("Found user:", user ? "Yes" : "No");
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log("Getting user by username:", username);
    const [user] = await db.select().from(users).where(eq(users.username, username));
    console.log("Found user:", user ? "Yes" : "No");
    return user;
  }

  async getUserByRememberToken(token: string): Promise<User | undefined> {
    console.log("Getting user by remember token");
    const [user] = await db.select().from(users).where(eq(users.rememberToken, token));
    console.log("Found user:", user ? "Yes" : "No");
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("Creating new user:", insertUser.username);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        rememberToken: null
      })
      .returning();
    console.log("User created successfully:", user);
    return user;
  }

  async updateUserRememberToken(userId: number, token: string | null): Promise<void> {
    console.log("Updating remember token for user:", userId);
    await db
      .update(users)
      .set({ rememberToken: token })
      .where(eq(users.id, userId));
    console.log("Remember token updated successfully");
  }

  async updateUserBiometricCredentials(userId: number, credentials: {
    credentialID: Buffer;
    publicKey: Buffer;
    counter: number;
  }): Promise<void> {
    await db
      .update(users)
      .set({
        biometricCredentialId: credentials.credentialID.toString('base64'),
        biometricPublicKey: credentials.publicKey.toString('base64'),
        biometricCounter: credentials.counter,
        biometricEnabled: true,
      })
      .where(eq(users.id, userId));
  }

  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {
    await db
      .update(users)
      .set({ biometricCounter: counter })
      .where(eq(users.id, userId));
  }

  async createProperty(insertProperty: InsertProperty & { userId: number }): Promise<Property> {
    const markerColor = MarkerColors[insertProperty.propertyType as keyof typeof PropertyType];
    const property = {
      ...insertProperty,
      markerColor
    };

    const [createdProperty] = await db
      .insert(properties)
      .values(property)
      .returning();

    return createdProperty;
  }

  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.userId, userId));
  }
}