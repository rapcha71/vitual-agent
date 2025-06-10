import session from "express-session";
import { User, Property, InsertUser, InsertProperty, InsertMessage, Message, DeletedProperty } from "@shared/schema";

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
  // New methods for messages
  createMessage(message: InsertMessage & { senderId: number }): Promise<Message>;
  getMessages(): Promise<(Message & { sender: User })[]>;
  markMessageAsRead(messageId: number, userId: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;
  
  // New methods for deleted properties (backup system)
  deleteProperty(propertyId: number, deletedBy: number, reason?: string): Promise<void>;
  getDeletedProperties(): Promise<(DeletedProperty & { user: User; deletedByUser: User })[]>;
  restoreProperty(deletedPropertyId: number): Promise<Property>;
  permanentlyDeleteProperty(deletedPropertyId: number): Promise<void>;
}

// Export storage instance
export { storage } from "./storage/hybrid-storage";