import { users, properties, messages, deletedProperties, type User, type Property, type Message, type InsertUser, type InsertProperty, type InsertMessage, type DeletedProperty, PropertyType, MarkerColors } from "@shared/schema";
import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByRememberToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.rememberToken, token));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        rememberToken: null,
        lastLoginAt: new Date()
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(userId: number, isAdmin: boolean): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserRememberToken(userId: number, token: string | null): Promise<void> {
    await db
      .update(users)
      .set({ rememberToken: token })
      .where(eq(users.id, userId));
  }

  async updateLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createProperty(insertProperty: InsertProperty & { userId: number }): Promise<Property> {
    const markerColor = MarkerColors[insertProperty.propertyType as keyof typeof PropertyType];

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
     return await db.query.properties.findMany({
          with: {
              user: true,
          },
      });
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
        biometricEnabled: true
      })
      .where(eq(users.id, userId));
  }

  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {
    await db
      .update(users)
      .set({ biometricCounter: counter })
      .where(eq(users.id, userId));
  }

  async createMessage(message: InsertMessage & { senderId: number }): Promise<Message> {
    const allUsers = await this.getAllUsers();
    const unreadByUsers = allUsers.map(user => user.id).filter(id => id !== message.senderId);

    const [createdMessage] = await db
      .insert(messages)
      .values({
        ...message,
        unreadByUsers
      })
      .returning();

    return createdMessage;
  }

  async getMessages(): Promise<(Message & { sender: User })[]> {
     return await db.query.messages.findMany({
          with: {
              sender: true,
          },
          orderBy: [desc(messages.createdAt)],
      });
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));

    if (!message) {
      throw new Error("Message not found");
    }

    const unreadByUsers = message.unreadByUsers.filter(id => id !== userId);

    await db
      .update(messages)
      .set({ unreadByUsers })
      .where(eq(messages.id, messageId));
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const allMessages = await db.select().from(messages);
    const unreadCount = allMessages.filter(msg => msg.unreadByUsers.includes(userId)).length;
    return unreadCount;
  }

  async deleteProperty(propertyId: number, deletedBy: number, reason?: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [property] = await tx.select().from(properties).where(eq(properties.id, propertyId));
      if (!property) { throw new Error('Property not found'); }
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
        createdAt: new Date(property.createdAt),
        deletedBy,
        deleteReason: reason
      });
      await tx.delete(properties).where(eq(properties.id, propertyId));
    });
  }

  async getDeletedProperties(): Promise<(DeletedProperty & { user: User; deletedByUser: User })[]> {
     return await db.query.deletedProperties.findMany({
          with: {
              user: true,
              deletedByUser: true,
          }
      });
  }

  async restoreProperty(deletedPropertyId: number): Promise<Property> {
    return await db.transaction(async (tx) => {
      const [deletedProperty] = await tx.select().from(deletedProperties).where(eq(deletedProperties.id, deletedPropertyId));
      if (!deletedProperty) { throw new Error('Deleted property not found'); }
      const [restoredProperty] = await tx.insert(properties).values({
          userId: deletedProperty.userId,
          propertyType: deletedProperty.propertyType,
          signPhoneNumber: deletedProperty.signPhoneNumber,
          location: deletedProperty.location,
          propertyId: deletedProperty.propertyId,
          images: deletedProperty.images,
          kmlData: deletedProperty.kmlData,
          markerColor: deletedProperty.markerColor,
          createdAt: deletedProperty.createdAt
        }).returning();
      await tx.delete(deletedProperties).where(eq(deletedProperties.id, deletedPropertyId));
      return restoredProperty;
    });
  }

  async permanentlyDeleteProperty(deletedPropertyId: number): Promise<void> {
    await db.delete(deletedProperties).where(eq(deletedProperties.id, deletedPropertyId));
  }
}
