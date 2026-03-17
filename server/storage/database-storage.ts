
import { users, properties, messages, earnings, weeklyPayments, type User, type Property, type Message, type InsertUser, type InsertProperty, type InsertMessage, PropertyType, MarkerColors } from "@shared/schema";
import { db } from "../db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { IStorage } from "../storage";
import session from "express-session";
import { logger } from "../lib/logger";
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
    logger.debug("Getting user by ID:", id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    logger.debug("Found user:", user ? "Yes" : "No");
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    logger.debug("Getting user by username:", username);
    const [user] = await db.select().from(users).where(eq(users.username, username));
    logger.debug("Found user:", user ? "Yes" : "No");
    return user;
  }

  async getUserByRememberToken(token: string): Promise<User | undefined> {
    logger.debug("Getting user by remember token");
    const [user] = await db.select().from(users).where(eq(users.rememberToken, token));
    logger.debug("Found user:", user ? "Yes" : "No");
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    logger.debug("Creating new user:", insertUser.username);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        rememberToken: null,
        lastLoginAt: new Date().toISOString()
      })
      .returning();
    logger.debug("User created successfully:", user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    logger.debug("Getting all users");
    const allUsers = await db.select().from(users).where(eq(users.isDeleted, false));
    logger.debug("Found users count:", allUsers.length);
    return allUsers;
  }

  async deleteUser(userId: number): Promise<void> {
    logger.debug("Soft deleting user:", userId);
    await db.update(users)
      .set({ isDeleted: true })
      .where(eq(users.id, userId));
    logger.debug("User soft deleted successfully");
  }

  async hardDeleteUser(userId: number): Promise<void> {
    logger.debug("Hard deleting user:", userId);
    await db.delete(users).where(eq(users.id, userId));
    logger.debug("User hard deleted successfully");
  }

  async updateUserRole(userId: number, isAdmin: boolean): Promise<User> {
    logger.debug("Updating user role:", { userId, isAdmin });
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    logger.debug("User role updated successfully");
    return updatedUser;
  }

  async updateUserRememberToken(userId: number, token: string | null): Promise<void> {
    logger.debug("Updating remember token for user:", userId);
    await db
      .update(users)
      .set({ rememberToken: token })
      .where(eq(users.id, userId));
    logger.debug("Remember token updated successfully");
  }

  async updateLastLogin(userId: number): Promise<void> {
    logger.debug("Updating last login for user:", userId);
    await db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, userId));
    logger.debug("Last login updated successfully");
  }

  async createProperty(insertProperty: InsertProperty & { userId: number; propertyId: string }): Promise<Property> {
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

  /** Optimizado para lista: excluye images y kmlData (evita transferir MB desde Neon) */
  async getPropertiesListByUserId(userId: number): Promise<Array<Omit<Property, "images" | "kmlData"> & { hasImages: boolean }>> {
    const rows = await db
      .select({
        id: properties.id,
        userId: properties.userId,
        propertyType: properties.propertyType,
        signPhoneNumber: properties.signPhoneNumber,
        location: properties.location,
        propertyId: properties.propertyId,
        markerColor: properties.markerColor,
        createdAt: properties.createdAt,
        viewedByAdmin: properties.viewedByAdmin,
        province: properties.province,
        isPaid: properties.isPaid,
        paidAt: properties.paidAt,
        hasImages: sql<boolean>`(
          jsonb_typeof(${properties.images}) = 'array' AND jsonb_array_length(${properties.images}) > 0
        ) OR (
          jsonb_typeof(${properties.images}) = 'object' AND ${properties.images} != '{}'::jsonb
        )`,
      })
      .from(properties)
      .where(eq(properties.userId, userId));
    return rows.map((r) => ({ ...r, hasImages: !!r.hasImages }));
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
    logger.debug("Updating biometric credentials for user:", userId);
    await db
      .update(users)
      .set({
        biometricCredentialId: credentials.credentialID.toString('base64'),
        biometricPublicKey: credentials.publicKey.toString('base64'),
        biometricCounter: credentials.counter,
        biometricEnabled: true
      })
      .where(eq(users.id, userId));
    logger.debug("Biometric credentials updated successfully");
  }

  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {
    logger.debug("Updating biometric counter for user:", userId);
    await db
      .update(users)
      .set({ biometricCounter: counter })
      .where(eq(users.id, userId));
    logger.debug("Biometric counter updated successfully");
  }

  async createMessage(message: InsertMessage & { senderId: number }): Promise<Message> {
    logger.debug("Creating new message:", message.content);
    
    let unreadByUsers: number[];
    
    if (message.recipientId) {
      // Message to specific user - only that user should see it as unread
      unreadByUsers = [message.recipientId];
    } else {
      // Broadcast message - all users except sender should see it as unread
      const allUsers = await this.getAllUsers();
      unreadByUsers = allUsers.map(user => user.id).filter(id => id !== message.senderId);
    }

    const [createdMessage] = await db
      .insert(messages)
      .values({
        ...message,
        unreadByUsers
      })
      .returning();

    logger.debug("Message created successfully");
    return createdMessage;
  }

  async getMessages(): Promise<(Message & { sender: User })[]> {
    logger.debug("Getting all messages");
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
    logger.debug("Marking message as read:", { messageId, userId });
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));

    if (!message) {
      throw new Error("Message not found");
    }

    const unreadByUsers = message.unreadByUsers.filter(id => id !== userId);

    await db
      .update(messages)
      .set({ unreadByUsers })
      .where(eq(messages.id, messageId));

    logger.debug("Message marked as read successfully");
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    logger.debug("Getting unread message count for user:", userId);
    const allMessages = await db.select().from(messages);
    
    // Debug: Log first message to check array type
    if (allMessages.length > 0) {
      const firstMsg = allMessages[0];
      logger.debug("First message unreadByUsers:", firstMsg.unreadByUsers, "type:", typeof firstMsg.unreadByUsers, "Array.isArray:", Array.isArray(firstMsg.unreadByUsers));
    }
    
    const unreadCount = allMessages.filter(msg => {
      // Ensure unreadByUsers is an array before using includes
      const unreadList = Array.isArray(msg.unreadByUsers) ? msg.unreadByUsers : [];
      const isUnread = unreadList.includes(userId);
      if (msg.recipientId === userId || (msg.recipientId === null && msg.senderId !== userId)) {
        logger.debug(`Message ${msg.id} - recipientId: ${msg.recipientId}, userId: ${userId}, unreadByUsers: [${unreadList.join(',')}], isUnread: ${isUnread}`);
      }
      return isUnread;
    }).length;
    logger.debug("Unread message count:", unreadCount);
    return unreadCount;
  }

  async deleteOldMessages(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    logger.debug(`Deleting messages older than ${daysOld} days (before ${cutoffDate.toISOString()})`);
    
    const oldMessages = await db.select({ id: messages.id })
      .from(messages)
      .where(sql`${messages.createdAt} < ${cutoffDate}`);
    
    if (oldMessages.length > 0) {
      await db.delete(messages)
        .where(sql`${messages.createdAt} < ${cutoffDate}`);
      logger.debug(`Deleted ${oldMessages.length} old messages`);
    } else {
      logger.debug("No old messages to delete");
    }
    
    return oldMessages.length;
  }

  // Password reset methods
  private passwordResetCodes = new Map<number, { code: string; expireTime: number }>();

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
    logger.debug("Updating password for user:", userId);
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    logger.debug("Password updated successfully");
  }

  async updateUserProfile(userId: number, data: { fullName?: string | null; mobile?: string | null; nickname?: string | null }): Promise<User> {
    logger.debug("Updating user profile:", { userId, fields: Object.keys(data) });
    const updateData: Record<string, string | null | undefined> = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (Object.keys(updateData).length === 0) {
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      return u!;
    }
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    logger.debug("User profile updated successfully");
    return updatedUser;
  }

  async clearPasswordResetCode(userId: number): Promise<void> {
    this.passwordResetCodes.delete(userId);
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
    const paymentRate = 250; // 250 colones per property
    const currentDate = new Date();

    // Semana Lun-Dom en zona Costa Rica (UTC-6). Server puede estar en UTC (Railway).
    const crOffsetMs = -6 * 60 * 60 * 1000;
    const crEquiv = new Date(currentDate.getTime() + crOffsetMs);
    const dayOfWeekCR = crEquiv.getUTCDay();
    const daysToMonday = dayOfWeekCR === 0 ? 6 : dayOfWeekCR - 1;

    const weekStart = new Date(Date.UTC(
      crEquiv.getUTCFullYear(),
      crEquiv.getUTCMonth(),
      crEquiv.getUTCDate() - daysToMonday,
      6, 0, 0, 0
    ));

    const weekEnd = new Date(weekStart.getTime());
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    weekEnd.setUTCMilliseconds(weekEnd.getUTCMilliseconds() - 1);

    // Get properties registered this week with users
    const weeklyProperties = await db.select({
      property: properties,
      user: users
    }).from(properties)
      .leftJoin(users, eq(properties.userId, users.id))
      .where(and(
        sql`${properties.createdAt} >= ${weekStart.toISOString()}`,
        sql`${properties.createdAt} <= ${weekEnd.toISOString()}`
      ));

    // Group by user and count properties
    const userPayments = new Map<number, { user: User; count: number }>();

    weeklyProperties.forEach(({ property, user }) => {
      if (user && !user.isAdmin && !user.isSuperAdmin) {
        if (userPayments.has(property.userId)) {
          userPayments.get(property.userId)!.count++;
        } else {
          userPayments.set(property.userId, { user, count: 1 });
        }
      }
    });

    // Convert to result format
    return Array.from(userPayments.entries())
      .filter(([, data]) => data.count > 0)
      .map(([userId, data]) => ({
        userId,
        user: data.user,
        propertiesCount: data.count,
        totalPayment: data.count * paymentRate,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString()
      }));
  }

  async getUserPaymentHistory(userId: number): Promise<Array<{ 
    weekStart: string; 
    weekEnd: string; 
    propertiesCount: number; 
    totalPayment: number; 
  }>> {
    const paymentRate = 250;
    
    // Get all properties for this user
    const userProperties = await db.select().from(properties)
      .where(eq(properties.userId, userId));

    // Group properties by week
    const weeklyGroups = new Map<string, number>();
    
    userProperties.forEach(property => {
      const propertyDate = new Date(property.createdAt);
      const dayOfWeek = propertyDate.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(propertyDate);
      weekStart.setUTCDate(propertyDate.getUTCDate() - daysToMonday);
      weekStart.setUTCHours(0, 0, 0, 0); // Lunes 00:00 UTC para agrupar (historial)
      
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

  async getUnviewedPropertiesCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(eq(properties.viewedByAdmin, false));
    return Number(result[0]?.count || 0);
  }

  async markPropertiesAsViewed(propertyIds: number[]): Promise<void> {
    if (propertyIds.length === 0) return;
    await db
      .update(properties)
      .set({ viewedByAdmin: true })
      .where(inArray(properties.id, propertyIds));
  }

  async getSuperAdminEmails(): Promise<string[]> {
    const superAdmins = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.isSuperAdmin, true), eq(users.isDeleted, false)));
    return superAdmins
      .filter(u => u.email)
      .map(u => u.email as string);
  }

  async getPropertyByPropertyId(propertyId: string): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.propertyId, propertyId))
      .limit(1);
    return property;
  }

  async getUnpaidProperties(): Promise<(Property & { user: User })[]> {
    const result = await db.select({
      property: properties,
      user: users
    }).from(properties)
      .leftJoin(users, eq(properties.userId, users.id))
      .where(eq(properties.isPaid, false));

    return result.map(({ property, user }) => ({
      ...property,
      user: user as User
    }));
  }

  async markPropertiesAsPaid(propertyIds: number[], weeklyPaymentId: number): Promise<void> {
    if (propertyIds.length === 0) return;
    
    await db.transaction(async (tx) => {
      // Mark properties as paid
      await tx.update(properties)
        .set({ 
          isPaid: true, 
          paidAt: new Date()
        })
        .where(inArray(properties.id, propertyIds));

      // Create entries in earnings for traceability
      for (const propId of propertyIds) {
        const [prop] = await tx.select().from(properties).where(eq(properties.id, propId));
        if (prop) {
          await tx.insert(earnings).values({
            userId: prop.userId,
            propertyId: prop.id,
            paymentType: "property_upload",
            amount: "250.00",
            status: "completed",
            processedAt: new Date().toISOString(),
            weekOf: new Date().toISOString().split('T')[0], // Simplified
          });
        }
      }
    });
  }

  async createWeeklyPayment(data: {
    userId: number;
    weekOf: string;
    totalAmount: string;
    propertyCount: number;
    status: string;
  }): Promise<number> {
    const [inserted] = await db.insert(weeklyPayments).values({
      ...data,
      createdAt: new Date().toISOString()
    }).returning();
    return inserted.id;
  }

  async getPropertiesByPhone(phone: string): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.signPhoneNumber, phone));
  }
}

// Export a singleton instance
export const storage = new DatabaseStorage();
