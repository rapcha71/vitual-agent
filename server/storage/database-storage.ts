// This file is the single source of truth for database access.
import { users, properties, messages, deletedProperties, type User, type Property, type Message, type InsertUser, type InsertProperty, type InsertMessage, type DeletedProperty, PropertyType, MarkerColors } from "@shared/schema";
import { db, pool } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import { IStorage } from "./types";
import session from "express-session";
import connectPg from "connect-pg-simple";

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

    // Convert images object to array if it's not already an array
    const images = Array.isArray(insertProperty.images)
      ? insertProperty.images
      : Object.values(insertProperty.images).filter(Boolean);

    const [createdProperty] = await db
      .insert(properties)
      .values({
        ...insertProperty,
        images,
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

  async createMessage(message: InsertMessage & { senderId: number }): Promise<Message> {
    console.log("Creating new message:", message.content);
    const allUsers = await this.getAllUsers();
    const unreadByUsers = allUsers.map(user => user.id).filter(id => id !== message.senderId);

    const [createdMessage] = await db
      .insert(messages)
      .values({
        ...message,
        unreadByUsers
      })
      .returning();

    console.log("Message created successfully");
    return createdMessage;
  }

  async getMessages(): Promise<(Message & { sender: User })[]> {
    console.log("Getting all messages");
    const result = await db.select({
      message: messages,
      sender: users
    }).from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .orderBy(sql`${messages.createdAt} DESC`);

    return result.map(({ message, sender }) => ({
      ...message,
      sender: sender as User
    }));
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    console.log("Marking message as read:", { messageId, userId });
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));

    if (!message) {
      throw new Error("Message not found");
    }

    const unreadByUsers = message.unreadByUsers.filter(id => id !== userId);

    await db
      .update(messages)
      .set({ unreadByUsers })
      .where(eq(messages.id, messageId));

    console.log("Message marked as read successfully");
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    console.log("Getting unread message count for user:", userId);
    const allMessages = await db.select().from(messages);
    const unreadCount = allMessages.filter(msg => msg.unreadByUsers.includes(userId)).length;
    console.log("Unread message count:", unreadCount);
    return unreadCount;
  }

  // Backup system methods for deleted properties
  async deleteProperty(propertyId: number, deletedBy: number, reason?: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Get the property to backup
      const [property] = await tx
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId));

      if (!property) {
        throw new Error('Property not found');
      }

      // Create backup in deleted_properties table
      await tx.insert(deletedProperties).values({
        originalId: property.id,
        userId: property.userId,
        propertyType: property.propertyType,
        signPhoneNumber: property.signPhoneNumber,
        location: property.location,
        propertyId: property.propertyId,
        images: property.images,
        kmlData: property.kmlData,
        markerColor: property.markerColor,
        createdAt: property.createdAt,
        deletedBy,
        deleteReason: reason
      });

      // Delete from active properties
      await tx.delete(properties).where(eq(properties.id, propertyId));
    });
  }

  async getDeletedProperties(): Promise<(DeletedProperty & { user: User; deletedByUser: User })[]> {
    return await db
      .select()
      .from(deletedProperties)
      .leftJoin(users, eq(deletedProperties.userId, users.id))
      .orderBy(desc(deletedProperties.deletedAt));
  }

  async restoreProperty(deletedPropertyId: number): Promise<Property> {
    return await db.transaction(async (tx) => {
      // Get the deleted property
      const [deletedProperty] = await tx
        .select()
        .from(deletedProperties)
        .where(eq(deletedProperties.id, deletedPropertyId));

      if (!deletedProperty) {
        throw new Error('Deleted property not found');
      }

      // Restore to active properties
      const [restoredProperty] = await tx
        .insert(properties)
        .values({
          userId: deletedProperty.userId,
          propertyType: deletedProperty.propertyType,
          signPhoneNumber: deletedProperty.signPhoneNumber,
          location: deletedProperty.location,
          propertyId: deletedProperty.propertyId,
          images: deletedProperty.images,
          kmlData: deletedProperty.kmlData,
          markerColor: deletedProperty.markerColor,
          createdAt: deletedProperty.createdAt
        })
        .returning();

      // Remove from deleted properties
      await tx.delete(deletedProperties).where(eq(deletedProperties.id, deletedPropertyId));

      return restoredProperty;
    });
  }

  async permanentlyDeleteProperty(deletedPropertyId: number): Promise<void> {
    await db
      .delete(deletedProperties)
      .where(eq(deletedProperties.id, deletedPropertyId));
  }
}