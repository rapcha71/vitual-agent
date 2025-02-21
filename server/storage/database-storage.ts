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
        rememberToken: null,
        lastLoginAt: new Date().toISOString()
      })
      .returning();
    console.log("User created successfully:", user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    console.log("Getting all users");
    const allUsers = await db.select().from(users);
    console.log("Found users count:", allUsers.length);
    return allUsers;
  }

  async updateUserRole(userId: number, isAdmin: boolean): Promise<User> {
    console.log("Updating user role:", { userId, isAdmin });
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    console.log("User role updated successfully");
    return updatedUser;
  }

  async updateUserRememberToken(userId: number, token: string | null): Promise<void> {
    console.log("Updating remember token for user:", userId);
    await db
      .update(users)
      .set({ rememberToken: token })
      .where(eq(users.id, userId));
    console.log("Remember token updated successfully");
  }

  async updateLastLogin(userId: number): Promise<void> {
    console.log("Updating last login for user:", userId);
    await db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, userId));
    console.log("Last login updated successfully");
  }

  async createProperty(insertProperty: InsertProperty & { userId: number }): Promise<Property> {
    const markerColor = MarkerColors[insertProperty.propertyType as keyof typeof PropertyType];
    const [createdProperty] = await db
      .insert(properties)
      .values({
        ...insertProperty,
        markerColor,
      })
      .returning();

    return createdProperty;
  }

  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.userId, userId));
  }

  async getAllPropertiesWithUsers(): Promise<(Property & { user: User })[]> {
    const result = await db.select({
      property: properties,
      user: users
    }).from(properties)
      .leftJoin(users, eq(properties.userId, users.id));

    return result.map(({ property, user }) => ({
      ...property,
      user: user as User
    }));
  }

  async updateUserBiometricCredentials(userId: number, credentials: {
    credentialID: Buffer;
    publicKey: Buffer;
    counter: number;
  }): Promise<void> {
    console.log("Updating biometric credentials for user:", userId);
    await db
      .update(users)
      .set({
        biometricCredentialId: credentials.credentialID.toString('base64'),
        biometricPublicKey: credentials.publicKey.toString('base64'),
        biometricCounter: credentials.counter,
        biometricEnabled: true
      })
      .where(eq(users.id, userId));
    console.log("Biometric credentials updated successfully");
  }

  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {
    console.log("Updating biometric counter for user:", userId);
    await db
      .update(users)
      .set({ biometricCounter: counter })
      .where(eq(users.id, userId));
    console.log("Biometric counter updated successfully");
  }
}